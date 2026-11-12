"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NoteEditor } from "@/components/NoteEditor";
import type { Note } from "@/lib/db/schemas";
import { db } from "@/lib/db";
import { createSmartTitle, summarizeNote } from "@/lib/ai/cloudflareAi";
import { generateEmbedding } from "@/lib/ai/embeddings";
import {
  getCloudflareCredentials,
  getRelatedNotes,
  softDeleteNote,
  updateNote,
  updateNoteEmbedding,
  type RelatedNote,
} from "@/lib/notes/repository";

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
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [cloudflareReady, setCloudflareReady] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [aiError, setAiError] = useState("");
  const activeIdRef = useRef<string | null>(null);
  const latestNoteRef = useRef<Note | null>(null);
  const saveSequenceRef = useRef(0);
  const embeddingSequenceRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const refreshEmbedding = useCallback((id: string, body: string): void => {
    const sequence = ++embeddingSequenceRef.current;
    if (body.trim().length === 0) return;

    void generateEmbedding(body).then(async (embedding) => {
      if (activeIdRef.current !== id || sequence !== embeddingSequenceRef.current) return;
      const updated = await updateNoteEmbedding(id, embedding);
      if (!updated || activeIdRef.current !== id || sequence !== embeddingSequenceRef.current) return;
      latestNoteRef.current = updated;
      setNote((current) => current?.id === id ? updated : current);
    }).catch(() => {
      // Local note editing remains available if the first model download is unavailable.
    });
  }, []);

  useEffect(() => {
    let active = true;
    activeIdRef.current = noteId || null;
    latestNoteRef.current = null;
    setNote(null);
    setSaveState("saved");
    setDeleteState("idle");
    setAiError("");
    setLoadState(noteId ? "loading" : "not-found");

    if (!noteId) return () => { active = false; };

    void db.notes.get(noteId).then((value) => {
      if (!active) return;
      if (!value || value.deletedAt !== null) {
        setLoadState("not-found");
        return;
      }
      latestNoteRef.current = value;
      setNote(value);
      setLoadState("ready");
      if (!value.embedding && value.body.trim().length > 0) refreshEmbedding(value.id, value.body);
    }).catch(() => {
      if (active) setLoadState("error");
    });

    return () => { active = false; };
  }, [noteId, loadAttempt, refreshEmbedding]);

  useEffect(() => {
    let active = true;
    void getCloudflareCredentials().then((credentials) => {
      if (active) setCloudflareReady(credentials.accountId.trim().length > 0 && credentials.apiToken.trim().length > 0);
    }).catch(() => {
      if (active) setCloudflareReady(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!note?.embedding) {
      setRelatedNotes([]);
      return;
    }

    let active = true;
    void getRelatedNotes(note.id).then((matches) => {
      if (active) setRelatedNotes(matches);
    }).catch(() => {
      if (active) setRelatedNotes([]);
    });
    return () => { active = false; };
  }, [note?.id, note?.embedding]);

  const saveChanges = (updates: Pick<Note, "title" | "body" | "tags">): void => {
    const id = activeIdRef.current;
    const current = latestNoteRef.current;
    if (!id || !current || current.id !== id) return;

    const bodyChanged = updates.body !== current.body;
    const optimistic: Note = { ...current, ...updates, embedding: bodyChanged ? null : current.embedding };
    latestNoteRef.current = optimistic;
    setNote(optimistic);
    const sequence = ++saveSequenceRef.current;
    setSaveState("saving");

    const write = async (): Promise<void> => {
      try {
        const updated = await updateNote(id, updates);
        if (!updated) throw new Error("The note no longer exists.");
        if (activeIdRef.current === id && sequence === saveSequenceRef.current) {
          latestNoteRef.current = updated;
          setNote(updated);
          setSaveState("saved");
          if (bodyChanged) refreshEmbedding(id, updated.body);
        }
      } catch {
        if (activeIdRef.current === id && sequence === saveSequenceRef.current) setSaveState("error");
      }
    };

    saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(write);
  };

  const retrySave = (): void => {
    const current = latestNoteRef.current;
    if (current) saveChanges({ title: current.title, body: current.body, tags: current.tags });
  };

  const summarizeCurrentNote = async (): Promise<void> => {
    const current = latestNoteRef.current;
    if (!current || !cloudflareReady || current.body.trim().length === 0 || summarizing) return;

    setAiError("");
    setSummarizing(true);
    try {
      const credentials = await getCloudflareCredentials();
      const summary = await summarizeNote(credentials, current.body);
      const latest = latestNoteRef.current;
      if (latest?.id === current.id) saveChanges({ title: latest.title, body: summary, tags: latest.tags });
    } catch {
      setAiError("Couldn’t summarize this note. Check your Cloudflare keys or connection; your original text is still here.");
    } finally {
      setSummarizing(false);
    }
  };

  const saveSmartTitleOnExit = async (): Promise<void> => {
    const exitingNote = latestNoteRef.current;
    if (!exitingNote || exitingNote.title.trim().length > 0 || exitingNote.body.trim().length === 0) return;

    try {
      await saveQueueRef.current.catch(() => undefined);
      const credentials = await getCloudflareCredentials();
      if (credentials.accountId.trim().length === 0 || credentials.apiToken.trim().length === 0) return;
      const title = (await createSmartTitle(credentials, exitingNote.body)).trim().slice(0, 120);
      if (title.length === 0) return;
      const current = await db.notes.get(exitingNote.id);
      if (!current || current.title.trim().length > 0) return;
      await updateNote(current.id, { title, body: current.body, tags: current.tags });
    } catch {
      // Smart titles are best-effort and never block leaving an editor, including offline.
    }
  };

  useEffect(() => () => {
    void saveSmartTitleOnExit();
  }, [noteId]);

  const moveToTrash = async (): Promise<void> => {
    const current = latestNoteRef.current;
    if (!current) return;
    setDeleteState("deleting");
    try {
      const moved = await softDeleteNote(current.id);
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
        {aiError ? <p className="inline-message error" role="alert">{aiError}</p> : null}
      </div>
      <NoteEditor note={note} onChange={saveChanges} saveState={saveState} onRetrySave={retrySave} onSummarize={() => { void summarizeCurrentNote(); }} canSummarize={cloudflareReady} summarizing={summarizing} relatedNotes={relatedNotes} />
    </AppShell>
  );
};
