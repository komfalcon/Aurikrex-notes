import { z } from "zod";

export const NoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  pinned: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  deletedAt: z.number().int().nonnegative().nullable(),
  version: z.number().int().nonnegative(),
  embedding: z.array(z.number().finite()).nullable().default(null),
});

export const SettingsSchema = z.object({
  id: z.literal("default"),
  lastBackupAt: z.number().int().nonnegative(),
  cloudflareAccountId: z.string().default(""),
  cloudflareApiToken: z.string().default(""),
});

export const ExportSchema = z.object({
  app: z.literal("aurikrex-notes"),
  schemaVersion: z.literal(1),
  exportedAt: z.number().int().nonnegative(),
  notes: z.array(NoteSchema),
});

export type Note = z.infer<typeof NoteSchema>;
export type SettingsRecord = z.infer<typeof SettingsSchema>;
export type ExportPayload = z.infer<typeof ExportSchema>;
