import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DEFAULT_MANIFEST_PATH = path.join(PROJECT_ROOT, "distributions", "openwhispr.json");
export const ALLOWED_EXTENSIONS = ["rowboat-export"] as const;

export const Identifier = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]{1,63}$/);
export const ProductName = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/);
export const AppId = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9.-]{2,127}$/)
  .refine((value) => value.includes(".") && !value.includes(".."), "Expected reverse-DNS ID");
export const ProtocolScheme = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9+.-]{1,31}$/);
const Slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{1,63}$/);
const HttpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Expected HTTP URL")
  .transform((value) => value.replace(/\/$/, ""));

export const DistributionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: Identifier,
    productName: ProductName,
    companyName: z.string().trim().min(1),
    appId: AppId,
    protocolScheme: ProtocolScheme,
    executableName: Slug,
    runtimeNamespace: Slug,
    supportEmail: z.string().trim().email(),
    cloudDisplayName: z.string().trim().min(1),
    services: z.object({
      apiUrl: HttpUrl,
      authUrl: HttpUrl,
      oauthCallbackUrl: HttpUrl,
    }),
    updates: z.object({
      provider: z.literal("github"),
      owner: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_.-]+$/),
      repo: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_.-]+$/),
      private: z.boolean(),
    }),
    linux: z.object({
      desktopName: z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9-]*\.desktop$/),
      appName: Slug,
      dbusServiceName: z
        .string()
        .trim()
        .regex(/^[A-Za-z_][A-Za-z0-9_.-]+$/),
      dbusObjectPath: z
        .string()
        .trim()
        .regex(/^\/(?:[A-Za-z_][A-Za-z0-9_]*\/?)+$/),
      dbusInterface: z
        .string()
        .trim()
        .regex(/^[A-Za-z_][A-Za-z0-9_.-]+$/),
    }),
    assets: z.object({
      macIcon: z.string().trim().min(1),
      windowsIcon: z.string().trim().min(1),
      linuxIcon: z.string().trim().min(1),
    }),
    signing: z.object({
      windowsAzure: z
        .object({
          endpoint: z.string().trim().url(),
          certificateProfileName: z.string().trim().min(1),
          codeSigningAccountName: z.string().trim().min(1),
          publisherName: z.string().trim().min(1),
        })
        .nullable(),
    }),
    capabilities: z.object({
      managedCloud: z.boolean(),
      rowboatExport: z.boolean(),
    }),
    extensions: z.array(z.enum(ALLOWED_EXTENSIONS)),
  })
  .superRefine((manifest, context) => {
    if (manifest.capabilities.rowboatExport !== manifest.extensions.includes("rowboat-export")) {
      context.addIssue({
        code: "custom",
        path: ["capabilities", "rowboatExport"],
        message: "rowboatExport capability and extension must be enabled together",
      });
    }
  });

export type AppDistribution = z.infer<typeof DistributionSchema>;

export function validateDistribution(value: unknown): Readonly<AppDistribution> {
  const result = DistributionSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid distribution manifest: ${z.prettifyError(result.error)}`);
  }
  return Object.freeze(result.data);
}

export function resolveManifestPath(manifestPath?: string, cwd = PROJECT_ROOT): string {
  if (!manifestPath) return DEFAULT_MANIFEST_PATH;
  return path.isAbsolute(manifestPath) ? manifestPath : path.resolve(cwd, manifestPath);
}

export function loadDistribution(
  manifestPath?: string,
  cwd = PROJECT_ROOT
): Readonly<AppDistribution> {
  const resolvedPath = resolveManifestPath(manifestPath, cwd);
  return validateDistribution(JSON.parse(fs.readFileSync(resolvedPath, "utf8")));
}

export function loadSelectedDistribution(
  env: Record<string, string | undefined> = process.env,
  cwd = PROJECT_ROOT
): Readonly<AppDistribution> {
  return loadDistribution(env.DISTRIBUTION_MANIFEST || env.RELEASE_DISTRIBUTION_MANIFEST, cwd);
}
