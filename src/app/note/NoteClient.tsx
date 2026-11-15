"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NoteEditor } from "@/components/NoteEditor";
import type { Note } from "@/lib/db/schemas";
import { db } from "@/lib/db";
import { embedText, noteSearchText, rankRelatedNotes } from "@/lib/ai/embeddings";
import { getCloudflareCredentials, runCloudflareText } from "@/lib/ai/cloudflare";
import { listNotes, softDeleteNote, updateNote, updateNoteIfContentMatches } from "@/lib/notes/repository";

const aiErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "The AI request failed. Please try again.";

const cleanGeneratedTitle = (text: string): string =>
  text.trim().replace(/^['"“”]+|['"“”]+$/g, "").replace(/^title:\s*/i, "").trim();

export const NoteClient = () => {
  const params = useSearchParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const noteRef = useRef<Note | null>(null);
  const previousNoteForTitle = useRef<Note | null>(null);
  const attemptedTitleIds = useRef(new Set<string>());
  const titleRequestIds = useRef(new Map<string, number>());
  const editRevisions = useRef(new Map<string, number>());
  const isMounted = useRef(false);
  const currentNoteId = note?.id;
  const currentTitle = note?.title;
  const currentBody = note?.body;

  if (note && (!previousNoteForTitle.current || previousNoteForTitle.current.id === note.id)) {
    previousNoteForTitle.current = note;
  }

  const generateAutoTitle = useCallback(async (source: Note): Promise<void> => {
    if (source.title.trim() || source.body.trim().length < 12 || !getCloudflareCredentials() || attemptedTitleIds.current.has(source.id)) return;
    const noteId = source.id;
    const sourceTitle = source.title;
    const sourceBody = source.body;
    const sourceRevision = editRevisions.current.get(noteId) ?? 0;
    attemptedTitleIds.current.add(noteId);
    const requestId = (titleRequestIds.current.get(noteId) ?? 0) + 1;
    titleRequestIds.current.set(noteId, requestId);
    if (isMounted.current && noteRef.current?.id === noteId) {
      setIsGeneratingTitle(true);
      setAiError(null);
    }

    try {
      const { text } = await runCloudflareText([{ role: "user", content: `Create a concise title for this note. Return only the title, with no quotation marks.\n\n${sourceBody.slice(0, 200)}` }]);
      const title = cleanGeneratedTitle(text);
      if (!title) throw new Error("The AI returned an empty title. Keep writing and it will retry.");
      if ((editRevisions.current.get(noteId) ?? 0) !== sourceRevision) return;
      const updated = await updateNoteIfContentMatches(noteId, { body: sourceBody, title: sourceTitle }, { title, embedding: null });
      if (!updated || (editRevisions.current.get(noteId) ?? 0) !== sourceRevision) return;
      if (noteRef.current?.id === noteId) {
        noteRef.current = updated;
        if (isMounted.current) setNote(updated);
      }
      if (typeof window !== "undefined") window.dispatchEvent(new Event("aurikrex-notes:note-updated"));
    } catch (error) {
      attemptedTitleIds.current.delete(noteId);
      if (isMounted.current && noteRef.current?.id === noteId && noteRef.current.body === sourceBody) {
        setAiError(`Auto-title failed: ${aiErrorMessage(error)}`);
      }
    } finally {
      if (isMounted.current && noteRef.current?.id === noteId && titleRequestIds.current.get(noteId) === requestId) {
        setIsGeneratingTitle(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const id = params.get("id");
      if (!id) return;
      const value = await db.notes.get(id);
      if (!active) return;
      if (!value || value.deletedAt !== null) {
        noteRef.current = null;
        setNote(null);
        return;
      }
      setAiError(null);
      setNote(value);
      noteRef.current = value;
      titleRequestIds.current.set(value.id, (titleRequestIds.current.get(value.id) ?? 0) + 1);
      setIsGeneratingTitle(false);
      setAllNotes(await listNotes(false));
    };
    void load().catch(() => {
      if (active) setAiError("Could not load this note from local storage.");
    });
    return () => { active = false; };
  }, [params]);

  useEffect(() => {
    const current = note;
    if (!current || current.embedding || current.body.trim().length === 0) return;
    let cancelled = false;
    void embedText(noteSearchText(current)).then(async (embedding) => {
      if (cancelled) return;
      const updated = await updateNoteIfContentMatches(current.id, { body: current.body, title: current.title, tags: current.tags }, { embedding });
      if (updated && !cancelled) {
        setNote(updated);
        noteRef.current = updated;
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [note]);

  useEffect(() => {
    if (!currentNoteId || currentTitle?.trim() || !currentBody || currentBody.trim().length < 12 || !getCloudflareCredentials()) return;
    const timer = window.setTimeout(() => {
      const current = noteRef.current;
      if (current?.id === currentNoteId && current.title === currentTitle && current.body === currentBody) {
        void generateAutoTitle(current);
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [currentNoteId, currentTitle, currentBody, generateAutoTitle]);

  useEffect(() => {
    const previous = previousNoteForTitle.current;
    if (previous && previous.id !== currentNoteId) void generateAutoTitle(previous);
    previousNoteForTitle.current = noteRef.current;
  }, [currentNoteId, generateAutoTitle]);

  useEffect(() => () => {
    const current = noteRef.current;
    if (current) void generateAutoTitle(current);
  }, [generateAutoTitle]);

  const handleChange = useCallback(async (updates: Pick<Note, "title" | "body" | "tags">): Promise<void> => {
    if (!note) return;
    const contentChanged = updates.title !== note.title || updates.body !== note.body;
    if (contentChanged) editRevisions.current.set(note.id, (editRevisions.current.get(note.id) ?? 0) + 1);
    if (!updates.title.trim() && contentChanged) attemptedTitleIds.current.delete(note.id);
    setAiError(null);
    const searchTextChanged = contentChanged || updates.tags.join("\u0000") !== note.tags.join("\u0000");
    const updated = await updateNote(note.id, { ...updates, embedding: searchTextChanged ? null : note.embedding });
    if (updated) {
      setNote(updated);
      noteRef.current = updated;
    }
  }, [note]);

  const handleSummarize = useCallback(async (): Promise<void> => {
    const current = noteRef.current;
    if (!current) return;
    setAiError(null);
    if (!getCloudflareCredentials()) {
      setAiError("Add your Cloudflare Workers AI credentials in Settings to use Summarize.");
      return;
    }
    if (!current.body.trim()) {
      setAiError("Add some note text before asking for a summary.");
      return;
    }

    const noteId = current.id;
    const sourceBody = current.body;
    setIsSummarizing(true);
    try {
      const result = await runCloudflareText([{ role: "user", content: `Summarize the following text in 3 concise bullet points. Return only the bullet points.\n\n${sourceBody}` }]);
      const latest = noteRef.current;
      if (latest?.id !== noteId || latest.body !== sourceBody) {
        throw new Error("This note changed while the summary was being prepared. Your edits were kept; try again.");
      }
      if (window.confirm("Replace this note’s body with the AI summary?")) {
        const updated = await updateNoteIfContentMatches(noteId, { body: sourceBody }, { body: result.text.trim(), embedding: null });
        if (!updated) throw new Error("This note changed while the summary was being prepared. Your edits were kept; try again.");
        editRevisions.current.set(noteId, (editRevisions.current.get(noteId) ?? 0) + 1);
        if (!updated.title.trim()) attemptedTitleIds.current.delete(noteId);
        noteRef.current = updated;
        if (isMounted.current) setNote(updated);
      }
    } catch (error) {
      if (isMounted.current && noteRef.current?.id === noteId) setAiError(`Summarize failed: ${aiErrorMessage(error)}`);
    } finally {
      if (isMounted.current) setIsSummarizing(false);
    }
  }, []);

  if (!note) return <AppShell title="Note"><div className="p-4">{aiError ?? "Note not found."}</div></AppShell>;

  const relatedNotes = rankRelatedNotes(note, allNotes);
  return <AppShell title="Edit Note">
    <div className="p-4 border-b border-slate-800 flex gap-2"><button type="button" className="px-3 py-2 rounded bg-warning text-deeper" onClick={async () => { await softDeleteNote(note.id); router.replace("/"); }}>Move to trash</button></div>
    <NoteEditor note={note} onChange={handleChange} onSummarize={handleSummarize} canSummarize={Boolean(getCloudflareCredentials() && note.body.trim())} isSummarizing={isSummarizing} isGeneratingTitle={isGeneratingTitle} aiError={aiError} relatedNotes={relatedNotes} />
  </AppShell>;
};
