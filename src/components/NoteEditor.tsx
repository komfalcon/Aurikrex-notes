import type { Note } from "@/lib/db/schemas";

type NoteEditorProps = {
  note: Note;
  onChange: (updates: Pick<Note, "title" | "body" | "tags">) => void;
};

export const NoteEditor = ({ note, onChange }: NoteEditorProps)=> {
  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <input
        aria-label="Title"
        className="bg-deeper border border-slate-800 rounded p-2"
        value={note.title}
        onChange={(event) => onChange({ title: event.target.value, body: note.body, tags: note.tags })}
        placeholder="Title"
      />
      <input
        aria-label="Tags"
        className="bg-deeper border border-slate-800 rounded p-2 text-sm"
        value={note.tags.join(", ")}
        onChange={(event) =>
          onChange({
            title: note.title,
            body: note.body,
            tags: event.target.value
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
          })
        }
        placeholder="tags,comma,separated"
      />
      <textarea
        aria-label="Body"
        className="flex-1 min-h-0 bg-deeper border border-slate-800 rounded p-2 font-mono"
        value={note.body}
        onChange={(event) => onChange({ title: note.title, body: event.target.value, tags: note.tags })}
        placeholder="Write your note..."
      />
    </div>
  );
};
