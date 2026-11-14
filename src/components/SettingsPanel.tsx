"use client";

import { useEffect, useState } from "react";
import type { CloudflareCredentials, NeuronBalance } from "@/lib/ai/cloudflare";

type SettingsPanelProps = {
  lastBackupAt: number | null;
  onExport: () => void;
  onImport: (text: string) => Promise<void>;
  credentials: CloudflareCredentials | null;
  balance: NeuronBalance | null;
  onSaveCredentials: (credentials: CloudflareCredentials) => Promise<void>;
  onForgetCredentials: () => Promise<void>;
};

const formatNeurons = (value: number): string => Math.floor(value).toLocaleString();
const formatCountdown = (milliseconds: number): string => {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const SettingsPanel = ({ lastBackupAt, onExport, onImport, credentials, balance, onSaveCredentials, onForgetCredentials }: SettingsPanelProps) => {
  const [accountId, setAccountId] = useState(credentials?.accountId ?? "");
  const [apiToken, setApiToken] = useState(credentials?.apiToken ?? "");
  const [saved, setSaved] = useState(Boolean(credentials));
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setAccountId(credentials?.accountId ?? "");
    setApiToken(credentials?.apiToken ?? "");
    setSaved(Boolean(credentials));
  }, [credentials]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const save = async (): Promise<void> => {
    setSaving(true);
    await onSaveCredentials({ accountId, apiToken });
    setSaved(true);
    setSaving(false);
  };

  return <div className="settings-wrap">
    <section className="settings-card">
      <div><p className="settings-label">Your data</p><h2>Keep your notes yours.</h2><p className="settings-copy">Everything is stored on this device. Export a backup whenever you like.</p></div>
      <div className="settings-actions data-actions">
        <button type="button" className="primary-button" onClick={onExport}>Export notes</button>
        <label className="secondary-button"><span>Import backup</span><input type="file" accept="application/json" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; await onImport(await file.text()); event.target.value = ""; }} /></label>
      </div>
    </section>
    <section className="settings-card">
      <div><p className="settings-label">Cloudflare Workers AI</p><h2>Bring your own key.</h2><p className="settings-copy">Use the Free-plan GLM-4.7-Flash model. Your credentials stay in this browser and are sent only to Cloudflare.</p></div>
      <label className="settings-field"><span>Account ID</span><input aria-label="Cloudflare Account ID" value={accountId} onChange={(event) => { setAccountId(event.target.value); setSaved(false); }} placeholder="Cloudflare account ID" autoComplete="off" /></label>
      <label className="settings-field"><span>API token</span><input aria-label="Cloudflare API Token" type="password" value={apiToken} onChange={(event) => { setApiToken(event.target.value); setSaved(false); }} placeholder="Workers AI API token" autoComplete="off" /></label>
      <div className="settings-actions"><button type="button" className="primary-button" disabled={saving || !accountId.trim() || !apiToken.trim()} onClick={() => void save()}>{saving ? "Saving…" : saved ? "Credentials saved" : "Save credentials"}</button>{credentials && <button type="button" className="secondary-button" onClick={() => void onForgetCredentials()}>Forget credentials</button>}</div>
      {balance && <div className="neuron-card"><p className="settings-label">Workers AI free allowance</p><strong>{formatNeurons(balance.remaining)} / {formatNeurons(balance.allowance)} Neurons remaining today</strong><span>Estimated from this app’s requests · resets in {formatCountdown(balance.resetAt - now)} at 00:00 UTC</span><a href="https://dash.cloudflare.com/?to=/:account/ai/workers-ai" target="_blank" rel="noreferrer">Open Cloudflare usage dashboard</a></div>}
    </section>
    <section className="settings-card quiet"><p className="settings-label">Storage</p><p className="settings-copy">Offline-first IndexedDB storage is active.</p><p className="backup-time">Last backup: <strong>{lastBackupAt ? new Date(lastBackupAt).toLocaleString() : "Never"}</strong></p></section>
  </div>;
};
