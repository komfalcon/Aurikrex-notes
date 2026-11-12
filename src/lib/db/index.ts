import Dexie, { type Table } from "dexie";
import type { Note, SettingsRecord } from "./schemas";

const defaultSettings: SettingsRecord = {
  id: "default",
  lastBackupAt: 0,
  cloudflareAccountId: "",
  cloudflareApiToken: "",
};

export class AurikrexDB extends Dexie {
  notes!: Table<Note, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super("aurikrex-notes");
    this.version(1).stores({
      notes: "id,updatedAt,deletedAt,pinned,*tags",
      settings: "id",
    });
    this.version(2)
      .stores({
        notes: "id,updatedAt,deletedAt,pinned,*tags",
        settings: "id",
      })
      .upgrade(async (transaction) => {
        await transaction.table<Note>("notes").toCollection().modify((note) => {
          note.embedding ??= null;
        });
        const settingsTable = transaction.table<SettingsRecord>("settings");
        const existing = await settingsTable.get("default");
        await settingsTable.put({ ...defaultSettings, ...existing });
      });
  }
}

export const db = new AurikrexDB();
