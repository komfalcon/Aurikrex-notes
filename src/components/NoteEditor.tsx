"use client";

import { useEffect, useRef, useState } from "react";
import type { Note } from "@/lib/db/schemas";

type NoteEditorProps = {
  note: Note;
  onChange: (updates: Pick<Note, "title" | "body" | "tags">) => void;
  saveState: "saved" | "saving" | "error";
  onRetrySave: () => void;
};

const parseTags = (value: string): string[] => value.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);

export const NoteEditor = ({ note, onChange, saveState, onRetrySave }: NoteEditorProps) => {
  const [tagDraft, setTagDraft] = useState(note.tags.join(", "));
  const editingTags = useRef(false);

  useEffect(() => {
    if (!editingTags.current) setTagDraft(note.tags.join(", "));
  }, [note.id, note.tags]);

  return <div className="editor-wrap">
    <input aria-label="Title" className="editor-title" value={note.title} onChange={(event) => onChange({ title: event.target.value, body: note.body, tags: note.tags })} placeholder="Untitled note" autoFocus />
    <textarea aria-label="Body" className="editor-body" value={note.body} onChange={(event) => onChange({ title: note.title, body: event.target.value, tags: note.tags })} placeholder="Start writing…" />
    <div className="editor-footer">
      <label className="tag-input"><span>Tags</span><input aria-label="Tags" value={tagDraft} onFocus={() => { editingTags.current = true; }} onChange={(event) => { const value = event.target.value; setTagDraft(value); onChange({ title: note.title, body: note.body, tags: parseTags(value) }); }} onBlur={() => { editingTags.current = false; setTagDraft(parseTags(tagDraft).join(", ")); }} placeholder="Add tags" /></label>
      {saveState === "saving" ? <span className="save-state" role="status">Saving on this device…</span> : saveState === "error" ? <button type="button" className="save-retry" onClick={onRetrySave} aria-live="polite">Save failed · Retry</button> : <span className="save-state" role="status">Saved on this device</span>}
    </div>
  </div>;
};
