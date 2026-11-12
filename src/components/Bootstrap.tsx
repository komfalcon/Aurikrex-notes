"use client";

import { useEffect } from "react";
import { purgeExpired } from "@/lib/notes/repository";
import { useStoragePersistence } from "@/lib/notes/useStoragePersistence";

export const Bootstrap = (): null => {
  useStoragePersistence();

  useEffect(() => {
    void purgeExpired();

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
};
