"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SettingsPanel } from "@/components/SettingsPanel";
import type { CloudflareCredentials } from "@/lib/ai/cloudflareAi";
import { exportAll, getCloudflareCredentials, getLastBackupAt, importJson, saveCloudflareCredentials } from "@/lib/notes/repository";

const emptyCredentials: CloudflareCredentials = { accountId: "", apiToken: "" };

export default function SettingsPage() {
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<CloudflareCredentials>(emptyCredentials);

  useEffect(() => {
    let active = true;
    void Promise.all([getLastBackupAt(), getCloudflareCredentials()]).then(([backupAt, savedCredentials]) => {
      if (!active) return;
      setLastBackupAt(backupAt);
      setCredentials(savedCredentials);
    }).catch(() => {
      if (active) {
        setLastBackupAt(null);
        setCredentials(emptyCredentials);
      }
    });
    return () => { active = false; };
  }, []);

  return <AppShell title="Settings">
    <SettingsPanel
      lastBackupAt={lastBackupAt}
      credentials={credentials}
      onSaveCloudflare={async (nextCredentials) => {
        const saved = await saveCloudflareCredentials(nextCredentials);
        setCredentials({ accountId: saved.cloudflareAccountId, apiToken: saved.cloudflareApiToken });
      }}
      onExport={async () => {
        await exportAll();
        setLastBackupAt(await getLastBackupAt());
      }}
      onImport={async (text) => await importJson(text)}
    />
  </AppShell>;
}
