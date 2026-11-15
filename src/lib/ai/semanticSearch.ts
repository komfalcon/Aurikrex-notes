"use client";

import type { Note } from "@/lib/db/schemas";
import { listNotes, searchNotes } from "@/lib/notes/repository";
import { cosineSimilarity, embedText } from "./embeddings";

export type SemanticSearchResult = {
  notes: Note[];
  mode: "semantic" | "text";
  message?: string;
};

export const semanticSearchNotes = async (query: string): Promise<SemanticSearchResult> => {
  const normalized = query.trim();
  if (!normalized) return { notes: await listNotes(false), mode: "text" };

  try {
    const queryEmbedding = await embedText(normalized);
    const notes = await listNotes(false);
    const indexedNotes = notes.filter((note) => note.embedding !== null);
    if (indexedNotes.length === 0) {
      return {
        notes: await searchNotes(normalized),
        mode: "text",
        message: "Your notes are not semantically indexed yet. Showing text matches while the index is prepared.",
      };
    }
    const semantic = notes
      .filter((note) => note.embedding)
      .map((note) => ({ note, score: cosineSimilarity(queryEmbedding, note.embedding ?? []) }))
      .filter((item) => item.score > 0.6)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.note);
    if (semantic.length > 0) return { notes: semantic, mode: "semantic" };
    return {
      notes: await searchNotes(normalized),
      mode: "text",
      message: "No meaning-based matches. Showing text matches instead.",
    };
  } catch {
    return {
      notes: await searchNotes(normalized),
      mode: "text",
      message: "Semantic search could not load its on-device model. Showing text matches; try again while online.",
    };
  }
};
