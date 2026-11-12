type SettingsPanelProps = {
  lastBackupAt: number | null;
  onExport: () => void;
  onImport: (text: string) => Promise<void>;
};

export const SettingsPanel = ({ lastBackupAt, onExport, onImport }: SettingsPanelProps)=> {
  return (
    <div className="p-4 space-y-4">
      <button type="button" className="px-3 py-2 rounded bg-accent" onClick={onExport}>
        Export notes
      </button>
      <label className="block">
        <span className="text-sm text-muted">Import JSON</span>
        <input
          className="block mt-2 text-sm"
          type="file"
          accept="application/json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            await onImport(await file.text());
            event.target.value = "";
          }}
        />
      </label>
      <p className="text-sm text-muted">
        Last backup: {lastBackupAt ? new Date(lastBackupAt).toLocaleString() : "Never"}
      </p>
    </div>
  );
};
