import { z } from "zod";
import { getNeuronLedger, recordNeuronUsage } from "@/lib/notes/repository";
import { DAILY_NEURON_ALLOWANCE, INPUT_NEURONS_PER_MILLION, OUTPUT_NEURONS_PER_MILLION } from "@/lib/ai/modelConfig";

const CREDENTIALS_KEY = "aurikrex-notes.cloudflare.credentials";
export { CLOUDFLARE_MODEL, DAILY_NEURON_ALLOWANCE } from "@/lib/ai/modelConfig";

const CredentialsSchema = z.object({ accountId: z.string().trim().regex(/^[a-f\d]{32}$/i), apiToken: z.string().trim().min(1) });
const CloudflareResponseSchema = z.object({
  success: z.boolean().optional(),
  errors: z.array(z.unknown()).optional(),
  result: z.unknown().optional()
});
const UsageSchema = z.object({ prompt_tokens: z.number().nonnegative().optional(), completion_tokens: z.number().nonnegative().optional(), total_tokens: z.number().nonnegative().optional() });
const TextResultSchema = z.object({ response: z.string().nullish(), choices: z.array(z.object({ message: z.object({ content: z.string().nullish() }).nullish(), finish_reason: z.string().nullish() }).passthrough()).optional(), usage: UsageSchema.optional() }).passthrough();

export type CloudflareCredentials = z.infer<typeof CredentialsSchema>;
export type NeuronBalance = { used: number; remaining: number; allowance: number; resetAt: number; requestCount: number };

type TextResult = z.infer<typeof TextResultSchema>;

const parseCredentials = (credentials: CloudflareCredentials): CloudflareCredentials => {
  const parsed = CredentialsSchema.safeParse(credentials);
  if (parsed.success) return parsed.data;
  if (parsed.error.issues.some((issue) => issue.path[0] === "accountId")) {
    throw new Error("Enter a valid 32-character hexadecimal Cloudflare Account ID.");
  }
  throw new Error("Enter both a Cloudflare Account ID and API token.");
};

export const getCloudflareCredentials = (): CloudflareCredentials | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = CredentialsSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const saveCloudflareCredentials = (credentials: CloudflareCredentials): void => {
  if (typeof window === "undefined") throw new Error("Credentials can only be saved in the browser.");
  const parsed = parseCredentials(credentials);
  const serialized = JSON.stringify(parsed);
  try {
    window.localStorage.setItem(CREDENTIALS_KEY, serialized);
    const saved = window.localStorage.getItem(CREDENTIALS_KEY);
    if (saved !== serialized) throw new Error("Storage read-back did not match.");
  } catch {
    throw new Error("Could not save credentials in this browser. Check that site storage is allowed, then try again.");
  }
};

export const clearCloudflareCredentials = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CREDENTIALS_KEY);
    if (window.localStorage.getItem(CREDENTIALS_KEY) !== null) throw new Error("Storage read-back did not clear.");
  } catch {
    throw new Error("Could not remove credentials from this browser. Check that site storage is allowed, then try again.");
  }
};

const nextUtcMidnight = (now: number): number => {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
};

export const estimateNeurons = (promptTokens: number, completionTokens: number): number =>
  (promptTokens * INPUT_NEURONS_PER_MILLION + completionTokens * OUTPUT_NEURONS_PER_MILLION) / 1_000_000;

export const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.trim().length / 4));

const responseText = (result: TextResult): string => {
  const direct = result.response?.trim();
  if (direct) return direct;
  return result.choices?.[0]?.message?.content?.trim() ?? "";
};

const providerErrorMessage = (payload: z.infer<typeof CloudflareResponseSchema>): string => {
  for (const error of payload.errors ?? []) {
    if (typeof error === "string" && error.trim()) return error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    if (error && typeof error === "object") {
      try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== "{}") return serialized;
      } catch {
        // Fall through to the actionable default below.
      }
    }
  }
  return "Check the Cloudflare account ID and Workers AI Read token permission in Settings.";
};

export const runCloudflareText = async (messages: Array<{ role: "system" | "user"; content: string }>): Promise<{ text: string; balance: NeuronBalance }> => {
  const credentials = getCloudflareCredentials();
  if (!credentials) throw new Error("Cloudflare credentials are not configured.");

  let response: Response;
  try {
    response = await fetch("/api/ai", {
      method: "POST",
      headers: { Authorization: `Bearer ${credentials.apiToken}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ accountId: credentials.accountId, messages })
    });
  } catch {
    throw new Error("A-Notes could not reach its AI proxy. Check your connection and try again.");
  }

  let rawPayload: unknown;
  try {
    rawPayload = await response.json() as unknown;
  } catch {
    throw new Error("Cloudflare AI returned an unreadable response. Try again when you are online.");
  }
  const parsedPayload = CloudflareResponseSchema.safeParse(rawPayload);
  if (!parsedPayload.success) throw new Error("Cloudflare AI returned an unexpected response. Try again.");
  const payload = parsedPayload.data;
  if (!response.ok || payload.success === false) {
    throw new Error(`Cloudflare AI request failed (${response.status}). ${providerErrorMessage(payload)}`);
  }

  const parsedResult = TextResultSchema.safeParse(payload.result ?? {});
  if (!parsedResult.success) throw new Error("Cloudflare AI returned an unexpected text result. Try again.");
  const result = parsedResult.data;
  const text = responseText(result);
  if (!text) throw new Error("The AI model returned no text. Try again, or check your Workers AI model access.");
  const promptTokens = result.usage?.prompt_tokens ?? messages.reduce((sum, message) => sum + estimateTokens(message.content), 0);
  const completionTokens = result.usage?.completion_tokens ?? estimateTokens(text);
  const neurons = estimateNeurons(promptTokens, completionTokens);
  const ledger = await recordNeuronUsage(credentials.accountId, neurons);
  const now = Date.now();
  return {
    text,
    balance: {
      used: ledger.usedNeurons,
      remaining: Math.max(0, DAILY_NEURON_ALLOWANCE - ledger.usedNeurons),
      allowance: DAILY_NEURON_ALLOWANCE,
      resetAt: nextUtcMidnight(now),
      requestCount: ledger.requestCount
    }
  };
};

export const getNeuronBalance = async (): Promise<NeuronBalance | null> => {
  const credentials = getCloudflareCredentials();
  if (!credentials) return null;
  const ledger = await getNeuronLedger(credentials.accountId);
  return {
    used: ledger.usedNeurons,
    remaining: Math.max(0, DAILY_NEURON_ALLOWANCE - ledger.usedNeurons),
    allowance: DAILY_NEURON_ALLOWANCE,
    resetAt: nextUtcMidnight(Date.now()),
    requestCount: ledger.requestCount
  };
};
