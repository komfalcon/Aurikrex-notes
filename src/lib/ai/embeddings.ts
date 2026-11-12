export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

type TransformersModule = typeof import("@huggingface/transformers");
type EmbeddingPipeline = import("@huggingface/transformers").FeatureExtractionPipeline;

let extractorPromise: Promise<EmbeddingPipeline> | null = null;

const getExtractor = async (): Promise<EmbeddingPipeline> => {
  if (typeof window === "undefined") {
    throw new Error("Local embeddings are only available in the browser.");
  }

  const transformers: TransformersModule = await import("@huggingface/transformers");
  transformers.env.allowLocalModels = false;
  transformers.env.useBrowserCache = true;

  if (!extractorPromise) {
    extractorPromise = transformers.pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" }).catch((error: unknown) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const normalized = text.trim();
  if (normalized.length === 0) return [];

  const extractor = await getExtractor();
  const output = await extractor(normalized, { pooling: "mean", normalize: true });
  return Array.from(output.data, (value) => Number(value));
};
