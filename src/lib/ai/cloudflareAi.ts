import { z } from "zod";

export type CloudflareCredentials = {
  accountId: string;
  apiToken: string;
};

const CloudflareResponseSchema = z.object({
  success: z.boolean(),
  result: z.union([z.object({ response: z.string() }), z.string()]).nullable().optional(),
});

const MODEL_PATH = "ai/run/@cf/meta/llama-3.1-8b-instruct";

const requireCredentials = (credentials: CloudflareCredentials): CloudflareCredentials => {
  const accountId = credentials.accountId.trim();
  const apiToken = credentials.apiToken.trim();
  if (accountId.length === 0 || apiToken.length === 0) {
    throw new Error("Cloudflare AI credentials are incomplete.");
  }
  return { accountId, apiToken };
};

const readResponseText = (result: z.infer<typeof CloudflareResponseSchema>["result"]): string => {
  if (typeof result === "string") {
    return result.trim();
  }
  return result?.response.trim() ?? "";
};

export const runCloudflareAi = async (credentials: CloudflareCredentials, prompt: string): Promise<string> => {
  const validCredentials = requireCredentials(credentials);
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(validCredentials.accountId)}/${MODEL_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${validCredentials.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare AI request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const parsed = CloudflareResponseSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.success) {
    throw new Error("Cloudflare AI returned an invalid response.");
  }

  const text = readResponseText(parsed.data.result);
  if (text.length === 0) {
    throw new Error("Cloudflare AI returned no text.");
  }
  return text;
};

export const createSmartTitle = async (credentials: CloudflareCredentials, body: string): Promise<string> => {
  const excerpt = body.trim().slice(0, 200);
  return runCloudflareAi(credentials, `Create a concise title for the following note. Return only the title, with no quotation marks:\n\n${excerpt}`);
};

export const summarizeNote = async (credentials: CloudflareCredentials, body: string): Promise<string> =>
  runCloudflareAi(credentials, `Summarize the following text in 3 concise bullet points:\n\n${body}`);
