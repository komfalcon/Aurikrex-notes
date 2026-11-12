# Aurikrex Notes

Offline-first notes PWA built with Next.js App Router, strict TypeScript, Dexie (IndexedDB), Zod, and Tailwind.

## Features

- Offline-first note storage in IndexedDB (Dexie)
- Zero backend/auth/analytics
- Static export build (`next.config.mjs` uses `output: 'export'`)
- Query-based editor route (`/note?id=<uuid>`)
- Soft delete + 30-day purge
- JSON export/import with schema validation
- PWA manifest + service worker scaffold with Serwist
- Mobile-first full-height (`100dvh`) layout

## Stack

- Next.js App Router + React 19
- TypeScript (`strict: true`)
- Tailwind CSS + tokens in `src/styles/tokens.css`
- Dexie for IndexedDB
- Zod runtime validation
- Serwist service worker (`@serwist/next` integration)
- Vitest + Testing Library (unit)
- Playwright (E2E)

## Scripts

- `pnpm dev` - run app locally
- `pnpm build` - build static export into `out/`
- `pnpm lint` - run ESLint
- `pnpm typecheck` - strict TS check
- `pnpm test:unit` - run Vitest tests
- `pnpm test:e2e` - run Playwright tests (serves `out/`)
- `pnpm format` - run Prettier

## Architecture and data flow

### Routes (`src/app`)

- `/` notes list + search
- `/new` creates note (also used by web share target params)
- `/note?id=<uuid>` editor
- `/trash` restore/purge
- `/settings` export/import

### Data layer

- `src/lib/db/` defines Dexie DB and Zod schemas
- `src/lib/notes/repository.ts` contains all note operations:
  - `createNote`, `updateNote`, `softDeleteNote`, `restoreNote`
  - `listNotes`, `searchNotes`, `togglePin`
  - `purgeExpired` (30-day hard delete)
  - `exportAll`, `importJson`
- `useStoragePersistence` requests `navigator.storage.persist()` at startup

### PWA and offline

- Manifest: `public/manifest.json`
- Service worker source: `src/sw.ts`
- Next integration: `@serwist/next` in `next.config.mjs`
- App registers SW from `Bootstrap` in production

> Why `@serwist/next`?
>
> This project uses static export but still relies on a generated service worker file and precache manifest wiring. `@serwist/next` gives this integration while keeping the build in Next’s pipeline.

## Cloudflare Pages deployment

1. Build the app: `pnpm build`
2. Deploy the `out/` directory as static output on Cloudflare Pages.
3. Build command: `pnpm build`
4. Output directory: `out`
5. No runtime environment variables or secrets are required.

## Reusing as an Aurikrex template

1. Rename app metadata (`src/app/layout.tsx`, `public/manifest.json`)
2. Update tokens in `src/styles/tokens.css`
3. Keep repository contracts in `src/lib/notes/repository.ts`
4. Replace page-level components while preserving data interfaces

## Replace placeholder icons

Current icon files are placeholders:

- `src/app/favicon.ico`
- `src/app/icon.png`
- `src/app/apple-icon.png`
- `public/icons/icon-192x192.png`
- `public/icons/icon-512x512.png`
- `public/icons/maskable-512x512.png`

Replace each with real branded assets using the same file names and exact dimensions where specified in the manifest (192x192 and 512x512). Keep `type: image/png` and `purpose` fields unchanged unless your branding needs differ.

## Branding
- Full product name: Aurikrex Notes
- PWA short name: A-Notes
- App mark: `/public/icons/a-notes-mark-reduced.png` uses a reduced diagonal-ribbon and diamond accent inside a note-page silhouette; it does not reproduce the full Aurikrex logo.
