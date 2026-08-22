import { z } from "zod";

export const ApiUuidSchema = z.string().uuid();
export const ApiDateTimeSchema = z.string().datetime({ offset: true });

export const NoteTypeSchema = z.enum(["personal", "meeting", "upload"]);

export const NoteSchema = z.object({
  id: ApiUuidSchema,
  user_id: z.string(),
  client_note_id: z.string().nullable(),
  title: z.string().nullable(),
  content: z.string(),
  enhanced_content: z.string().nullable(),
  note_type: NoteTypeSchema,
  folder_id: ApiUuidSchema.nullable(),
  participants: z.string().nullable().optional(),
  calendar_event_id: z.string().nullable().optional(),
  created_at: ApiDateTimeSchema,
  updated_at: ApiDateTimeSchema,
});

export const NoteSearchResultSchema = NoteSchema.pick({
  id: true,
  title: true,
  content: true,
  enhanced_content: true,
  note_type: true,
  created_at: true,
  updated_at: true,
}).extend({ score: z.number() });

export const FolderSchema = z.object({
  id: ApiUuidSchema,
  user_id: z.string(),
  name: z.string(),
  is_default: z.boolean(),
  sort_order: z.number().int(),
  created_at: ApiDateTimeSchema,
  updated_at: ApiDateTimeSchema,
});

export const TranscriptWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  score: z.number().optional(),
});

export const TranscriptSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  speaker: z.string().optional(),
  words: z.array(TranscriptWordSchema).optional(),
});

export const TranscriptionSchema = z.object({
  id: ApiUuidSchema,
  user_id: z.string(),
  text: z.string(),
  word_count: z.number().int().nonnegative(),
  source: z.enum(["cloud", "local"]),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  language: z.string().nullable(),
  audio_duration_ms: z.number().int().nullable(),
  processing_ms: z.number().int().nullable().optional(),
  segments: z.array(TranscriptSegmentSchema).nullable(),
  created_at: ApiDateTimeSchema,
});

export const TranscriptionFormatSchema = z.enum(["json", "text", "srt", "vtt"]);

export const ListTranscriptionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  note_id: ApiUuidSchema.optional(),
  language: z.string().trim().min(1).optional(),
  include: z.literal("segments").optional(),
});

export const CreateNoteRequestSchema = z
  .object({
    content: z.string(),
    title: z.string().nullable().optional(),
    enhanced_content: z.string().nullable().optional(),
    note_type: NoteTypeSchema.default("personal"),
    folder_id: ApiUuidSchema.nullable().optional(),
    space_id: ApiUuidSchema.optional(),
  })
  .strict();

export const ListNotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  folder_id: ApiUuidSchema.optional(),
  space_id: ApiUuidSchema.optional(),
});

export const UpdateNoteRequestSchema = z
  .object({
    title: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    enhanced_content: z.string().nullable().optional(),
    folder_id: ApiUuidSchema.nullable().optional(),
  })
  .strict();

export const SearchNotesRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(500),
    limit: z.number().int().min(1).max(50).default(20),
    space_id: ApiUuidSchema.optional(),
  })
  .strict();

export const CreateFolderRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    sort_order: z.number().int().optional(),
    space_id: ApiUuidSchema.optional(),
  })
  .strict();

export const ApiKeyScopeSchema = z.enum([
  "notes:read",
  "notes:write",
  "transcriptions:read",
  "transcriptions:delete",
  "usage:read",
]);

export const ApiKeyVerifierSnapshotSchema = z.object({
  data: z.object({
    verifiers: z.array(
      z.object({
        id: ApiUuidSchema,
        digest: z.string().regex(/^[a-f0-9]{64}$/),
        scopes: z.array(ApiKeyScopeSchema),
        expires_at: ApiDateTimeSchema.nullable(),
      })
    ),
    valid_until: ApiDateTimeSchema,
  }),
});

export const WorkOSProviderSchema = z.enum([
  "authkit",
  "GoogleOAuth",
  "MicrosoftOAuth",
  "AppleOAuth",
]);

export const WorkOSLoginURLResponseSchema = z.object({ url: z.string().url() });

export const WorkOSTokenBundleSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_at: z.number().int().positive(),
  token_type: z.string().min(1),
  user_id: z.string().optional(),
  email: z.string().email().optional(),
});

export const OppulenceAuthStatusSchema = z.object({
  signedIn: z.boolean(),
  expiresAt: z.number().int().positive().nullable(),
});

export type ApiNote = z.infer<typeof NoteSchema>;
export type ApiFolder = z.infer<typeof FolderSchema>;
export type ApiTranscription = z.infer<typeof TranscriptionSchema>;
export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>;
export type ApiKeyVerifierSnapshot = z.infer<typeof ApiKeyVerifierSnapshotSchema>;
export type WorkOSProvider = z.infer<typeof WorkOSProviderSchema>;
export type WorkOSTokenBundle = z.infer<typeof WorkOSTokenBundleSchema>;
export type OppulenceAuthStatus = z.infer<typeof OppulenceAuthStatusSchema>;
