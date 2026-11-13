"use client";

import type { Note } from "@/lib/db/schemas";
import { listNotes, searchNotes } from "@/lib/notes/repository";
import { cosineSimilarity, embedText } from "./embeddings";

export const semanticSearchNotes = async (query: string): Promise<Note[]> => {
  const normalized = query.trim();
  if (!normalized) return listNotes(false);

  try {
    const queryEmbedding = await embedText(normalized);
    const notes = await listNotes(false);
    const semantic = notes
      .filter((note) => note.embedding)
      .map((note) => ({ note, score: cosineSimilarity(queryEmbedding, note.embedding ?? []) }))
      .filter((item) => item.score > 0.6)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.note);
    if (semantic.length > 0) return semantic;
  } catch {
    // The model is optional; lexical search remains available offline and during first load.
  }

  return searchNotes(normalized);
};
