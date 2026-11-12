import { db } from "@/lib/db";
import { ExportSchema, NoteSchema, type ExportPayload, type Note } from "@/lib/db/schemas";

const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_WINDOW_MS = 30 * DAY_MS;

const normalizeTags = (tags: string[]): string[] =>
  tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

export const createNote = async (input?: Partial<Pick<Note, "title" | "body" | "tags">>): Promise<Note> => {
  const now = Date.now();
  const note: Note = {
    id: crypto.randomUUID(),
    title: input?.title ?? "",
    body: input?.body ?? "",
    tags: normalizeTags(input?.tags ?? []),
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1
  };

  await db.notes.put(NoteSchema.parse(note));
  return note;
};

export const updateNote = async (
  id: string,
  updates: Partial<Pick<Note, "title" | "body" | "tags">>
): Promise<Note | null> => {
  const existing = await db.notes.get(id);
  if (!existing) {
    return null;
  }

  const updated: Note = NoteSchema.parse({
    ...existing,
    ...updates,
    tags: updates.tags ? normalizeTags(updates.tags) : existing.tags,
    updatedAt: Date.now(),
    version: existing.version + 1
  });

  await db.notes.put(updated);
  return updated;
};

export const softDeleteNote = async (id: string): Promise<boolean> => {
  const existing = await db.notes.get(id);
  if (!existing || existing.deletedAt !== null) {
    return false;
  }

  await db.notes.put({
    ...existing,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    version: existing.version + 1
  });

  return true;
};

export const restoreNote = async (id: string): Promise<boolean> => {
  const existing = await db.notes.get(id);
  if (!existing || existing.deletedAt === null) {
    return false;
  }

  await db.notes.put({
    ...existing,
    deletedAt: null,
    updatedAt: Date.now(),
    version: existing.version + 1
  });

  return true;
};

export const togglePin = async (id: string): Promise<Note | null> => {
  const existing = await db.notes.get(id);
  if (!existing) {
    return null;
  }

  const updated: Note = {
    ...existing,
    pinned: !existing.pinned,
    updatedAt: Date.now(),
    version: existing.version + 1
  };

  await db.notes.put(updated);
  return updated;
};

export const purgeExpired = async (now = Date.now()): Promise<number> => {
  const expired = await db.notes
    .where("deletedAt")
    .below(now - PURGE_WINDOW_MS)
    .and((note) => note.deletedAt !== null)
    .toArray();

  if (expired.length === 0) {
    return 0;
  }

  await db.notes.bulkDelete(expired.map((note) => note.id));
  return expired.length;
};

export const listNotes = async (deleted = false): Promise<Note[]> => {
  const notes = await db.notes.toArray();
  const filtered = deleted
    ? notes.filter((note) => note.deletedAt !== null)
    : notes.filter((note) => note.deletedAt === null);

  return filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    return b.updatedAt - a.updatedAt;
  });
};

export const listTrash = async (): Promise<Note[]> => {
  const all = await db.notes.toArray();
  return all
    .filter((note) => note.deletedAt !== null)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
};

export const searchNotes = async (query: string): Promise<Note[]> => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return listNotes(false);
  }

  const notes = await listNotes(false);
  return notes.filter((note) => {
    const haystack = [note.title, note.body, note.tags.join(" ")].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
};

export const exportAll = async (): Promise<ExportPayload> => {
  const notes = await db.notes.toArray();
  const exportedAt = Date.now();
  const payload: ExportPayload = ExportSchema.parse({
    app: "aurikrex-notes",
    schemaVersion: 1,
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

export type ImportResult = {
  added: number;
  updated: number;
  skipped: number;
};

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
        continue;
      }

      if (incoming.updatedAt > current.updatedAt) {
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
