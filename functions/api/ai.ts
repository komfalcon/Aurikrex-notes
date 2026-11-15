import { CLOUDFLARE_MODEL } from "../../src/lib/ai/modelConfig";

const UPSTREAM_BASE_URL = "https://api.cloudflare.com/client/v4/accounts";
const MAX_MESSAGE_LENGTH = 30_000;
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

type AIMessage = { role: "system" | "user"; content: string };
type AIRequest = { accountId?: unknown; messages?: unknown };

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const isAIMessage = (value: unknown): value is AIMessage => {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (message.role === "system" || message.role === "user") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= MAX_MESSAGE_LENGTH;
};

export const onRequestPost = async ({ request }: { request: Request }): Promise<Response> => {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ success: false, errors: [{ message: "Cross-origin requests are not allowed." }] }, 403);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token || token.length > 4096) {
    return json({ success: false, errors: [{ message: "A Workers AI API token is required." }] }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json() as unknown;
  } catch {
    return json({ success: false, errors: [{ message: "The AI request must be valid JSON." }] }, 400);
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return json({ success: false, errors: [{ message: "The AI request must be a JSON object." }] }, 400);
  }
  const body = rawBody as AIRequest;

  if (typeof body.accountId !== "string" || !/^[a-f\d]{32}$/i.test(body.accountId)) {
    return json({ success: false, errors: [{ message: "Enter a valid 32-character Cloudflare account ID in Settings." }] }, 400);
  }
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 4 || !body.messages.every(isAIMessage)) {
    return json({ success: false, errors: [{ message: "The AI request contains invalid or oversized messages." }] }, 400);
  }

  const messages = body.messages as AIMessage[];
  if (messages.reduce((total, message) => total + message.content.length, 0) > MAX_MESSAGE_LENGTH) {
    return json({ success: false, errors: [{ message: "The AI request is too large. Shorten the note and try again." }] }, 413);
  }

  const endpoint = `${UPSTREAM_BASE_URL}/${encodeURIComponent(body.accountId)}/ai/run/${CLOUDFLARE_MODEL}`;
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        max_tokens: 512,
        temperature: 0.2,
      }),
    });
    const text = await upstream.text();
    const contentType = upstream.headers.get("Content-Type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({
        success: false,
        errors: [{ message: `Cloudflare returned an unexpected response (${upstream.status}).` }],
      }, upstream.status >= 400 ? upstream.status : 502);
    }
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...JSON_HEADERS,
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The upstream request failed.";
    return json({
      success: false,
      errors: [{ message: `Could not reach Cloudflare Workers AI: ${message}` }],
    }, 502);
  }
};
