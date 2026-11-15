const ALLOWED_MODELS = new Set([
  "@cf/zai-org/glm-4.7-flash",
  "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
]);

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
});

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

export async function onRequestPost({ request }) {
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ success: false, errors: [{ message: "The AI request body is not valid JSON." }] }, 400);
  }

  const accountId = typeof input?.accountId === "string" ? input.accountId.trim() : "";
  const apiToken = typeof input?.apiToken === "string" ? input.apiToken.trim() : "";
  const model = typeof input?.model === "string" ? input.model : "";
  const messages = Array.isArray(input?.messages) ? input.messages : null;

  if (!accountId || !apiToken || !messages || messages.length === 0) {
    return json({ success: false, errors: [{ message: "Account ID, API token, and messages are required." }] }, 400);
  }
  if (!ALLOWED_MODELS.has(model)) {
    return json({ success: false, errors: [{ message: "That Workers AI model is not enabled for A-Notes." }] }, 400);
  }

  try {
    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, max_tokens: 256, temperature: 0.2 }),
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return json({ success: false, errors: [{ message: "A-Notes could not reach Cloudflare Workers AI." }] }, 502);
  }
}
