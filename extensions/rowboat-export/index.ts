import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import electron, { type App } from "electron";
import type { AppDistribution } from "../../src/config/distributionSchema";
import {
  ROWBOAT_RENDERER_METHODS,
  RowboatConnectionSchema,
  RowboatEndpointSchema,
  StoredRowboatConfigSchema,
  type RowboatConnection,
  type RowboatStatus,
} from "../../src/config/rowboat.ts";
import { subscribeToBroadcast } from "../../src/helpers/windowBroadcast.js";
import { CaptureOutbox, toCaptureArtifact } from "./outbox.ts";

const { safeStorage } = electron;
const require = createRequire(import.meta.url);

export const CAPTURE_CHANNELS = new Set([
  "note-added",
  "note-updated",
  "note-deleted",
  "transcription-added",
  "transcription-updated",
  "transcription-deleted",
  "transcriptions-cleared",
  "speaker-mapping-updated",
  "speaker-mapping-removed",
]);
type RowboatConfig =
  | { enabled: false }
  | ({ enabled: true; authMode: "stored-token" } & RowboatConnection)
  | { enabled: true; authMode: "oppulence-account"; endpoint: string };

interface TokenStore {
  get(): string | null;
}

interface ExtensionLogger {
  error?(message: string, details?: Record<string, unknown>): void;
}

interface ExtensionContext {
  app: App;
  distribution: Readonly<AppDistribution>;
  logger: ExtensionLogger;
}

export function validateEndpoint(value: unknown): string {
  return RowboatEndpointSchema.parse(value);
}

export class RowboatExportExtension {
  readonly id = "rowboat-export";
  readonly rendererMethods = ROWBOAT_RENDERER_METHODS;
  private readonly distribution: Readonly<AppDistribution>;
  private readonly logger: ExtensionLogger;
  private readonly configPath: string;
  private readonly outbox: CaptureOutbox;
  private readonly tokenStore: TokenStore;
  private readonly unsubscribe: () => void;
  private readonly timer: NodeJS.Timeout;
  private config: RowboatConfig;
  private draining = false;

  constructor({ app, distribution, logger }: ExtensionContext) {
    this.distribution = distribution;
    this.logger = logger;
    this.configPath = path.join(app.getPath("userData"), "rowboat-export.json");
    this.outbox = new CaptureOutbox(app.getPath("userData"));
    this.tokenStore = require("../../src/helpers/tokenStore.js") as TokenStore;
    this.config = this.readConfig();
    this.unsubscribe = subscribeToBroadcast(
      ({ channel, data }: { channel: string; data: Record<string, unknown> }) =>
        this.capture(channel, data)
    );
    this.timer = setInterval(() => void this.drain(), 10_000);
    this.timer.unref();
    void this.drain();
  }

  private readConfig(): RowboatConfig {
    try {
      const stored = StoredRowboatConfigSchema.parse(
        JSON.parse(fs.readFileSync(this.configPath, "utf8"))
      );
      if (!stored.enabled) return { enabled: false };
      if ("authMode" in stored && stored.authMode === "oppulence-account") {
        return { enabled: true, endpoint: stored.endpoint, authMode: "oppulence-account" };
      }
      if (!("encryptedToken" in stored) || !safeStorage.isEncryptionAvailable()) {
        return { enabled: false };
      }
      return {
        enabled: true,
        authMode: "stored-token",
        ...RowboatConnectionSchema.parse({
          endpoint: stored.endpoint,
          token: safeStorage.decryptString(Buffer.from(stored.encryptedToken, "base64")),
        }),
      };
    } catch {
      return { enabled: false };
    }
  }

  private saveConfig(): void {
    const stored = !this.config.enabled
      ? { enabled: false as const }
      : this.config.authMode === "oppulence-account"
        ? {
            enabled: true as const,
            endpoint: this.config.endpoint,
            authMode: "oppulence-account" as const,
          }
        : {
            enabled: true as const,
            endpoint: this.config.endpoint,
            encryptedToken: safeStorage.encryptString(this.config.token).toString("base64"),
          };
    fs.writeFileSync(this.configPath, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
  }

  private capture(channel: string, data: Record<string, unknown>): void {
    if (!this.config.enabled || !CAPTURE_CHANNELS.has(channel)) return;
    if (channel === "transcriptions-cleared") {
      for (const id of Array.isArray(data.ids) ? data.ids : []) {
        this.outbox.enqueue(toCaptureArtifact(this.distribution, "transcription-deleted", { id }));
      }
      void this.drain();
      return;
    }
    this.outbox.enqueue(toCaptureArtifact(this.distribution, channel, data));
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (!this.config.enabled || this.draining) return;
    this.draining = true;
    try {
      for (const row of this.outbox.due()) {
        try {
          const token =
            this.config.authMode === "oppulence-account"
              ? this.tokenStore.get()
              : this.config.token;
          if (!token) throw new Error("Sign in to Oppulence Voice to send captures to Rowboat");
          const response = await fetch(`${this.config.endpoint}/capture-artifacts`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
              "idempotency-key": row.event_id,
            },
            body: JSON.stringify(row.artifact),
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) throw new Error(`Rowboat returned HTTP ${response.status}`);
          this.outbox.acknowledge(row.event_id);
        } catch (error) {
          this.outbox.fail(
            row.event_id,
            row.attempts,
            error instanceof Error ? error.message : error
          );
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private status(): RowboatStatus {
    return {
      enabled: this.config.enabled,
      endpoint: this.config.enabled ? this.config.endpoint : "",
      ...this.outbox.status(),
    };
  }

  async invoke(method: string, payload: unknown): Promise<RowboatStatus> {
    if (method === "getStatus") return this.status();
    if (method === "configure") {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("Secure credential storage is unavailable on this system");
      }
      this.config = {
        enabled: true,
        authMode: "stored-token",
        ...RowboatConnectionSchema.parse(payload),
      };
      this.saveConfig();
      void this.drain();
      return this.status();
    }
    if (method === "configureAccount") {
      if (!this.tokenStore.get()) throw new Error("Sign in to Oppulence Voice first");
      this.config = {
        enabled: true,
        authMode: "oppulence-account",
        endpoint: validateEndpoint(this.distribution.services.apiUrl),
      };
      this.saveConfig();
      void this.drain();
      return this.status();
    }
    if (method === "disconnect") {
      this.config = { enabled: false };
      this.saveConfig();
      return this.status();
    }
    if (method === "retry") {
      this.outbox.retryAll();
      void this.drain();
      return this.status();
    }
    throw new Error("Unsupported Rowboat extension method");
  }

  async stop(): Promise<void> {
    clearInterval(this.timer);
    this.unsubscribe();
    this.outbox.close();
  }
}

export async function create(context: ExtensionContext): Promise<RowboatExportExtension> {
  return new RowboatExportExtension(context);
}
