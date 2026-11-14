"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, Icon } from "@/components/AppShell";
import { NotesList } from "@/components/NotesList";
import type { Note } from "@/lib/db/schemas";
import { listNotes, searchNotes, softDeleteNote, togglePin } from "@/lib/notes/repository";
import { semanticSearchNotes } from "@/lib/ai/semanticSearch";

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const refresh = useCallback(async (): Promise<void> => {
    setNotes(query.trim() ? await semanticSearchNotes(query) : await listNotes(false));
  }, [query]);
  useEffect(() => {
    let active = true;
    const normalized = query.trim();
    if (!normalized) {
      void listNotes(false).then((items) => { if (active) setNotes(items); });
      return () => { active = false; };
    }

    void searchNotes(normalized).then((items) => { if (active) setNotes(items); });
    const semanticTimer = window.setTimeout(() => {
      void semanticSearchNotes(normalized).then((items) => { if (active) setNotes(items); });
    }, 120);
    return () => {
      active = false;
      window.clearTimeout(semanticTimer);
    };
  }, [query]);

  return <AppShell title="Notes"><div className="search-row"><div className="search-box"><Icon name="search" size={19} /><input aria-label="Search" type="search" placeholder="Search your notes" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}><Icon name="close" size={17} /></button>}</div></div><p className="list-caption">{notes.length} {notes.length === 1 ? "note" : "notes"}</p><NotesList notes={notes} onDelete={async (id) => { await softDeleteNote(id); await refresh(); }} onPin={async (id) => { await togglePin(id); await refresh(); }} /></AppShell>;
}
