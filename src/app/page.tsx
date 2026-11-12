"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NotesList } from "@/components/NotesList";
import type { Note } from "@/lib/db/schemas";
import { listNotes, searchNotes, softDeleteNote, togglePin } from "@/lib/notes/repository";

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async (): Promise<void> => {
      const data = query ? await searchNotes(query) : await listNotes(false);
      setNotes(data);
    };

    void load();
  }, [query]);

  const refresh = async (): Promise<void> => {
    setNotes(await (query ? searchNotes(query) : listNotes(false)));
  };

  return (
    <AppShell title="Aurikrex Notes">
      <div className="p-4 border-b border-slate-800 flex gap-2">
        <input
          aria-label="Search"
          className="flex-1 bg-deeper border border-slate-800 rounded p-2"
          placeholder="Search notes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Link href="/new" className="px-3 py-2 rounded bg-accent">
          New
        </Link>
      </div>
      <NotesList
        notes={notes}
        onDelete={async (id) => {
          await softDeleteNote(id);
          await refresh();
        }}
        onPin={async (id) => {
          await togglePin(id);
          await refresh();
        }}
      />
    </AppShell>
  );
}
