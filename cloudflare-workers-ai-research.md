# Cloudflare Workers AI research

Verified 2026-11-13 against Cloudflare documentation.

Cloudflare Workers AI provides a free allocation of 10,000 Neurons per account per day. The allowance resets at 00:00 UTC. On Workers Free, operations fail after the free allocation; Workers Paid retains the 10,000 free Neurons and charges above it. Cloudflare directs users to the Workers AI dashboard for authoritative usage.

Source: https://developers.cloudflare.com/workers-ai/platform/pricing/

The existing specification’s `@cf/meta/llama-3.1-8b-instruct` is deprecated as of 2026-05-30 and should not be used. Source: https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct/

Cloudflare’s 2026-07-28 changelog lists free-plan-compatible examples including `@cf/zai-org/glm-4.7-flash`, `@cf/google/gemma-4-26b-a4b-it`, and `@cf/nvidia/nemotron-3-120b-a12b`. Nemotron has planned deprecation on 2026-11-20, so the app uses GLM-4.7-Flash. Source: https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/

GLM-4.7-Flash is a Cloudflare-hosted multilingual text-generation model. Its documented unit pricing is $0.0605 per million input tokens and $0.40 per million output tokens. Source: https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/

Cloudflare’s general Workers AI price is $0.011 per 1,000 Neurons. The app therefore estimates GLM usage as input tokens × 0.0055 plus output tokens × 0.03636, with a fallback estimate of roughly one token per four input characters when a response omits token usage.

The REST API requires an Account ID and API token. A custom token needs Workers AI Read and Workers AI Edit permissions. Source: https://developers.cloudflare.com/workers-ai/get-started/rest-api/

The model endpoint is `POST /accounts/{account_id}/ai/run/{model_name}` with the model-specific request body and Bearer token. Source: https://developers.cloudflare.com/api/resources/ai/methods/run/

Cloudflare documents the dashboard as the authoritative usage view; no supported public remaining-Neurons endpoint was found in the reviewed API/docs pages. The app therefore labels its local account/day ledger as estimated and links to the dashboard.
