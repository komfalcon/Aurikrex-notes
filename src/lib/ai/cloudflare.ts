import { z } from "zod";
import { getNeuronLedger, recordNeuronUsage } from "@/lib/notes/repository";

export const CLOUDFLARE_MODEL = "@cf/zai-org/glm-4.7-flash";
export const DAILY_NEURON_ALLOWANCE = 10_000;
const CREDENTIALS_KEY = "aurikrex-notes.cloudflare.credentials";
const CLOUDFLARE_AI_URL = "https://api.cloudflare.com/client/v4/accounts";

const CredentialsSchema = z.object({ accountId: z.string().trim().min(1), apiToken: z.string().trim().min(1) });
const CloudflareResponseSchema = z.object({
  success: z.boolean().optional(),
  errors: z.array(z.unknown()).optional(),
  result: z.unknown().optional()
});
const UsageSchema = z.object({ prompt_tokens: z.number().nonnegative().optional(), completion_tokens: z.number().nonnegative().optional(), total_tokens: z.number().nonnegative().optional() });
const TextResultSchema = z.object({ response: z.string().optional(), choices: z.array(z.object({ message: z.object({ content: z.string().optional() }).optional() })).optional(), usage: UsageSchema.optional() });

export type CloudflareCredentials = z.infer<typeof CredentialsSchema>;
export type NeuronBalance = { used: number; remaining: number; allowance: number; resetAt: number; requestCount: number };

type TextResult = z.infer<typeof TextResultSchema>;

export const getCloudflareCredentials = (): CloudflareCredentials | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CREDENTIALS_KEY);
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  const parsed = CredentialsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const saveCloudflareCredentials = (credentials: CloudflareCredentials): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(CredentialsSchema.parse(credentials)));
};

export const clearCloudflareCredentials = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CREDENTIALS_KEY);
};

const nextUtcMidnight = (now: number): number => {
  const date = new Date(now);
  const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return next;
};

export const estimateNeurons = (promptTokens: number, completionTokens: number): number => {
  const inputRate = 0.0605 / 0.011;
  const outputRate = 0.4 / 0.011;
  return (promptTokens * inputRate + completionTokens * outputRate) / 1000;
};

export const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.trim().length / 4));

const responseText = (result: TextResult): string => {
  const direct = result.response?.trim();
  if (direct) return direct;
  return result.choices?.[0]?.message?.content?.trim() ?? "";
};

export const runCloudflareText = async (messages: Array<{ role: "system" | "user"; content: string }>): Promise<{ text: string; balance: NeuronBalance }> => {
  const credentials = getCloudflareCredentials();
  if (!credentials) throw new Error("Cloudflare credentials are not configured.");

  const response = await fetch(`${CLOUDFLARE_AI_URL}/${encodeURIComponent(credentials.accountId)}/ai/run/${CLOUDFLARE_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credentials.apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_tokens: 256, temperature: 0.2 })
  });

  const payload = CloudflareResponseSchema.parse(await response.json());
  if (!response.ok || payload.success === false) throw new Error("Cloudflare AI request failed.");

  const result = TextResultSchema.parse(payload.result ?? {});
  const promptTokens = result.usage?.prompt_tokens ?? messages.reduce((sum, message) => sum + estimateTokens(message.content), 0);
  const completionTokens = result.usage?.completion_tokens ?? estimateTokens(responseText(result));
  const neurons = estimateNeurons(promptTokens, completionTokens);
  const ledger = await recordNeuronUsage(credentials.accountId, neurons);
  const now = Date.now();
  return {
    text: responseText(result),
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
