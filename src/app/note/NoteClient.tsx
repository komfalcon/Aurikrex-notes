"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NoteEditor } from "@/components/NoteEditor";
import type { Note } from "@/lib/db/schemas";
import { db } from "@/lib/db";
import { embedText, noteSearchText, rankRelatedNotes } from "@/lib/ai/embeddings";
import { getCloudflareCredentials, runCloudflareText } from "@/lib/ai/cloudflare";
import { softDeleteNote, updateNote, listNotes } from "@/lib/notes/repository";

export const NoteClient = () => {
  const params = useSearchParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const noteRef = useRef<Note | null>(null);
  const smartTitleAttempted = useRef(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      const id = params.get("id");
      if (!id) return;
      const value = await db.notes.get(id);
      if (!value || value.deletedAt !== null) {
        setNote(null);
        return;
      }
      setNote(value);
      noteRef.current = value;
      smartTitleAttempted.current = false;
      setAllNotes(await listNotes(false));
    };
    void load();
  }, [params]);

  useEffect(() => {
    const current = note;
    if (!current || current.embedding || current.body.trim().length === 0) return;
    let cancelled = false;
    void embedText(noteSearchText(current)).then(async (embedding) => {
      if (cancelled) return;
      const updated = await updateNote(current.id, { embedding });
      if (updated) {
        setNote(updated);
        noteRef.current = updated;
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [note]);

  useEffect(() => {
    return () => {
      const current = noteRef.current;
      if (!current || smartTitleAttempted.current || current.title.trim() || !current.body.trim() || !getCloudflareCredentials()) return;
      smartTitleAttempted.current = true;
      void runCloudflareText([{ role: "user", content: `Create a concise title for this note. Return only the title.\n\n${current.body.slice(0, 200)}` }]).then(async ({ text }) => {
        if (text.trim()) await updateNote(current.id, { title: text.trim().replace(/^['"]|['"]$/g, "") });
      }).catch(() => undefined);
    };
  }, []);

  const handleChange = useCallback(async (updates: Pick<Note, "title" | "body" | "tags">): Promise<void> => {
    if (!note) return;
    const updated = await updateNote(note.id, { ...updates, embedding: updates.body !== note.body ? null : note.embedding });
    if (updated) {
      setNote(updated);
      noteRef.current = updated;
    }
  }, [note]);

  const handleSummarize = useCallback(async (): Promise<void> => {
    if (!note || !getCloudflareCredentials()) return;
    setIsSummarizing(true);
    try {
      const result = await runCloudflareText([{ role: "user", content: `Summarize the following text in 3 concise bullet points:\n\n${note.body}` }]);
      if (result.text.trim() && window.confirm("Replace this note’s body with the AI summary?")) {
        const updated = await updateNote(note.id, { body: result.text.trim(), embedding: null });
        if (updated) {
          setNote(updated);
          noteRef.current = updated;
        }
      }
    } finally {
      setIsSummarizing(false);
    }
  }, [note]);

  if (!note) return <AppShell title="Note"><div className="p-4">Note not found.</div></AppShell>;

  const relatedNotes = rankRelatedNotes(note, allNotes);
  return <AppShell title="Edit Note">
    <div className="p-4 border-b border-slate-800 flex gap-2"><button type="button" className="px-3 py-2 rounded bg-warning text-deeper" onClick={async () => { await softDeleteNote(note.id); router.replace("/"); }}>Move to trash</button></div>
    <NoteEditor note={note} onChange={(updates) => void handleChange(updates)} onSummarize={handleSummarize} canSummarize={Boolean(getCloudflareCredentials() && note.body.trim())} isSummarizing={isSummarizing} relatedNotes={relatedNotes} />
  </AppShell>;
};
