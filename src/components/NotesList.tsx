import Link from "next/link";
import type { Note } from "@/lib/db/schemas";

type NotesListProps = {
  notes: Note[];
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
};

export const NotesList = ({ notes, onPin, onDelete }: NotesListProps)=> {
  if (notes.length === 0) {
    return <p className="p-4 text-muted">No notes yet.</p>;
  }

  return (
    <ul className="overflow-y-auto h-full p-4 space-y-3">
      {notes.map((note) => (
        <li key={note.id} className="bg-deeper rounded p-3 border border-slate-800">
          <Link href={`/note?id=${note.id}`} className="block">
            <h2 className="font-medium">{note.title || "Untitled"}</h2>
            <p className="text-sm text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{note.body}</p>
          </Link>
          {note.tags.length > 0 && <p className="text-xs text-muted mt-2">{note.tags.join(", ")}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" className="px-2 py-1 bg-accent rounded text-xs" onClick={() => onPin(note.id)}>
              {note.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              className="px-2 py-1 bg-warning rounded text-xs text-deeper"
              onClick={() => onDelete(note.id)}
            >
              Trash
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};
