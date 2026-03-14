# Good Learnings — Successful Patterns

<!-- Format: date | what was done | why it worked | when to reuse -->

## 2026-03-14 | Non-blocking boot pattern
Render app shell immediately after auth check, then connect Sheets in background `_connectSheets()`.
Never await Sheets before `renderApp()`. Eliminates "stuck on loading screen" class of bugs.
**Reuse**: any new API integrations should follow this pattern — render first, load data async.

## 2026-03-14 | In-flight deduplication for async stores
Both `houseStockWatcher.js` (`_fetchInFlight`) and `stores/positions.js` (`_loadInFlight`) use a single
shared promise for concurrent callers. Pattern: `if (_inFlight) return _inFlight; _inFlight = _doWork().finally(() => { _inFlight = null })`.
**Reuse**: any store or API module that can be called from multiple places simultaneously.

## 2026-03-14 | Vite proxy for CORS in dev
`vite.config.js` server.proxy routes `/api/hsw` → S3. `import.meta.env.DEV` switches the URL in source.
Production uses direct URL; dev uses proxied path. Zero runtime overhead in production.
**Reuse**: any external API with CORS restrictions during local development.

## 2026-03-14 | batchUpdate / batchGet for Sheets writes
Single `values:batchUpdate` call for all config writes via `writeConfigBatch()`. Single `values:batchGet`
to check existing headers before writing. Avoids 429 rate limits from sequential per-cell API calls.
**Reuse**: any multi-key Sheets write — always batch.

## 2026-03-14 | Use ~/repo-name in terminal instructions, not full /home/user/... paths
Always write terminal blocks as `cd ~/Stock-Trader-Helper` — user closes and reopens terminals between sessions,
`~` works universally regardless of home directory. Full paths are fragile and harder to read.
**Reuse**: every terminal block in every response.

## 2026-03-14 | AbortController timeouts on all fetches
`_timedFetch()` (10s Sheets) and HSW fetch (15s) use AbortController to prevent hung connections.
Avoids UI lockups when network is slow or S3/Sheets is unresponsive.
**Reuse**: wrap every external fetch in an AbortController with a project-appropriate timeout.
