"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NoteEditor } from "@/components/NoteEditor";
import type { Note } from "@/lib/db/schemas";
import { db } from "@/lib/db";
import { softDeleteNote, updateNote } from "@/lib/notes/repository";

type LoadState = "loading" | "ready" | "not-found" | "error";
type SaveState = "saved" | "saving" | "error";

export const NoteClient = () => {
  const params = useSearchParams();
  const router = useRouter();
  const noteId = params.get("id") ?? "";
  const [note, setNote] = useState<Note | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  const activeIdRef = useRef<string | null>(null);
  const saveSequenceRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    activeIdRef.current = noteId || null;
    setNote(null);
    setSaveState("saved");
    setDeleteState("idle");
    setLoadState(noteId ? "loading" : "not-found");

    if (!noteId) return () => { active = false; };

    void db.notes.get(noteId).then((value) => {
      if (!active) return;
      if (!value || value.deletedAt !== null) {
        setLoadState("not-found");
        return;
      }
      setNote(value);
      setLoadState("ready");
    }).catch(() => {
      if (active) setLoadState("error");
    });

    return () => { active = false; };
  }, [noteId, loadAttempt]);

  const saveChanges = (updates: Pick<Note, "title" | "body" | "tags">): void => {
    const id = activeIdRef.current;
    if (!id) return;

    setNote((current) => current?.id === id ? { ...current, ...updates } : current);
    const sequence = ++saveSequenceRef.current;
    setSaveState("saving");

    const write = async (): Promise<void> => {
      try {
        const updated = await updateNote(id, updates);
        if (!updated) throw new Error("The note no longer exists.");
        if (activeIdRef.current === id) {
          setNote((current) => current?.id === id ? { ...current, updatedAt: updated.updatedAt, version: updated.version } : current);
          if (sequence === saveSequenceRef.current) setSaveState("saved");
        }
      } catch {
        if (activeIdRef.current === id && sequence === saveSequenceRef.current) setSaveState("error");
      }
    };

    saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(write);
  };

  const retrySave = (): void => {
    if (note) saveChanges({ title: note.title, body: note.body, tags: note.tags });
  };

  const moveToTrash = async (): Promise<void> => {
    if (!note) return;
    setDeleteState("deleting");
    try {
      const moved = await softDeleteNote(note.id);
      if (!moved) throw new Error("The note could not be moved.");
      router.replace("/");
    } catch {
      setDeleteState("error");
    }
  };

  if (loadState === "loading") return <AppShell title="Opening note"><div className="list-state" role="status"><span className="loading-spinner" /><span>Opening your note from this device…</span></div></AppShell>;
  if (loadState === "error") return <AppShell title="Storage unavailable"><div className="route-state" role="alert"><h2>Couldn’t open this note.</h2><p>Your note should be in this browser’s IndexedDB. Try again, or return to your notes.</p><button type="button" className="empty-action" onClick={() => setLoadAttempt((value) => value + 1)}>Try again</button><Link className="text-link" href="/">Back to notes</Link></div></AppShell>;
  if (loadState === "not-found" || !note) return <AppShell title="Note not found"><div className="route-state"><h2>This note isn’t available.</h2><p>It may have been moved to Trash or removed from this device.</p><Link className="empty-action" href="/">Back to notes</Link></div></AppShell>;

  return (
    <AppShell title="Edit Note">
      <div className="editor-toolbar">
        {deleteState === "confirm" || deleteState === "deleting" ? <div className="delete-confirm" role="alert"><div className="delete-confirm-copy"><strong>Move this note to Trash?</strong><span>You can restore it later.</span></div><div className="delete-confirm-actions"><button type="button" className="quiet-button" onClick={() => setDeleteState("idle")} disabled={deleteState === "deleting"}>Keep note</button><button type="button" className="danger-fill-button" onClick={() => void moveToTrash()} disabled={deleteState === "deleting"}>{deleteState === "deleting" ? "Moving…" : "Move to trash"}</button></div></div> : <><button type="button" className="quiet-danger-button" onClick={() => setDeleteState("confirm")}>Move to trash</button>{deleteState === "error" ? <p className="inline-message error" role="alert">Couldn’t move the note. It is still on this device—please try again.</p> : null}</>}
      </div>
      <NoteEditor note={note} onChange={saveChanges} saveState={saveState} onRetrySave={retrySave} />
    </AppShell>
  );
};
