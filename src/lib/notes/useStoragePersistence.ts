"use client";

import { useEffect, useState } from "react";

type PersistenceState = "idle" | "granted" | "denied" | "unsupported";

export const useStoragePersistence = (): PersistenceState => {
  const [state, setState] = useState<PersistenceState>("idle");

  useEffect(() => {
    const run = async (): Promise<void> => {
      if (!("storage" in navigator) || !("persist" in navigator.storage)) {
        setState("unsupported");
        return;
      }

      const granted = await navigator.storage.persist();
      setState(granted ? "granted" : "denied");
    };

    void run();
  }, []);

  return state;
};
