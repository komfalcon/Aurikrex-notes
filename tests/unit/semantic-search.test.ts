import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/lib/db/schemas";

const mocks = vi.hoisted(() => ({
  listNotes: vi.fn(),
  searchNotes: vi.fn(),
  embedText: vi.fn(),
  cosineSimilarity: vi.fn(),
}));

vi.mock("@/lib/notes/repository", () => ({
  listNotes: mocks.listNotes,
  searchNotes: mocks.searchNotes,
}));
vi.mock("@/lib/ai/embeddings", () => ({
  embedText: mocks.embedText,
  cosineSimilarity: mocks.cosineSimilarity,
}));

import { semanticSearchNotes } from "@/lib/ai/semanticSearch";

const makeNote = (id: string, embedding: number[] | null): Note => ({
  id,
  title: `Note ${id}`,
  body: "Example note text",
  tags: [],
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
  version: 1,
  embedding,
});

describe("semantic search", () => {
  const relevant = makeNote("relevant", [1, 0]);
  const unrelated = makeNote("unrelated", [0, 1]);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listNotes.mockResolvedValue([relevant, unrelated]);
    mocks.searchNotes.mockResolvedValue([unrelated]);
    mocks.embedText.mockResolvedValue([1, 0]);
    mocks.cosineSimilarity.mockImplementation((left: number[], right: number[]) => left[0] === right[0] ? 1 : 0);
  });

  it("returns semantic matches ranked by cosine similarity", async () => {
    const result = await semanticSearchNotes("similar idea");
    expect(result.mode).toBe("semantic");
    expect(result.notes).toEqual([relevant]);
    expect(result.message).toBeUndefined();
  });

  it("reports when the on-device model fails and preserves text-search results", async () => {
    mocks.embedText.mockRejectedValue(new Error("CDN unavailable"));
    const result = await semanticSearchNotes("query text");
    expect(result.mode).toBe("text");
    expect(result.notes).toEqual([unrelated]);
    expect(result.message).toContain("on-device model");
    expect(mocks.searchNotes).toHaveBeenCalledWith("query text");
  });

  it("reports when saved notes do not yet have embeddings", async () => {
    mocks.listNotes.mockResolvedValue([makeNote("unindexed", null)]);
    const result = await semanticSearchNotes("query text");
    expect(result.mode).toBe("text");
    expect(result.message).toContain("not semantically indexed yet");
  });
});
