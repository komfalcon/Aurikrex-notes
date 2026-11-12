import { Suspense } from "react";
import { NoteClient } from "./NoteClient";

export default function NotePage() {
  return (
    <Suspense fallback={<p className="p-4">Loading note...</p>}>
      <NoteClient />
    </Suspense>
  );
}
