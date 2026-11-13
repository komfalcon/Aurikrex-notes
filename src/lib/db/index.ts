import Dexie, { type Table } from "dexie";
import type { NeuronLedger, Note, SettingsRecord } from "./schemas";

const defaultSettings: SettingsRecord = {
  id: "default",
  lastBackupAt: 0,
  cloudflareAccountId: "",
  cloudflareApiToken: "",
};

export class AurikrexDB extends Dexie {
  notes!: Table<Note, string>;
  settings!: Table<SettingsRecord, string>;
  neuronLedger!: Table<NeuronLedger, string>;

  constructor() {
    super("aurikrex-notes");
    this.version(1).stores({
      notes: "id,updatedAt,deletedAt,pinned,*tags",
      settings: "id",
    });
    this.version(2).stores({
      notes: "id,updatedAt,deletedAt,pinned,*tags",
      settings: "id",
      neuronLedger: "id,accountId,utcDate"
    }).upgrade(async (transaction) => {
      await transaction.table("notes").toCollection().modify((note: Note) => {
        note.embedding ??= null;
      });
    });
  }
}

export const db = new AurikrexDB();
