"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createNote } from "@/lib/notes/repository";

export const NewClient = () => {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const run = async (): Promise<void> => {
      const title = params.get("title") ?? "";
      const text = params.get("text") ?? "";
      const url = params.get("url") ?? "";
      const body = [text, url].filter((item) => item.length > 0).join("\n\n");
      const note = await createNote({ title, body });
      router.replace(`/note?id=${note.id}`);
    };

    void run();
  }, [params, router]);

  return <p className="p-4">Creating note...</p>;
};
