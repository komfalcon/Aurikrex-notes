# A-Notes Cloudflare AI configuration

## Diagnosis

The browser error `Failed to fetch` came from calling Cloudflare's REST API directly from the PWA. Cloudflare's official CORS proxy example describes this exact browser failure when a third-party API does not return the required cross-origin headers. A-Notes now sends the request to its same-origin `/api/cloudflare-ai` Pages Function, which forwards the request server-side to Cloudflare.

## Why the Account ID is required

Cloudflare's official Workers AI API endpoint is account-scoped:

`POST /accounts/{account_id}/ai/run/{model_name}`

A token authenticates the request, but the endpoint still requires the target account in the URL. This is necessary because one user can have access to multiple Cloudflare accounts. The Account ID is not a secret.

## Model choice

A-Notes keeps `@cf/zai-org/glm-4.7-flash`. Cloudflare's current pricing documentation lists it in the free Workers AI allocation and the API documentation confirms that Workers AI Read or Workers AI Write permissions are accepted for model execution. The current DeepSeek V4 models listed by Cloudflare require a paid billing method, so switching to them would not fix the browser failure and could remove the free-plan behavior. Llama 3.2 3B is documented for summarization but is scheduled for deprecation on November 20, 2026, so it is not a stable default for this app.

## Security behavior

The BYOK token is sent from the browser to the same-origin Pages Function only for the current request. The Function does not persist it. The Function validates the model against an allowlist and forwards the upstream status and JSON error without exposing the token.

## Sources

- [1] [Cloudflare Run a Workers AI model API reference](https://developers.cloudflare.com/api/resources/ai/methods/run/)
- [2] [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [3] [Cloudflare Workers AI model catalog](https://developers.cloudflare.com/workers-ai/models/)
- [4] [Cloudflare CORS header proxy example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/)
- [5] [Cloudflare Pages Functions getting started](https://developers.cloudflare.com/pages/functions/get-started/)
- [6] [Cloudflare Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)
