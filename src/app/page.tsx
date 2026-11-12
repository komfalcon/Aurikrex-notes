"use client";
import { useCallback, useEffect, useState } from "react";
import { AppShell, Icon } from "@/components/AppShell";
import { NotesList } from "@/components/NotesList";
import type { Note } from "@/lib/db/schemas";
import { listNotes, searchNotes, softDeleteNote, togglePin } from "@/lib/notes/repository";
export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const refresh = useCallback(async (): Promise<void> => { setNotes(await (query ? searchNotes(query) : listNotes(false))); }, [query]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <AppShell title="Notes"><div className="search-row"><div className="search-box"><Icon name="search" size={19} /><input aria-label="Search" placeholder="Search your notes" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div><p className="list-caption">{notes.length} {notes.length === 1 ? "note" : "notes"}</p><NotesList notes={notes} onDelete={async (id) => { await softDeleteNote(id); await refresh(); }} onPin={async (id) => { await togglePin(id); await refresh(); }} /></AppShell>;
}
