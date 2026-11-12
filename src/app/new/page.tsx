import { Suspense } from "react";
import { NewClient } from "./NewClient";

export default function NewPage() {
  return (
    <Suspense fallback={<p className="p-4">Creating note...</p>}>
      <NewClient />
    </Suspense>
  );
}
