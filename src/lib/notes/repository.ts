import { db } from "@/lib/db";
import {
  ExportSchema,
  NeuronLedgerSchema,
  NoteSchema,
  type ExportPayload,
  type NeuronLedger,
  type Note
} from "@/lib/db/schemas";

const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_WINDOW_MS = 30 * DAY_MS;
export const SEMANTIC_MATCH_THRESHOLD = 0.6;

const normalizeTags = (tags: string[]): string[] => tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

const defaultSettings = (): SettingsRecord => ({
  id: "default",
  lastBackupAt: 0,
  cloudflareAccountId: "",
  cloudflareApiToken: "",
});

const lexicalSearch = (notes: Note[], normalizedQuery: string): Note[] => notes.filter((note) => {
  const haystack = [note.title, note.body, note.tags.join(" ")].join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
});

export const createNote = async (
  input?: Partial<Pick<Note, "title" | "body" | "tags">>
): Promise<Note> => {
  const now = Date.now();
  const note: Note = NoteSchema.parse({
    id: crypto.randomUUID(),
    title: input?.title ?? "",
    body: input?.body ?? "",
    tags: normalizeTags(input?.tags ?? []),
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    embedding: null
  });

  await db.notes.put(note);
  return note;
};

export const updateNote = async (
  id: string,
  updates: Partial<Pick<Note, "title" | "body" | "tags" | "embedding">>
): Promise<Note | null> => {
  const existing = await db.notes.get(id);
  if (!existing) return null;

  const updated = NoteSchema.parse({
    ...existing,
    ...updates,
    tags: updates.tags ? normalizeTags(updates.tags) : existing.tags,
    embedding: bodyChanged ? null : existing.embedding,
    updatedAt: Date.now(),
    version: existing.version + 1,
  });

  await db.notes.put(updated);
  return updated;
};

export const updateNoteEmbedding = async (id: string, embedding: number[] | null): Promise<Note | null> => {
  const existing = await db.notes.get(id);
  if (!existing) return null;

  const updated = NoteSchema.parse({ ...existing, embedding });
  await db.notes.put(updated);
  return updated;
};

export const softDeleteNote = async (id: string): Promise<boolean> => {
  const existing = await db.notes.get(id);
  if (!existing || existing.deletedAt !== null) return false;

  await db.notes.put(NoteSchema.parse({
    ...existing,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    version: existing.version + 1
  }));
  return true;
};

export const restoreNote = async (id: string): Promise<boolean> => {
  const existing = await db.notes.get(id);
  if (!existing || existing.deletedAt === null) return false;

  await db.notes.put(NoteSchema.parse({
    ...existing,
    deletedAt: null,
    updatedAt: Date.now(),
    version: existing.version + 1
  }));
  return true;
};

export const togglePin = async (id: string): Promise<Note | null> => {
  const existing = await db.notes.get(id);
  if (!existing) return null;

  const updated = NoteSchema.parse({
    ...existing,
    pinned: !existing.pinned,
    updatedAt: Date.now(),
    version: existing.version + 1
  });
  await db.notes.put(updated);
  return updated;
};

export const purgeExpired = async (now = Date.now()): Promise<number> => {
  const expired = await db.notes
    .where("deletedAt")
    .below(now - PURGE_WINDOW_MS)
    .and((note) => note.deletedAt !== null)
    .toArray();

  if (expired.length === 0) return 0;
  await db.notes.bulkDelete(expired.map((note) => note.id));
  return expired.length;
};

export const listNotes = async (deleted = false): Promise<Note[]> => {
  const notes = await db.notes.toArray();
  const filtered = deleted
    ? notes.filter((note) => note.deletedAt !== null)
    : notes.filter((note) => note.deletedAt === null);

  return filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
};

export const listTrash = async (): Promise<Note[]> => {
  const all = await db.notes.toArray();
  return all.filter((note) => note.deletedAt !== null).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
};

export const searchNotes = async (query: string, queryEmbedding?: number[]): Promise<Note[]> => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return listNotes(false);

  const notes = await listNotes(false);
  if (queryEmbedding && queryEmbedding.length > 0) {
    return notes
      .map((note) => ({ note, score: note.embedding ? cosineSimilarity(queryEmbedding, note.embedding) : 0 }))
      .filter(({ score }) => score > SEMANTIC_MATCH_THRESHOLD)
      .sort((left, right) => right.score - left.score)
      .map(({ note }) => note);
  }

  return lexicalSearch(notes, normalized);
};

