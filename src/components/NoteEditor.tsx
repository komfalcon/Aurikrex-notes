"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Note } from "@/lib/db/schemas";
import type { RelatedNote } from "@/lib/notes/repository";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import { Icon } from "./AppShell";

type NoteEditorProps = {
  note: Note;
  onChange: (updates: Pick<Note, "title" | "body" | "tags">) => void;
  saveState: "saved" | "saving" | "error";
  onRetrySave: () => void;
  onSummarize: () => void;
  canSummarize: boolean;
  summarizing: boolean;
  relatedNotes: RelatedNote[];
};

const parseTags = (value: string): string[] => value.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);

export const NoteEditor = ({
  note,
  onChange,
  saveState,
  onRetrySave,
  onSummarize,
  canSummarize,
  summarizing,
  relatedNotes,
}: NoteEditorProps) => {
  const [tagDraft, setTagDraft] = useState(note.tags.join(", "));
  const editingTags = useRef(false);

  useEffect(() => {
    if (!editingTags.current) setTagDraft(note.tags.join(", "));
  }, [note.id, note.tags]);

  const appendDictation = useCallback((text: string): void => {
    const separator = note.body.trim().length > 0 ? "\n\n" : "";
    onChange({ title: note.title, body: `${note.body}${separator}${text}`, tags: note.tags });
  }, [note.body, note.tags, note.title, onChange]);

  const dictation = useVoiceDictation({ onTranscript: appendDictation });
  const dictationListening = dictation.state === "listening";
  const dictationLabel = dictationListening ? "Stop voice dictation" : "Start voice dictation";

  return <div className="editor-wrap">
    <input aria-label="Title" className="editor-title" value={note.title} onChange={(event) => onChange({ title: event.target.value, body: note.body, tags: note.tags })} placeholder="Untitled note" autoFocus />
    <div className="writing-toolbar" aria-label="Writing tools">
      <button type="button" className={dictationListening ? "tool-button active" : "tool-button"} onClick={() => { if (dictationListening) dictation.stop(); else dictation.start(); }} disabled={!dictation.isSupported} aria-label={dictationLabel} title={dictation.isSupported ? dictationLabel : "Voice dictation is not supported in this browser"}>
        <Icon name="mic" size={17} />
        <span>{dictationListening ? "Listening" : "Dictate"}</span>
      </button>
      <button type="button" className="tool-button" onClick={onSummarize} disabled={!canSummarize || summarizing || note.body.trim().length === 0} aria-label="Summarize note" title={canSummarize ? "Replace this note with a concise summary" : "Add Cloudflare AI keys in Settings to summarize"}>
        <Icon name="summarize" size={17} />
        <span>{summarizing ? "Summarizing" : "Summarize"}</span>
      </button>
      {dictation.error ? <span className="tool-message" role="status">{dictation.error}</span> : null}
    </div>
    <textarea aria-label="Body" className="editor-body" value={note.body} onChange={(event) => onChange({ title: note.title, body: event.target.value, tags: note.tags })} placeholder="Start writing…" />
    <div className="editor-footer">
      <label className="tag-input"><span>Tags</span><input aria-label="Tags" value={tagDraft} onFocus={() => { editingTags.current = true; }} onChange={(event) => { const value = event.target.value; setTagDraft(value); onChange({ title: note.title, body: note.body, tags: parseTags(value) }); }} onBlur={() => { editingTags.current = false; setTagDraft(parseTags(tagDraft).join(", ")); }} placeholder="Add tags" /></label>
      {saveState === "saving" ? <span className="save-state" role="status">Saving on this device…</span> : saveState === "error" ? <button type="button" className="save-retry" onClick={onRetrySave} aria-live="polite">Save failed · Retry</button> : <span className="save-state" role="status">Saved on this device</span>}
    </div>
    {relatedNotes.length > 0 ? <section className="related-notes" aria-labelledby="related-notes-title">
      <div className="related-notes-heading"><div><p className="settings-label" id="related-notes-title">Related notes</p><p>Local semantic matches</p></div><span>Top {relatedNotes.length}</span></div>
      <ul>{relatedNotes.map(({ note: related, score }) => <li key={related.id}><Link href={`/note?id=${related.id}`}><span><strong>{related.title || "Untitled note"}</strong><small>{related.body || "No content yet"}</small></span><em>{Math.round(score * 100)}%</em></Link></li>)}</ul>
    </section> : null}
  </div>;
};
