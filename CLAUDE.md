# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite dev server
npm run build             # prebuild (generates version.ts + manifest.json) -> tsc -b (type-check gate) -> vite build
npm run lint               # ESLint (flat config, typescript-eslint + react-hooks + react-refresh)
npm run preview            # serve the production build locally
npm run update-manifest    # regenerate public/manifest.json only
```

There is no test suite (no vitest/jest, no `*.test.*`/`*.spec.*` files, no test script). `npm run lint` and `npm run build` (which includes the `tsc -b` type-check step) are the only automated verification gates — treat both as required before considering a change done.

## Architecture

### Data layer: Dexie is the single source of truth

`src/lib/db.ts` defines one `AytoDB extends Dexie` singleton (`export const db`). Schema has gone through 15 versions (incremental `.version(n).stores(...)`/`.upgrade()` migrations) — tables: `seasons`, `participants`, `matchingNights`, `matchboxes`, `penalties`, `probabilityCache`, `broadcastNotes`, `meta`. Every entity table is scoped by `seasonId`; multi-season support was retrofitted in v15 via an `upgrade()` that back-fills a `'legacy'` season and sets it active in `meta`. When touching the schema, add a new `.version()` step — never edit an existing one in place.

### Services layer + season-scoping convention

`src/services/*.ts` — one static class per entity (`ParticipantService`, `MatchingNightService`, `MatchboxService`, `PenaltyService`), each talking to Dexie directly (no repository/ORM abstraction beyond Dexie itself). Two conventions repeat across all of them:
- a private `sid()` helper resolving the current active season via `getActiveSeasonId()` (`services/seasonService.ts`) — kept in `seasonService.ts` rather than inlined to avoid import cycles.
- every write path calls `assertSeasonWritable()` first, which throws if the active season is `readOnly` (a completed season). Any new write operation must go through this guard.

`seasonService.ts` + `seasonCatalogCore.ts` + `seasonCatalogService.ts` implement the season/catalog concept: seasons are Dexie rows (`kind: 'completed' | 'running' | 'custom'`), and a catalog of predefined seasons is fetched from the static `/seasons.json` and can be imported.

### State & routing: no framework, hooks call services directly

No Redux/Zustand and no react-router. Each cross-cutting concern gets its own hook in `src/hooks/` (`useAppInitialization`, `useDatabaseUpdate`, `useVersionCheck`, `useProbabilityCalculation`, ...) that calls into the services layer above. Routing is a ~2-route homemade router in `useAppRouting.ts`: it matches `pathname.startsWith('/admin')` vs. root, and additionally rewrites legacy query-string URLs (`?admin=1`, `?overview=1&mui=1`) to path-based routes via `history.replaceState` for backwards compatibility with old bookmarks/links.

`src/hooks/useAytoState.ts` is unused dead code (a legacy local-state + toy probability calculator from an earlier version) — nothing imports it. Don't build on it; it's a deletion candidate, not a pattern to follow.

### UI: two component systems coexist

- `src/components/ui/` — shadcn/ui primitives (Radix + `class-variance-authority` + Tailwind, style `"new-york"` per `components.json`). Path alias `@/*` → `src/*` (set in both `vite.config.ts` and `tsconfig.json`).
- MUI (`@mui/material`, `x-charts`, `x-data-grid`, `x-date-pickers`) is used for the admin and overview screens (`src/features/admin/AdminPanelMUI.tsx`, `src/features/overview/OverviewMUI.tsx`), each wrapped in its own `theme/ThemeProvider.tsx` — the app root does not apply one global MUI theme wrapper.

Tailwind v4 is wired via the native `@tailwindcss/vite` plugin (no `postcss.config.js` needed, though `postcss`/`autoprefixer` remain as unused devDeps).

### PWA: two independent update mechanisms

1. `vite-plugin-pwa` (`VitePWA({registerType: 'autoUpdate', ...})` in `vite.config.ts`) — standard service-worker asset caching/auto-update.
2. A separate, hand-rolled data-update system: `scripts/update-manifest.cjs` (run in `prebuild`) hashes `public/ayto-vip-2025.json` and writes `{version, dataHash, released}` to `public/manifest.json`; `src/services/databaseUpdateService.ts` polls that manifest client-side and drives a user-gated "apply update" flow (`useDatabaseUpdate.ts`, `DatabaseUpdateBanner.tsx`, `VersionCheckDialog.tsx`). This is about detecting new *seed data* releases, unrelated to the service worker's own asset updates — don't conflate the two when debugging update issues.

### Generated files — do not hand-edit

- `src/utils/version.ts` is overwritten on every `prebuild` by `scripts/generate-version.cjs` from the nearest git tag + commit hash. Edits will be silently discarded on the next build.
- `public/manifest.json` is overwritten by `scripts/update-manifest.cjs` the same way.
- `scripts/update-manifest.js` (no `.cjs`) is a stale duplicate not referenced by any npm script — ignore it.
- `src/utils/version_MBP-von-test.fritz.box_*_Conflict.ts` is a Synology Drive sync-conflict artifact, not real source.

### Probability engine

`src/services/probabilityService.ts` implements a CSP/backtracking solver over matching-night light counts + matchbox constraints, run off the main thread in `src/workers/probabilityWorker.ts` (message-based progress/result/error protocol) and orchestrated by `useProbabilityCalculation.ts`, with results cached in the `probabilityCache` Dexie table. Per the README's roadmap this feature is currently disabled in the UI — the code is otherwise complete and functional.

### Deployment

`.github/workflows/main.yml` builds on push to `main` and FTP-deploys to a Netcup vServer (`hosting119408.a2fac.netcup.net`). This is the current, authoritative deploy path — several files under `docs/` (e.g. `production-deploy-guide.md`) describe a Netlify-based deploy instead; those are outdated and should not be relied on for how deploys actually work.

### Domain business rule: broadcast-date priority

Both matching-night and matchbox logic must treat `ausstrahlungsdatum` (broadcast/air date) as taking priority over `createdAt` for chronological ordering/validation (e.g. which perfect matches were confirmed before a given matchbox). This rule is centralized in `src/utils/broadcastUtils.ts` — use it rather than comparing `createdAt` directly.