export type RelatedNote = { note: Note; score: number };

export const getRelatedNotes = async (noteId: string, limit = 3): Promise<RelatedNote[]> => {
  const current = await db.notes.get(noteId);
  if (!current?.embedding) return [];

  const notes = await listNotes(false);
  return notes
    .filter((note) => note.id !== noteId && note.embedding !== null)
    .map((note) => ({ note, score: cosineSimilarity(current.embedding ?? [], note.embedding ?? []) }))
    .filter(({ score }) => score > SEMANTIC_MATCH_THRESHOLD)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
};

export const getSettings = async (): Promise<SettingsRecord> => {
  const existing = await db.settings.get("default");
  if (existing) return SettingsSchema.parse(existing);

  const created = defaultSettings();
  await db.settings.put(created);
  return created;
};

export const getCloudflareCredentials = async (): Promise<CloudflareCredentials> => {
  const settings = await getSettings();
  return { accountId: settings.cloudflareAccountId, apiToken: settings.cloudflareApiToken };
};

export const saveCloudflareCredentials = async (credentials: CloudflareCredentials): Promise<SettingsRecord> => {
  const current = await getSettings();
  const updated = SettingsSchema.parse({
    ...current,
    cloudflareAccountId: credentials.accountId.trim(),
    cloudflareApiToken: credentials.apiToken.trim(),
  });
  await db.settings.put(updated);
  return updated;
};

export const exportAll = async (): Promise<ExportPayload> => {
  const notes = (await db.notes.toArray()).map((note) => NoteSchema.parse(note));
  const exportedAt = Date.now();
  const payload = ExportSchema.parse({
    app: "aurikrex-notes",
    schemaVersion: 2,
    exportedAt,
    notes
  });

  await db.settings.put({ id: "default", lastBackupAt: exportedAt });

  if (typeof window !== "undefined") {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `aurikrex-notes-${exportedAt}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return payload;
};

export type ImportResult = { added: number; updated: number; skipped: number };

export const importJson = async (raw: string): Promise<ImportResult> => {
  const parsed = ExportSchema.parse(JSON.parse(raw));
  let added = 0;
  let updated = 0;
  let skipped = 0;

  await db.transaction("rw", db.notes, async () => {
    for (const incoming of parsed.notes) {
      const current = await db.notes.get(incoming.id);
      if (!current) {
        await db.notes.put(NoteSchema.parse(incoming));
        added += 1;
      } else if (incoming.updatedAt > current.updatedAt) {
        await db.notes.put(NoteSchema.parse(incoming));
        updated += 1;
      } else {
        skipped += 1;
      }
    }
  });

  return { added, updated, skipped };
};

export const getLastBackupAt = async (): Promise<number | null> => {
  const settings = await db.settings.get("default");
  return settings?.lastBackupAt ?? null;
};

const utcDateKey = (now: number): string => new Date(now).toISOString().slice(0, 10);

export const getNeuronLedger = async (accountId: string, now = Date.now()): Promise<NeuronLedger> => {
  const utcDate = utcDateKey(now);
  const id = `${accountId}:${utcDate}`;
  const current = await db.neuronLedger.get(id);
  if (current) return NeuronLedgerSchema.parse(current);

  const initial = NeuronLedgerSchema.parse({
    id,
    accountId,
    utcDate,
    usedNeurons: 0,
    requestCount: 0,
    updatedAt: now
  });
  await db.neuronLedger.put(initial);
  return initial;
};

export const recordNeuronUsage = async (
  accountId: string,
  neurons: number,
  now = Date.now()
): Promise<NeuronLedger> => {
  const current = await getNeuronLedger(accountId, now);
  const next = NeuronLedgerSchema.parse({
    ...current,
    usedNeurons: current.usedNeurons + Math.max(0, neurons),
    requestCount: current.requestCount + 1,
    updatedAt: now
  });
  await db.neuronLedger.put(next);
  return next;
};
