import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { App, IpcMain, IpcMainInvokeEvent } from "electron";
import type { AppDistribution } from "../config/distributionSchema";

const require = createRequire(import.meta.url);
const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const EXTENSION_MODULES = Object.freeze({
  "rowboat-export": path.join(SOURCE_ROOT, "extensions", "rowboat-export", "index.ts"),
});

interface ExtensionLogger {
  error?(message: string, details?: Record<string, unknown>): void;
}

interface DistributionExtension {
  id: string;
  rendererMethods: readonly string[];
  invoke(method: string, payload: unknown): Promise<unknown>;
  stop?(): Promise<void> | void;
}

interface ExtensionModule {
  create(context: {
    app: App;
    distribution: Readonly<AppDistribution>;
    logger: ExtensionLogger;
  }): Promise<DistributionExtension>;
}

interface HostOptions {
  app: App;
  ipcMain: IpcMain;
  distribution: Readonly<AppDistribution>;
  logger: ExtensionLogger;
}

export class DistributionExtensionHost {
  readonly instances = new Map<string, DistributionExtension>();
  private readonly app: App;
  private readonly ipcMain: IpcMain;
  private readonly distribution: Readonly<AppDistribution>;
  private readonly logger: ExtensionLogger;
  private readonly invokeHandler: (
    event: IpcMainInvokeEvent,
    extensionId: string,
    method: string,
    payload: unknown
  ) => Promise<unknown>;

  constructor({ app, ipcMain, distribution, logger }: HostOptions) {
    this.app = app;
    this.ipcMain = ipcMain;
    this.distribution = distribution;
    this.logger = logger;
    this.invokeHandler = this.invoke.bind(this);
  }

  async start(): Promise<void> {
    for (const extensionId of this.distribution.extensions) {
      const modulePath = EXTENSION_MODULES[extensionId];
      if (!modulePath) throw new Error(`Distribution extension is not shipped: ${extensionId}`);
      try {
        const extensionModule = require(modulePath) as ExtensionModule;
        const instance = await extensionModule.create({
          app: this.app,
          distribution: this.distribution,
          logger: this.logger,
        });
        if (instance.id !== extensionId || !Array.isArray(instance.rendererMethods)) {
          throw new Error(`Invalid distribution extension contract: ${extensionId}`);
        }
        this.instances.set(extensionId, instance);
      } catch (error) {
        this.logger.error?.("Distribution extension failed to start", {
          extensionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.ipcMain.handle("distribution-extension:invoke", this.invokeHandler);
  }

  async invoke(
    _event: IpcMainInvokeEvent | null,
    extensionId: string,
    method: string,
    payload?: unknown
  ): Promise<unknown> {
    const instance = this.instances.get(extensionId);
    if (!instance || !instance.rendererMethods.includes(method)) {
      throw new Error("Distribution extension method is not allowed");
    }
    return instance.invoke(method, payload);
  }

  async stop(): Promise<void> {
    this.ipcMain.removeHandler("distribution-extension:invoke");
    await Promise.allSettled([...this.instances.values()].map((instance) => instance.stop?.()));
    this.instances.clear();
  }
}
