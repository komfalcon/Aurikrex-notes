"use client";

import { useState } from "react";
import type { ImportResult } from "@/lib/notes/repository";

type SettingsPanelProps = {
  lastBackupAt: number | null;
  onExport: () => Promise<void>;
  onImport: (text: string) => Promise<ImportResult>;
};
type PendingImport = { fileName: string; text: string };
type StatusMessage = { kind: "success" | "error"; text: string };

export const SettingsPanel = ({ lastBackupAt, onExport, onImport }: SettingsPanelProps) => {
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const exportNotes = async (): Promise<void> => {
    setBusy("export");
    setMessage(null);
    try {
      await onExport();
      setMessage({ kind: "success", text: "Backup file generated. Check your downloads before relying on it as a separate copy." });
    } catch {
      setMessage({ kind: "error", text: "The backup could not be generated. Your notes remain in this device’s IndexedDB." });
    } finally {
      setBusy(null);
    }
  };

  const readImportFile = async (file: File | undefined): Promise<void> => {
    setMessage(null);
    if (!file) return;
    try {
      setPendingImport({ fileName: file.name, text: await file.text() });
    } catch {
      setMessage({ kind: "error", text: "Couldn’t read that file. Choose a valid Aurikrex Notes JSON backup." });
    }
  };

  const applyImport = async (): Promise<void> => {
    if (!pendingImport) return;
    setBusy("import");
    setMessage(null);
    try {
      const result = await onImport(pendingImport.text);
      setMessage({ kind: "success", text: `Import complete: ${result.added} added, ${result.updated} updated, ${result.skipped} unchanged.` });
      setPendingImport(null);
    } catch {
      setMessage({ kind: "error", text: "Import failed. Choose a valid Aurikrex Notes JSON backup; your current local notes were not intentionally replaced." });
    } finally {
      setBusy(null);
    }
  };

  return <div className="settings-wrap">
    <section className="settings-card">
      <div><p className="settings-label">Your data</p><h2>Private notes, stored locally.</h2><p className="settings-copy">Notes live in IndexedDB on this device and work without internet. Export a JSON file to keep a separate backup.</p></div>
      <button type="button" className="primary-button" onClick={() => void exportNotes()} disabled={busy !== null}>{busy === "export" ? "Preparing backup…" : "Export notes"}</button>
      <label className="secondary-button" htmlFor="backup-file">{busy === "import" ? "Importing…" : "Choose backup to import"}</label>
      <input id="backup-file" className="backup-file-input" type="file" accept="application/json,.json" aria-label="Choose an Aurikrex Notes backup file" disabled={busy !== null} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void readImportFile(file); }} />
      {pendingImport ? <div className="import-review" role="alert"><strong>Review this backup</strong><p><span className="import-file-name">{pendingImport.fileName}</span> may update notes with matching IDs if the backup has newer edits. Importing merges into local IndexedDB and can’t be undone here.</p><div className="import-actions"><button type="button" className="quiet-button" onClick={() => setPendingImport(null)} disabled={busy !== null}>Cancel</button><button type="button" className="primary-button" onClick={() => void applyImport()} disabled={busy !== null}>{busy === "import" ? "Importing…" : "Import backup"}</button></div></div> : null}
      {message ? <p className={`inline-message ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}
    </section>
    <section className="settings-card quiet"><p className="settings-label">On this device</p><p className="settings-copy">Aurikrex Notes uses the browser’s IndexedDB database. Cloud hosting serves the app shell; note content stays local.</p><p className="backup-time">Last export generated: <strong>{lastBackupAt ? new Date(lastBackupAt).toLocaleString() : "Never"}</strong></p></section>
  </div>;
};
