# A-Notes Cloudflare AI configuration

## Diagnosis and request flow

The browser's `Failed to fetch` error came from calling Cloudflare's REST API directly from the PWA, where the API's CORS policy blocked the request. A-Notes now sends AI requests to its same-origin `POST /api/ai` Cloudflare Pages Function. The Function validates the request, forwards it to the account-scoped Workers AI endpoint, and returns Cloudflare's response.

The Workers AI endpoint is account-scoped: `POST /accounts/{account_id}/ai/run/{model_name}`. The Account ID is therefore required even when the token is valid; it identifies which Cloudflare account to use and is not a secret.

## Model and allowance

A-Notes uses Mistral Small 3.1, model ID `@cf/mistralai/mistral-small-3.1-24b-instruct`. Cloudflare documents a 128K-token context window and marks the model as zero data retention. The published rate is 31,876 Neurons per million input tokens and 50,488 per million output tokens; the app uses these rates for its local usage estimate.

Cloudflare's free Workers AI allocation is 10,000 Neurons per account per day, shared across models and resetting at 00:00 UTC. Availability and billing remain subject to Cloudflare account eligibility and its current pricing policy.

## Credential, note, and request handling

The BYOK Account ID and token are stored in this browser's local storage. When an AI action is used, the token is sent in the `Authorization` header to the app's same-origin Pages Function; note content is included in the AI request. The Function does not persist or log the token, requires an account ID and valid bounded message payload, rejects cross-origin browser requests, and invokes only the configured Mistral model. The token is forwarded to Cloudflare for that request.

A-Notes does not store credentials or note data on its server. Cloudflare Workers AI receives note text for generated titles and summaries. Semantic search uses the browser-loaded embedding model locally, with lexical search as a fallback.

## Sources

- [Cloudflare Workers AI model API](https://developers.cloudflare.com/api/resources/ai/methods/run/)
- [Workers AI pricing and free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Mistral Small 3.1 model details and data-retention label](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/)
- [Workers AI model catalog](https://developers.cloudflare.com/workers-ai/models/)
- [Cloudflare CORS proxy example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)
