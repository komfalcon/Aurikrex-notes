"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SettingsPanel } from "@/components/SettingsPanel";
import { getCloudflareCredentials, getNeuronBalance, saveCloudflareCredentials, clearCloudflareCredentials, type CloudflareCredentials, type NeuronBalance } from "@/lib/ai/cloudflare";
import { exportAll, getLastBackupAt, importJson } from "@/lib/notes/repository";

export default function SettingsPage() {
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<CloudflareCredentials | null>(null);
  const [balance, setBalance] = useState<NeuronBalance | null>(null);

  const refreshAi = async (): Promise<void> => {
    setCredentials(getCloudflareCredentials());
    setBalance(await getNeuronBalance());
  };

  useEffect(() => {
    void getLastBackupAt().then(setLastBackupAt);
    void refreshAi();
  }, []);

  return (
    <AppShell title="Settings">
      <SettingsPanel
        lastBackupAt={lastBackupAt}
        credentials={credentials}
        balance={balance}
        onExport={async () => { await exportAll(); setLastBackupAt(await getLastBackupAt()); }}
        onImport={async (text) => { await importJson(text); }}
        onSaveCredentials={async (next) => { saveCloudflareCredentials(next); await refreshAi(); }}
        onForgetCredentials={async () => { clearCloudflareCredentials(); await refreshAi(); }}
      />
    </AppShell>
  );
}
