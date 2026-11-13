"use client";

import { useEffect } from "react";
import { useStoragePersistence } from "@/lib/notes/useStoragePersistence";

export const Bootstrap = (): null => {
  useStoragePersistence();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
};
