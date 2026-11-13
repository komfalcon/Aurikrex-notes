"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createNote } from "@/lib/notes/repository";

export const NewClient = () => {
  const router = useRouter();
  const params = useSearchParams();
  const title = params.get("title") ?? "";
  const text = params.get("text") ?? "";
  const url = params.get("url") ?? "";
  const body = [text, url].filter((item) => item.length > 0).join("\n\n");
  const [state, setState] = useState<"creating" | "error">("creating");
  const started = useRef(false);

  const create = useCallback(async (): Promise<void> => {
    setState("creating");
    try {
      const note = await createNote({ title, body });
      router.replace(`/note?id=${note.id}`);
    } catch {
      setState("error");
      started.current = false;
    }
  }, [body, router, title]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void create();
  }, [create]);

  return <AppShell title={state === "creating" ? "New note" : "Couldn’t create note"}>
    {state === "creating" ? <div className="route-state" role="status"><span className="loading-spinner" /><h2>Opening a fresh note…</h2><p>Your note is being created in this device’s IndexedDB.</p></div> : <div className="route-state" role="alert"><h2>Your note wasn’t created.</h2><p>It stays on this device, and no internet connection is needed. Check local storage and try again.</p><button type="button" className="empty-action" onClick={() => { started.current = true; void create(); }}>Try again</button><Link className="text-link" href="/">Back to notes</Link></div>}
  </AppShell>;
};
