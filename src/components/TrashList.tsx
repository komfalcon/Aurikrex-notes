import type { Note } from "@/lib/db/schemas";

type TrashListProps = { notes: Note[]; onRestore: (id: string) => void };
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const formatDate = (time: number): string => new Date(time).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export const TrashList = ({ notes, onRestore }: TrashListProps) => notes.length === 0 ? <div className="empty-state"><div className="empty-icon"><span>✓</span></div><h2>Trash is empty.</h2><p>Deleted notes stay on this device for 30 days. Expired notes are only permanently removed when you choose to purge them.</p></div> : <ul className="note-list">{notes.map((note) => {
  const deletedAt = note.deletedAt ?? note.updatedAt;
  const eligibleAt = deletedAt + RETENTION_MS;
  const eligible = Date.now() >= eligibleAt;
  return <li key={note.id} className="note-card trash-card"><div className="note-card-main"><h2>{note.title || "Untitled note"}</h2><p>{note.body || "No content"}</p><div className="trash-meta"><time dateTime={new Date(deletedAt).toISOString()}>Deleted {formatDate(deletedAt)}</time><span>{eligible ? "Eligible for purge" : `Eligible ${formatDate(eligibleAt)}`}</span></div></div><button type="button" className="restore-button" onClick={() => onRestore(note.id)}>Restore</button></li>;
})}</ul>;
