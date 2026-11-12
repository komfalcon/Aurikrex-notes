import Link from "next/link";
import type { Note } from "@/lib/db/schemas";
import { Icon } from "./AppShell";

type NotesListProps = {
  notes: Note[];
  query: string;
  loading: boolean;
  error: boolean;
  actionError: string;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onClearSearch: () => void;
  onRetry: () => void;
};

export const NotesList = ({ notes, query, loading, error, actionError, onPin, onDelete, onClearSearch, onRetry }: NotesListProps) => {
  if (loading) return <div className="list-state" role="status"><span className="loading-spinner" /><span>Loading notes from this device…</span></div>;

  if (error) return <div className="empty-state" role="alert"><div className="empty-icon"><Icon name="note" size={28} /></div><h2>Notes didn’t open.</h2><p>Your notes are stored in this browser. Try opening the local notebook again.</p><button type="button" className="empty-action" onClick={onRetry}>Try again</button></div>;

  if (notes.length === 0) {
    const searching = query.trim().length > 0;
    return <div className="empty-state"><div className="empty-icon"><Icon name={searching ? "search" : "note"} size={28} /></div><h2>{searching ? "No matching notes." : "Your thoughts, offline."}</h2><p>{searching ? "Try a different word, or clear your search to see all notes." : "Create a note and it will stay on this device, even without a connection."}</p>{searching ? <button type="button" className="empty-action secondary" onClick={onClearSearch}>Clear search</button> : <Link href="/new" className="empty-action">Write your first note</Link>}</div>;
  }

  return <>
    {actionError ? <p className="inline-message error" role="alert">{actionError}</p> : null}
    <ul className="note-list">{notes.map((note) => <li key={note.id} className="note-card"><Link href={`/note?id=${note.id}`} className="note-card-main"><div className="note-card-heading"><h2>{note.title || "Untitled note"}</h2>{note.pinned ? <span className="pin-mark" aria-label="Pinned"><Icon name="pin" size={16} /></span> : null}</div><p>{note.body || "No content yet"}</p>{note.tags.length > 0 ? <div className="tag-row">{note.tags.slice(0, 3).map((tag) => <span key={tag} className="tag">{tag}</span>)}</div> : null}<time dateTime={new Date(note.updatedAt).toISOString()}>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></Link><div className="card-actions"><button type="button" className="card-action" onClick={() => onPin(note.id)} aria-label={note.pinned ? "Unpin note" : "Pin note"}><Icon name="pin" size={18} /></button><button type="button" className="card-action danger" onClick={() => onDelete(note.id)} aria-label="Move note to trash"><Icon name="trash" size={18} /></button></div></li>)}</ul>
  </>;
};
