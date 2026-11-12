"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NoteEditor } from "@/components/NoteEditor";
import type { Note } from "@/lib/db/schemas";
import { db } from "@/lib/db";
import { softDeleteNote, updateNote } from "@/lib/notes/repository";

export const NoteClient = () => {
  const params = useSearchParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      const id = params.get("id");
      if (!id) {
        return;
      }

      const value = await db.notes.get(id);
      if (!value || value.deletedAt !== null) {
        setNote(null);
        return;
      }
      setNote(value);
    };

    void load();
  }, [params]);

  if (!note) {
    return (
      <AppShell title="Note">
        <div className="p-4">Note not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit Note">
      <div className="p-4 border-b border-slate-800 flex gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded bg-warning text-deeper"
          onClick={async () => {
            await softDeleteNote(note.id);
            router.replace("/");
          }}
        >
          Move to trash
        </button>
      </div>
      <NoteEditor
        note={note}
        onChange={async (updates) => {
          const updated = await updateNote(note.id, updates);
          if (updated) {
            setNote(updated);
          }
        }}
      />
    </AppShell>
  );
};
