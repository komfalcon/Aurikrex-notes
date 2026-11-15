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
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const refresh = useCallback(async (): Promise<void> => {
    const normalized = query.trim();
    if (!normalized) {
      setNotes(await listNotes(false));
      setSearchStatus(null);
      return;
    }
    setSearchStatus("Searching by meaning…");
    const result = await semanticSearchNotes(normalized);
    setNotes(result.notes);
    setSearchStatus(result.message ?? "Showing meaning-based results.");
  }, [query]);
  useEffect(() => {
    const refreshAfterNoteUpdate = (): void => {
      void refresh().catch(() => setSearchStatus("Could not refresh notes. Try again."));
    };
    window.addEventListener("aurikrex-notes:note-updated", refreshAfterNoteUpdate);
    return () => window.removeEventListener("aurikrex-notes:note-updated", refreshAfterNoteUpdate);
  }, [refresh]);
  useEffect(() => {
    let active = true;
    const normalized = query.trim();
    if (!normalized) {
      setSearchStatus(null);
      void listNotes(false).then((items) => { if (active) setNotes(items); });
      return () => { active = false; };
    }

    setSearchStatus("Searching by meaning…");
    void searchNotes(normalized).then((items) => { if (active) setNotes(items); });
    const semanticTimer = window.setTimeout(() => {
      void semanticSearchNotes(normalized).then((result) => {
        if (!active) return;
        setNotes(result.notes);
        setSearchStatus(result.message ?? "Showing meaning-based results.");
      }).catch(() => {
        if (active) setSearchStatus("Search could not be completed. Try again.");
      });
    }, 120);
    return () => {
      active = false;
      window.clearTimeout(semanticTimer);
    };
  }, [query]);

  return <AppShell title="Notes"><div className="search-row"><div className="search-box"><Icon name="search" size={19} /><input aria-label="Search" type="search" placeholder="Search your notes" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}><Icon name="close" size={17} /></button>}</div></div><p className="list-caption">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>{searchStatus && <p className="search-status" role="status" aria-live="polite">{searchStatus}</p>}<NotesList notes={notes} onDelete={async (id) => { await softDeleteNote(id); await refresh(); }} onPin={async (id) => { await togglePin(id); await refresh(); }} /></AppShell>;
}
