import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { estimateNeurons, getCloudflareCredentials, runCloudflareText, saveCloudflareCredentials } from "@/lib/ai/cloudflare";

const credentials = { accountId: "0123456789abcdef0123456789abcdef", apiToken: "test-token" };
const prompt = [{ role: "user" as const, content: "Summarize this short test note." }];

describe("Cloudflare AI client", () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.delete();
    db.close();
    await db.open();
    saveCloudflareCredentials(credentials);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("persists credentials in browser storage and reads them back", () => {
    expect(getCloudflareCredentials()).toEqual(credentials);
    expect(localStorage.getItem("aurikrex-notes.cloudflare.credentials")).toBe(JSON.stringify(credentials));
  });

  it("rejects a malformed account ID before writing credentials", () => {
    expect(() => saveCloudflareCredentials({ accountId: "not-an-account-id", apiToken: "test-token" })).toThrow("valid 32-character hexadecimal Cloudflare Account ID");
    expect(localStorage.getItem("aurikrex-notes.cloudflare.credentials")).toBe(JSON.stringify(credentials));
  });

  it("uses the published Mistral Neuron rates", () => {
    expect(estimateNeurons(1_000_000, 0)).toBe(31_876);
    expect(estimateNeurons(0, 1_000_000)).toBe(50_488);
  });

  it("calls the same-origin AI route and extracts a normal text response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: {
        choices: [{ message: { content: "- One concise summary." }, finish_reason: "stop" }],
        usage: { prompt_tokens: 8, completion_tokens: 5, total_tokens: 13 },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", mockFetch);

    const result = await runCloudflareText(prompt);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { accountId: string; messages: typeof prompt };

    expect(url).toBe("/api/ai");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
    expect(body).toEqual({ accountId: credentials.accountId, messages: prompt });
    expect(body).not.toHaveProperty("apiToken");
    expect(result.text).toBe("- One concise summary.");
  });

  it("handles null content as an empty-model response instead of leaking a Zod error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: {
        choices: [{ message: { content: null, reasoning_content: "internal reasoning" }, finish_reason: "length" }],
        usage: { prompt_tokens: 8, completion_tokens: 256, total_tokens: 264 },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    await expect(runCloudflareText(prompt)).rejects.toThrow("The AI model returned no text.");
  });

  it("converts provider errors into actionable user-facing messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      errors: [{ message: "Invalid API token" }],
    }), { status: 401, headers: { "Content-Type": "application/json" } })));

    await expect(runCloudflareText(prompt)).rejects.toThrow("Cloudflare AI request failed (401). Invalid API token");
  });

  it("shows an actionable message when the same-origin AI proxy cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(runCloudflareText(prompt)).rejects.toThrow("A-Notes could not reach its AI proxy. Check your connection and try again.");
  });
});
