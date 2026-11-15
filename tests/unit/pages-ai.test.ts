import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "../../functions/api/ai";

const origin = "https://aurikrex-notes.pages.dev";
const accountId = "0123456789abcdef0123456789abcdef";
const token = "test-workers-ai-token";
const messages = [{ role: "user" as const, content: "Summarize this short test note." }];

const makeRequest = (options: { origin?: string; authorization?: string; body?: unknown } = {}): Request =>
  new Request(`${origin}/api/ai`, {
    method: "POST",
    headers: {
      ...(options.origin === undefined ? { Origin: origin } : { Origin: options.origin }),
      ...(options.authorization === undefined ? { Authorization: `Bearer ${token}` } : { Authorization: options.authorization }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options.body === undefined ? { accountId, messages } : options.body),
  });

describe("Cloudflare Pages AI function", () => {
  const upstreamFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", upstreamFetch);
    upstreamFetch.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("rejects cross-origin requests before forwarding credentials", async () => {
    const response = await onRequestPost({ request: makeRequest({ origin: "https://attacker.example" }) });
    expect(response.status).toBe(403);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("forwards a bounded request to Mistral Small and never echoes the token", async () => {
    upstreamFetch.mockResolvedValue(new Response(JSON.stringify({ success: true, result: { response: "A test summary." } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const response = await onRequestPost({ request: makeRequest() });
    const responseBody = await response.text();
    const [url, init] = upstreamFetch.mock.calls[0] as [string, RequestInit];
    const forwarded = JSON.parse(String(init.body)) as { messages: typeof messages; max_tokens: number; temperature: number; chat_template_kwargs?: unknown };

    expect(response.status).toBe(200);
    expect(url).toContain(`/accounts/${accountId}/ai/run/@cf/mistralai/mistral-small-3.1-24b-instruct`);
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${token}`);
    expect(forwarded.messages).toEqual(messages);
    expect(forwarded.max_tokens).toBe(512);
    expect(forwarded.temperature).toBe(0.2);
    expect(forwarded).not.toHaveProperty("chat_template_kwargs");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(responseBody).toContain("A test summary.");
    expect(responseBody).not.toContain(token);
  });

  it("rejects malformed account IDs and missing tokens", async () => {
    const badAccount = await onRequestPost({ request: makeRequest({ body: { accountId: "bad", messages } }) });
    const missingToken = await onRequestPost({ request: makeRequest({ authorization: "", body: { accountId, messages } }) });
    expect(badAccount.status).toBe(400);
    expect(missingToken.status).toBe(401);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("returns 400 for valid JSON that is not an object", async () => {
    for (const body of [null, 7, "invalid", []]) {
      const response = await onRequestPost({ request: makeRequest({ body }) });
      expect(response.status).toBe(400);
    }
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});
