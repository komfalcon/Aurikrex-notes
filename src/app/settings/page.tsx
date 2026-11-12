"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SettingsPanel } from "@/components/SettingsPanel";
import { exportAll, getLastBackupAt, importJson } from "@/lib/notes/repository";

export default function SettingsPage() {
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLastBackupAt(await getLastBackupAt());
    };

    void load();
  }, []);

  return (
    <AppShell title="Settings">
      <SettingsPanel
        lastBackupAt={lastBackupAt}
        onExport={async () => {
          await exportAll();
          setLastBackupAt(await getLastBackupAt());
        }}
        onImport={async (text) => {
          await importJson(text);
        }}
      />
    </AppShell>
  );
}
