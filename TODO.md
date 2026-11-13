# Aurikrex Notes implementation TODO

## Data and offline foundation

- [x] Keep the Next.js App Router static export, `/note?id=<uuid>` routing, strict TypeScript, Zod validation, Dexie-only persistence, and the current visual design and branding.
- [x] Extend the note schema with `embedding: number[] | null`, preserving older records and imports.
- [x] Add a Dexie Settings record for Cloudflare Account ID and API token, plus a daily local Neurons ledger keyed by account and UTC date.
- [x] Verify `createNote`, `updateNote`, `softDeleteNote`, `restoreNote`, `purgeExpired`, `listNotes`, `searchNotes`, and `togglePin` remain available and offline-safe.
- [x] Preserve Serwist static-export registration, PWA share target `/new?title=&text=&url=`, purge fake-timer coverage, and offline create/reload coverage.

## Voice dictation

- [x] Add `useVoiceDictation.ts` using `window.SpeechRecognition || window.webkitSpeechRecognition`.
- [x] Add a microphone control to the existing editor toolbar that appends recognized text to the body.
- [x] Handle unsupported browsers and recognition errors without breaking editing.

## Local semantic search and connections

- [x] Install `@huggingface/transformers` and lazily load `Xenova/all-MiniLM-L6-v2` through browser WASM.
- [x] Cache model requests through the service worker after the first load where the browser permits it.
- [x] Generate and persist note embeddings when body text changes.
- [x] Compute query embeddings and return notes with cosine similarity above `0.6`, while retaining lexical fallback when the model is unavailable.
- [x] Add up to three highest-scoring Related Notes below the editor.

## Cloudflare free BYOK and Neurons

- [x] Use `@cf/zai-org/glm-4.7-flash` as the default Workers AI model because it is documented as Free-plan compatible; do not use deprecated Llama 3.1.
- [x] Store the Account ID and API token locally so the app does not ask for them again after reload or PWA relaunch.
- [x] Mask the token, provide a forget-credentials action, and never send credentials anywhere except Cloudflare.
- [x] Call the Cloudflare REST model endpoint directly from the browser.
- [x] Show the 10,000-Neuron daily free allocation, UTC reset countdown, and an explicitly estimated remaining balance.
- [x] Estimate usage from returned prompt/completion token counts and model pricing, store the ledger locally per account and UTC date, reset at UTC midnight, and link to Cloudflare’s authoritative dashboard.
- [x] Generate smart titles on editor exit when title is empty, using the first 200 body characters; preserve the note if offline or the request fails.
- [x] Add a Summarize toolbar action using the exact prompt, ask the user for confirmation before replacing the body with a successful response, and disable it when credentials are missing.

## Validation and delivery

- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e`.
- [x] Confirm the static `out/` folder contains the exported app shell and service worker.
- [x] Use small semantic commits and push the approved implementation directly to `main`.
