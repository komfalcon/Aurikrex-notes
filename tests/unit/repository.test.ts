import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createNote, getNeuronLedger, purgeExpired, recordNeuronUsage, softDeleteNote, updateNote, updateNoteIfContentMatches } from "@/lib/notes/repository";

describe("purgeExpired", () => {
  beforeEach(async () => {
    await db.delete();
    db.close();
    await db.open();
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  it("removes notes deleted more than 30 days ago", async () => {
    vi.setSystemTime(new Date("2026-01-31T00:00:00.000Z"));
    const note = await createNote({ title: "old" });
    await softDeleteNote(note.id);
    vi.setSystemTime(new Date("2026-03-05T00:00:00.000Z"));
    const removed = await purgeExpired(Date.now());
    expect(removed).toBe(1);
    await expect(db.notes.get(note.id)).resolves.toBeUndefined();
  });

  it("keeps notes deleted less than 30 days ago", async () => {
    vi.setSystemTime(new Date("2026-01-31T00:00:00.000Z"));
    const note = await createNote({ title: "recent" });
    await softDeleteNote(note.id);
    vi.setSystemTime(new Date("2026-02-10T00:00:00.000Z"));
    const removed = await purgeExpired(Date.now());
    expect(removed).toBe(0);
    await expect(db.notes.get(note.id)).resolves.toBeTruthy();
  });
});

describe("daily Neurons ledger", () => {
  beforeEach(async () => {
    await db.delete();
    db.close();
    await db.open();
  });

  it("tracks usage per account and starts a fresh ledger on the next UTC day", async () => {
    const firstDay = Date.parse("2026-11-13T23:59:00.000Z");
    const used = await recordNeuronUsage("account-a", 12.5, firstDay);
    expect(used.usedNeurons).toBe(12.5);
    expect((await getNeuronLedger("account-a", firstDay)).usedNeurons).toBe(12.5);
    expect((await getNeuronLedger("account-a", firstDay + 120_000)).usedNeurons).toBe(0);
    expect((await getNeuronLedger("account-b", firstDay)).usedNeurons).toBe(0);
  });
});

describe("content-checked note updates", () => {
  beforeEach(async () => {
    await db.delete();
    db.close();
    await db.open();
  });

  it("refuses a stale AI result after the note body has changed", async () => {
    const note = await createNote({ title: "Original title", body: "Original body" });
    await updateNote(note.id, { body: "The user’s newer edit" });

    const updated = await updateNoteIfContentMatches(note.id, { body: "Original body" }, { body: "AI summary" });

    expect(updated).toBeNull();
    await expect(db.notes.get(note.id)).resolves.toMatchObject({ body: "The user’s newer edit" });
  });

  it("applies a title/body update without reverting unrelated current metadata", async () => {
    const note = await createNote({ body: "Original body", tags: ["initial"] });
    await updateNote(note.id, { title: "Current title", tags: ["current"] });

    const updated = await updateNoteIfContentMatches(note.id, { body: "Original body" }, { body: "AI summary" });

    expect(updated).toMatchObject({ title: "Current title", body: "AI summary", tags: ["current"] });
  });
});

afterEach(() => {
  vi.useRealTimers();
});
