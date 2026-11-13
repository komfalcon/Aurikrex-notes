"use client";

import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import type { Note } from "@/lib/db/schemas";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

const getExtractor = (): Promise<FeatureExtractionPipeline> => {
  extractorPromise ??= (async () => {
    const { env, pipeline } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    return pipeline("feature-extraction", MODEL_ID);
  })();
  return extractorPromise;
};

export const embedText = async (text: string): Promise<number[]> => {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Iterable<number>);
};

export const cosineSimilarity = (left: number[], right: number[]): number => {
  if (left.length === 0 || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

export const noteSearchText = (note: Note): string => [note.title, note.body, note.tags.join(" ")].filter(Boolean).join("\n");

export const rankRelatedNotes = (note: Note, candidates: Note[]): Array<{ note: Note; score: number }> => {
  if (!note.embedding) return [];
  return candidates
    .filter((candidate) => candidate.id !== note.id && candidate.embedding)
    .map((candidate) => ({ note: candidate, score: cosineSimilarity(note.embedding ?? [], candidate.embedding ?? []) }))
    .filter((item) => item.score > 0.2)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
};
