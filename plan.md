# Aurikrex Notes AI + Cloudflare BYOK Plan

## Approved scope

Preserve the existing Aurikrex Notes visual design, layout, colors, typography, PWA branding, and the user-supplied logo. Add only the controls and small status surfaces required for voice dictation, local semantic search, related notes, Cloudflare BYOK title/summarization, and the estimated daily Neurons ledger.

## Design

- **Design movement:** restrained dark mobile utility with precise blue interaction accents.
- **Core principles:** offline confidence, low visual noise, thumb-sized controls, and transparent AI status.
- **Color philosophy:** deep navy keeps private notes visually quiet; Aurikrex blue is reserved for active controls, AI actions, and status emphasis.
- **Layout paradigm:** existing single-column editor and settings cards remain intact; AI actions live in the existing editor toolbar/footer rather than creating a new dashboard.
- **Signature elements:** safe-area mobile shell, compact monospace status labels, and blue active-state controls.
- **Interaction philosophy:** local edits remain immediate; network AI is optional, explicitly keyed, and never blocks saving.
- **Animation:** retain existing restrained hover/focus transitions; no new decorative motion.
- **Typography:** preserve Lexend for content and JetBrains Mono for metadata/status labels.
- **Brand essence:** a private, offline-first notes tool for people who want their writing available without a server; quiet, capable, transparent.
- **Brand voice:** concise and direct. Examples: “Saved locally.” and “Cloud AI is optional.”
- **Wordmark/logo:** preserve the repository’s existing A-Notes/Aurikrex assets unchanged.
- **Signature brand color:** Aurikrex blue `#3b82f6`.

## Implementation

1. Extend the Zod/Dexie schema with `embedding`, Cloudflare settings, and a local daily Neurons ledger. Preserve import compatibility with defaults for older backups.
2. Add a typed Cloudflare client using the free-compatible default model `@cf/zai-org/glm-4.7-flash`, with local credential persistence and graceful errors.
3. Add token-based estimated Neurons accounting using returned usage when available, model pricing metadata, UTC-day reset, and a visible `remaining / 10,000` display labeled as estimated.
4. Add a browser speech-recognition hook and editor microphone action.
5. Add local Transformers.js embedding generation with lazy model loading, Dexie persistence, lexical fallback, cosine search, and related-note ranking.
6. Add Cloudflare settings controls, credential masking, saved-state indication, forget action, model/allowance information, and dashboard link.
7. Add editor summarize with explicit confirmation before replacing the body, plus smart-title behavior without blocking local saves.
8. Update tests for schema/repository/ledger behavior and retain offline E2E coverage.

## Constraints

- Next.js App Router, static export, no dynamic routes.
- Strict TypeScript with no `any`.
- Dexie/IndexedDB only for app persistence.
- No backend or server-side credential handling.
- Cloudflare token remains local to the browser and is sent only to Cloudflare’s API.
- Full free allocation is account-wide and exact remaining usage cannot be guaranteed locally; the UI must clearly label the counter as estimated and link to Cloudflare’s authoritative dashboard.
