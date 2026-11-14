"use client";

import { useCallback, useRef, useState } from "react";
import type { Note } from "@/lib/db/schemas";
import { useVoiceDictation } from "@/lib/ai/useVoiceDictation";

type RelatedNote = { note: Note; score: number };
type NoteEditorProps = {
  note: Note;
  onChange: (updates: Pick<Note, "title" | "body" | "tags">) => void | Promise<void>;
  onSummarize: () => Promise<void>;
  canSummarize: boolean;
  isSummarizing: boolean;
  relatedNotes: RelatedNote[];
};

export const NoteEditor = ({ note, onChange, onSummarize, canSummarize, isSummarizing, relatedNotes }: NoteEditorProps) => {
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">("saved");
  const saveRevision = useRef(0);
  const saveChanges = useCallback((updates: Pick<Note, "title" | "body" | "tags">) => {
    const revision = ++saveRevision.current;
    setSaveStatus("saving");
    void Promise.resolve(onChange(updates)).then(() => {
      if (revision === saveRevision.current) setSaveStatus("saved");
    }).catch(() => {
      if (revision === saveRevision.current) setSaveStatus("error");
    });
  }, [onChange]);
  const appendDictation = useCallback((text: string) => {
    const separator = note.body.length > 0 && !note.body.endsWith(" ") ? " " : "";
    saveChanges({ title: note.title, body: `${note.body}${separator}${text}`, tags: note.tags });
  }, [note.body, note.tags, note.title, saveChanges]);
  const dictation = useVoiceDictation(appendDictation);

  return (
    <div className="editor-wrap">
      <input aria-label="Title" className="editor-title" value={note.title} onChange={(event) => saveChanges({ title: event.target.value, body: note.body, tags: note.tags })} placeholder="Untitled note" autoFocus />
      <div className="editor-toolbar" role="toolbar" aria-label="AI tools">
        {dictation.isSupported && <button type="button" className={`tool-button${dictation.isListening ? " active" : ""}`} onClick={dictation.toggle}>{dictation.isListening ? "Stop dictation" : "Dictate"}</button>}
        <button type="button" className="tool-button" onClick={() => void onSummarize()} disabled={!canSummarize || isSummarizing}>{isSummarizing ? "Summarizing…" : "Summarize"}</button>
      </div>
      <textarea aria-label="Body" className="editor-body" value={note.body} onChange={(event) => saveChanges({ title: note.title, body: event.target.value, tags: note.tags })} placeholder="Start writing..." />
      {dictation.error && <p className="ai-error">{dictation.error}</p>}
      {relatedNotes.length > 0 && <section className="related-notes" aria-label="Related Notes"><p className="settings-label">Related notes</p>{relatedNotes.map(({ note: related, score }) => <a key={related.id} className="related-note" href={`/note?id=${related.id}`}><span>{related.title || "Untitled note"}</span><small>{Math.round(score * 100)}%</small></a>)}</section>}
      <div className="editor-footer">
        <label className="tag-input"><span>Tags</span><input aria-label="Tags" value={note.tags.join(", ")} onChange={(event) => saveChanges({ title: note.title, body: note.body, tags: event.target.value.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0) })} placeholder="Add tags" /></label>
        <span className={`save-state ${saveStatus}`} role="status" aria-live="polite">{saveStatus === "saving" ? "Saving locally…" : saveStatus === "error" ? "Save failed" : "Saved locally"}</span>
      </div>
    </div>
  );
};
