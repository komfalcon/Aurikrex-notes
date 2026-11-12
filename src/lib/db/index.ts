import Dexie, { type Table } from "dexie";
import type { Note, SettingsRecord } from "./schemas";

export class AurikrexDB extends Dexie {
  notes!: Table<Note, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super("aurikrex-notes");
    this.version(1).stores({
      notes: "id,updatedAt,deletedAt,pinned,*tags",
      settings: "id"
    });
  }
}

export const db = new AurikrexDB();
