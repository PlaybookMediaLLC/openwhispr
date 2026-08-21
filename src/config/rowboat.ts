import { z } from "zod";

export const ROWBOAT_EXTENSION_ID = "rowboat-export" as const;
export const ROWBOAT_RENDERER_METHODS = ["getStatus", "configure", "disconnect", "retry"] as const;

export const RowboatRendererMethodSchema = z.enum(ROWBOAT_RENDERER_METHODS);

export const RowboatEndpointSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))
    );
  }, "Rowboat endpoint must use HTTPS (HTTP is allowed only for localhost)")
  .transform((value) => value.replace(/\/$/, ""));

export const RowboatConnectionSchema = z.object({
  endpoint: RowboatEndpointSchema,
  token: z.string().trim().min(1, "Rowboat token is required"),
});

export const StoredRowboatConfigSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    endpoint: RowboatEndpointSchema,
    encryptedToken: z.string().min(1),
  }),
]);

export const RowboatStatusSchema = z.object({
  enabled: z.boolean(),
  endpoint: z.string(),
  pending: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
});

export type RowboatRendererMethod = z.infer<typeof RowboatRendererMethodSchema>;
export type RowboatConnection = z.infer<typeof RowboatConnectionSchema>;
export type StoredRowboatConfig = z.infer<typeof StoredRowboatConfigSchema>;
export type RowboatStatus = z.infer<typeof RowboatStatusSchema>;
