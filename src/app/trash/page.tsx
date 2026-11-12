"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TrashList } from "@/components/TrashList";
import type { Note } from "@/lib/db/schemas";
import { listTrash, purgeExpired, restoreNote } from "@/lib/notes/repository";

export default function TrashPage() {
  const [notes, setNotes] = useState<Note[]>([]);

  const refresh = async (): Promise<void> => {
    setNotes(await listTrash());
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AppShell title="Trash">
      <div className="p-4 border-b border-slate-800">
        <button
          type="button"
          className="px-3 py-2 rounded bg-deeper"
          onClick={async () => {
            await purgeExpired();
            await refresh();
          }}
        >
          Purge items older than 30 days
        </button>
      </div>
      <TrashList
        notes={notes}
        onRestore={async (id) => {
          await restoreNote(id);
          await refresh();
        }}
      />
    </AppShell>
  );
}
