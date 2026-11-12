import type { Note } from "@/lib/db/schemas";

type TrashListProps = {
  notes: Note[];
  onRestore: (id: string) => void;
};

export const TrashList = ({ notes, onRestore }: TrashListProps)=> {
  if (notes.length === 0) {
    return <p className="p-4 text-muted">Trash is empty.</p>;
  }

  return (
    <ul className="overflow-y-auto h-full p-4 space-y-3">
      {notes.map((note) => (
        <li key={note.id} className="bg-deeper rounded p-3 border border-slate-800">
          <h2 className="font-medium">{note.title || "Untitled"}</h2>
          <p className="text-sm text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{note.body}</p>
          <button type="button" className="mt-3 px-2 py-1 bg-accent rounded text-xs" onClick={() => onRestore(note.id)}>
            Restore
          </button>
        </li>
      ))}
    </ul>
  );
};
