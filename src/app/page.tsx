"use client";

import { useEffect, useState } from "react";
import { AppShell, Icon } from "@/components/AppShell";
import { NotesList } from "@/components/NotesList";
import type { Note } from "@/lib/db/schemas";
import { listNotes, searchNotes, softDeleteNote, togglePin } from "@/lib/notes/repository";

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    const request = query.trim() ? searchNotes(query) : listNotes(false);
    void request.then((result) => {
      if (active) setNotes(result);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [query, revision]);

  const runAction = async (action: () => Promise<unknown>, failure: string): Promise<void> => {
    setActionError("");
    try {
      await action();
      setRevision((value) => value + 1);
    } catch {
      setActionError(failure);
    }
  };

  return <AppShell title="Notes">
    <div className="search-row"><div className="search-box"><Icon name="search" size={19} /><input type="search" aria-label="Search notes on this device" placeholder="Search your notes" value={query} onChange={(event) => setQuery(event.target.value)} />{query ? <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}>×</button> : null}</div></div>
    <p className="list-caption" aria-live="polite">{loading ? "Checking this device…" : loadError ? "Local storage unavailable" : query.trim() ? `${notes.length} ${notes.length === 1 ? "match" : "matches"}` : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}</p>
    <NotesList notes={notes} query={query} loading={loading} error={loadError} actionError={actionError} onClearSearch={() => setQuery("")} onRetry={() => setRevision((value) => value + 1)} onDelete={(id) => { void runAction(() => softDeleteNote(id), "Couldn’t move that note to Trash. It is still on this device."); }} onPin={(id) => { void runAction(() => togglePin(id), "Couldn’t update that pin. Please try again."); }} />
  </AppShell>;
}
