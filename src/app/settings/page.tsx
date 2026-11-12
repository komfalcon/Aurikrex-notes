"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SettingsPanel } from "@/components/SettingsPanel";
import { exportAll, getLastBackupAt, importJson } from "@/lib/notes/repository";

export default function SettingsPage() {
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void getLastBackupAt().then((value) => {
      if (active) setLastBackupAt(value);
    }).catch(() => {
      if (active) setLastBackupAt(null);
    });
    return () => { active = false; };
  }, []);

  return <AppShell title="Settings">
    <SettingsPanel
      lastBackupAt={lastBackupAt}
      onExport={async () => {
        await exportAll();
        setLastBackupAt(await getLastBackupAt());
      }}
      onImport={async (text) => await importJson(text)}
    />
  </AppShell>;
}
