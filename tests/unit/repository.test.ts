import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createNote, getNeuronLedger, purgeExpired, recordNeuronUsage, softDeleteNote } from "@/lib/notes/repository";

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

afterEach(() => {
  vi.useRealTimers();
});

describe("semantic note search", () => {
  beforeEach(async () => {
    await db.delete();
    db.close();
    await db.open();
  });

  it("returns only notes above the cosine similarity threshold", async () => {
    const relevant = await createNote({ title: "Relevant" });
    const unrelated = await createNote({ title: "Unrelated" });
    await updateNoteEmbedding(relevant.id, [1, 0]);
    await updateNoteEmbedding(unrelated.id, [0, 1]);

    const matches = await searchNotes("semantic query", [1, 0]);

    expect(matches.map((note) => note.id)).toEqual([relevant.id]);
  });
});

describe("Cloudflare settings", () => {
  beforeEach(async () => {
    await db.delete();
    db.close();
    await db.open();
  });

  it("stores BYOK credentials in the local settings table", async () => {
    await saveCloudflareCredentials({ accountId: " account-123 ", apiToken: " token-456 " });

    await expect(getCloudflareCredentials()).resolves.toEqual({ accountId: "account-123", apiToken: "token-456" });
  });
});
