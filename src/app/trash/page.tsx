"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TrashList } from "@/components/TrashList";
import type { Note } from "@/lib/db/schemas";
import { listTrash, purgeExpired, restoreNote } from "@/lib/notes/repository";

export default function TrashPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purging, setPurging] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    void listTrash().then((items) => {
      if (active) setNotes(items);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [revision]);

  const runPurge = async (): Promise<void> => {
    setPurging(true);
    setMessage("");
    try {
      const removed = await purgeExpired();
      setRevision((value) => value + 1);
      setMessage(removed === 0 ? "No expired notes needed removing." : `${removed} expired ${removed === 1 ? "note was" : "notes were"} permanently removed.`);
      setMessageError(false);
      setConfirmPurge(false);
    } catch {
      setMessage("Couldn’t clean up expired notes. Nothing was intentionally removed—please try again.");
      setMessageError(true);
    } finally {
      setPurging(false);
    }
  };

  const restore = async (id: string): Promise<void> => {
    try {
      await restoreNote(id);
      setMessage("Note restored to your notebook.");
      setMessageError(false);
      setRevision((value) => value + 1);
    } catch {
      setMessage("Couldn’t restore the note. It is still in Trash.");
      setMessageError(true);
    }
  };

  return <AppShell title="Trash">
    <div className="trash-toolbar"><div><strong>Keep your notes recoverable.</strong><p>Deleted notes stay here for 30 days. After that, you can choose when to permanently remove them.</p></div><button type="button" className="quiet-danger-button purge-button" onClick={() => { setConfirmPurge(true); setMessage(""); }} disabled={purging}>Purge expired</button></div>
    {confirmPurge ? <div className="delete-confirm trash-confirm" role="alert"><div className="delete-confirm-copy"><strong>Permanently remove expired notes?</strong><span>This can’t be undone. Notes deleted less than 30 days ago will remain.</span></div><div className="delete-confirm-actions"><button type="button" className="quiet-button" onClick={() => setConfirmPurge(false)} disabled={purging}>Cancel</button><button type="button" className="danger-fill-button" onClick={() => void runPurge()} disabled={purging}>{purging ? "Removing…" : "Remove expired"}</button></div></div> : null}
    {message ? <p className={messageError ? "inline-message error" : "inline-message success"} role={messageError ? "alert" : "status"}>{message}</p> : null}
    {loading ? <div className="list-state" role="status"><span className="loading-spinner" /><span>Opening local Trash…</span></div> : loadError ? <div className="route-state" role="alert"><h2>Trash didn’t open.</h2><p>Your deleted notes are stored in this browser’s IndexedDB.</p><button type="button" className="empty-action" onClick={() => setRevision((value) => value + 1)}>Try again</button></div> : <TrashList notes={notes} onRestore={(id) => { void restore(id); }} />}
  </AppShell>;
}
