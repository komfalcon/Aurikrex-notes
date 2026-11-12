import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { importJson } from "@/lib/notes/repository";

describe("importJson validation", () => {
  beforeEach(async () => {
    await db.delete();
    db.close();
    await db.open();
  });

  it("throws for invalid payload", async () => {
    const invalid = JSON.stringify({ app: "wrong", schemaVersion: 1, exportedAt: Date.now(), notes: [] });
    await expect(importJson(invalid)).rejects.toThrow();
  });
});
