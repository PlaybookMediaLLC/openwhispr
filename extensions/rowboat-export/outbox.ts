import crypto from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import { z } from "zod";
import type { AppDistribution } from "../../src/config/distributionSchema";

const require = createRequire(import.meta.url);
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 60 * 60 * 1_000;

export const CaptureArtifactSchema = z.object({
  schemaVersion: z.literal("1.0"),
  eventId: z.string().regex(/^[a-f0-9]{64}$/),
  artifactId: z.string().min(1),
  kind: z.enum(["note", "transcription", "speaker_mapping"]),
  operation: z.enum(["upsert", "delete"]),
  occurredAt: z.union([z.string().min(1), z.number()]),
  source: z.object({
    application: z.string().min(1),
    distributionId: z.string().min(1),
    localId: z.string().min(1),
    event: z.string().min(1),
  }),
  consent: z.object({
    basis: z.literal("user_opt_in"),
    destination: z.literal("rowboat"),
  }),
  provenance: z.object({
    capturedLocally: z.literal(true),
    exportedBy: z.literal("rowboat-export"),
  }),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  content: z.unknown().nullable(),
});

export type CaptureArtifact = z.infer<typeof CaptureArtifactSchema>;

interface RunResult {
  changes: number;
}

interface SqliteStatement {
  run(...parameters: unknown[]): RunResult;
  all<T extends Record<string, unknown>>(...parameters: unknown[]): T[];
  get<T extends Record<string, unknown>>(...parameters: unknown[]): T;
}

interface SqliteDatabase {
  pragma(value: string): unknown;
  exec(value: string): unknown;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

type SqliteConstructor = new (filename: string) => SqliteDatabase;

interface StoredOutboxRow extends Record<string, unknown> {
  event_id: string;
  artifact_json: string;
  attempts: number;
}

export interface DueOutboxRow extends StoredOutboxRow {
  artifact: CaptureArtifact;
}

export function stableHash(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value) ?? "undefined")
    .digest("hex");
}

export function toCaptureArtifact(
  distribution: Readonly<AppDistribution>,
  channel: string,
  data: Record<string, unknown> = {}
): CaptureArtifact {
  const tombstone =
    channel.endsWith("-deleted") ||
    channel.endsWith("-removed") ||
    channel === "transcriptions-cleared";
  const kind = channel.startsWith("note-")
    ? "note"
    : channel.startsWith("speaker-mapping-")
      ? "speaker_mapping"
      : "transcription";
  const sourceId = String(
    kind === "speaker_mapping"
      ? `${data.noteId ?? "unknown"}:${data.speakerId ?? "unknown"}`
      : (data.id ?? data.client_id ?? data.clientId ?? "unknown")
  );
  const occurredAt =
    typeof data.updated_at === "string" || typeof data.updated_at === "number"
      ? data.updated_at
      : typeof data.created_at === "string" || typeof data.created_at === "number"
        ? data.created_at
        : new Date().toISOString();
  const content = tombstone ? null : data;
  const contentHash = stableHash(content);
  const artifactId = `${distribution.id}:${kind}:${sourceId}`;
  const eventId = stableHash({ artifactId, channel, occurredAt, contentHash });

  return CaptureArtifactSchema.parse({
    schemaVersion: "1.0",
    eventId,
    artifactId,
    kind,
    operation: tombstone ? "delete" : "upsert",
    occurredAt,
    source: {
      application: distribution.productName,
      distributionId: distribution.id,
      localId: sourceId,
      event: channel,
    },
    consent: { basis: "user_opt_in", destination: "rowboat" },
    provenance: { capturedLocally: true, exportedBy: "rowboat-export" },
    contentHash,
    content,
  });
}

export class CaptureOutbox {
  private readonly db: SqliteDatabase;

  constructor(userDataPath: string) {
    const Database = require("better-sqlite3") as SqliteConstructor;
    this.db = new Database(path.join(userDataPath, "oppulence-rowboat-outbox.sqlite"));
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS capture_outbox (
        event_id TEXT PRIMARY KEY,
        artifact_json TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL
      );
    `);
  }

  enqueue(artifact: CaptureArtifact): boolean {
    return (
      this.db
        .prepare(
          `INSERT OR IGNORE INTO capture_outbox
           (event_id, artifact_json, attempts, next_attempt_at, created_at)
           VALUES (?, ?, 0, 0, ?)`
        )
        .run(artifact.eventId, JSON.stringify(artifact), Date.now()).changes > 0
    );
  }

  due(limit = 25, now = Date.now()): DueOutboxRow[] {
    return this.db
      .prepare(
        `SELECT event_id, artifact_json, attempts
         FROM capture_outbox WHERE next_attempt_at <= ? ORDER BY created_at LIMIT ?`
      )
      .all<StoredOutboxRow>(now, limit)
      .map((row) => ({
        ...row,
        artifact: CaptureArtifactSchema.parse(JSON.parse(row.artifact_json)),
      }));
  }

  acknowledge(eventId: string): void {
    this.db.prepare("DELETE FROM capture_outbox WHERE event_id = ?").run(eventId);
  }

  fail(eventId: string, attempts: number, error: unknown, now = Date.now()): void {
    const nextAttempts = attempts + 1;
    const delay = Math.min(BASE_RETRY_MS * 2 ** Math.min(nextAttempts - 1, 10), MAX_RETRY_MS);
    this.db
      .prepare(
        `UPDATE capture_outbox
         SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE event_id = ?`
      )
      .run(nextAttempts, now + delay, String(error).slice(0, 1000), eventId);
  }

  retryAll(): void {
    this.db.prepare("UPDATE capture_outbox SET next_attempt_at = 0").run();
  }

  status(): { pending: number; lastError: string | null } {
    const row = this.db
      .prepare("SELECT COUNT(*) AS pending, MAX(last_error) AS lastError FROM capture_outbox")
      .get<{ pending: number; lastError: string | null }>();
    return { pending: row.pending, lastError: row.lastError || null };
  }

  close(): void {
    this.db.close();
  }
}
