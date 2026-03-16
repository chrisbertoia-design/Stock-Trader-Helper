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

## 2026-03-14 | Standard terminal restart sequence — always use this exact block
```bash
cd ~/Stock-Trader-Helper
git pull origin claude/web-app-google-sheets-wt63b
fuser -k 5175/tcp 2>/dev/null || true && npm run dev
```
Three steps, always in this order: cd → pull → kill port → run.
Missing any step causes stale code, port conflicts, or both.
**Reuse**: every single time the user is asked to restart the dev server.

## 2026-03-14 | Always kill port 5175 before starting dev server
Include `fuser -k 5175/tcp 2>/dev/null || true` before `npm run dev` in every terminal block.
Prevents "port already in use" errors when the user closes a terminal without stopping the server.
**Reuse**: every single terminal block that starts the dev server.

## 2026-03-14 | Use ~/repo-name in terminal instructions, not full /home/user/... paths
Always write terminal blocks as `cd ~/Stock-Trader-Helper` — user closes and reopens terminals between sessions,
`~` works universally regardless of home directory. Full paths are fragile and harder to read.
**Reuse**: every terminal block in every response.

## 2026-03-15 | iOS file input: button + input.click(), never label wrapping input
`<label>` wrapping `<input type="file" style="display:none">` does NOT reliably open the file picker
on iOS Chrome/WebKit. Replace with `<button>` that calls `input.click()` programmatically via JS.
Same rule applies to all interactive elements — always `<button>`, never `<div onclick>` or `<label>`.
**Reuse**: every file upload trigger on this project.

## 2026-03-15 | Schwab CSV format detection — check header pattern before parsing
Schwab transactions CSV has `Symbol` AND `Quantity` columns, so `parsePositionsCsv` (which detects by
`/symbol/i && /quantity/i`) incorrectly matches it and returns all-zero data. Always detect format
upfront by checking for `Date,Action,Symbol` (transactions-specific) before falling back to positions.
**Reuse**: any multi-format CSV parser — detect by the most specific header pattern first.

## 2026-03-15 | Google OAuth + Sheets confirmed working end-to-end
GIS implicit flow, silent refresh at 50min, spreadsheet auto-create, all 9 tabs provisioned,
batchGet/batchUpdate wired. This is stable — don't touch auth or Sheets init without good reason.

## 2026-03-14 | AbortController timeouts on all fetches
`_timedFetch()` (10s Sheets) and HSW fetch (15s) use AbortController to prevent hung connections.
Avoids UI lockups when network is slow or S3/Sheets is unresponsive.
**Reuse**: wrap every external fetch in an AbortController with a project-appropriate timeout.

## 2026-03-15 | RAW valueInputOption prevents Sheets date mangling
`USER_ENTERED` causes Google Sheets to auto-interpret ISO date strings (e.g. `2026-03-14`) as date
serials (numeric values). Switching all writes to `valueInputOption: 'RAW'` preserves strings as-is.
Combined with `_parseDateField()` serial guard on read for backward compat with old rows.
**Reuse**: always use RAW for any Sheets write that includes date strings or values that could be misinterpreted.

## 2026-03-15 | Logger re-entrancy guard prevents infinite recursion
`logger.js` writes logs to Sheets via `appendRows()`, which itself calls `debug()`. Without a guard,
this creates `appendRows→debug→appendRows→...` infinite recursion. Fix: `_writing` boolean flag checked
at the top of the flush function; if true, skip the Sheets write and console-only.
**Reuse**: any module that logs from within its own write path needs a re-entrancy guard.

## 2026-03-15 | AbortController per-navigation prevents stale renders
Each `navigate()` call creates a new AbortController, passing its signal to the view renderer. When the
user navigates away before an async render completes, the signal aborts in-flight fetches and guards
against writing DOM into a container that has already been replaced.
**Reuse**: any async view render that outlives its navigation context needs signal-based cancellation.

## 2026-03-15 | sessionStorage for reload view persistence (not localStorage)
`sth_last_view` in sessionStorage restores the active view on page reload within the same tab session.
Using sessionStorage (not localStorage) means new tabs start fresh at home, which is correct behavior.
**Reuse**: ephemeral per-tab state goes in sessionStorage; cross-session state goes in localStorage.

## 2026-03-16 | Settings persistence via per-field blur/change saves
Settings view wires `blur` (inputs) and `change` (selects) listeners to write individual config keys
to Sheets immediately via `writeConfigKey()` from the config store. This avoids batching complexity
and gives instant feedback ("Saved" toast per field). The config store's `set()` method updates the
in-memory cache AND writes to Sheets, so subsequent reads within the same session see the new value.
**Reuse**: for any settings UI that needs to persist to Sheets, prefer per-field save-on-blur over
a monolithic "Save All" button — simpler code, better UX, no "unsaved changes" state to track.

## 2026-03-16 | Playwright route mocking: use route.fulfill() not route.abort() for write tests
When testing Sheets write operations, `route.abort()` causes the write to fail with a network error,
making it impossible to test the success path. Use `route.fulfill()` with a mock 200 JSON response
to simulate a successful Sheets API call. Pattern: `unrouteAll()` first to remove the default abort
handler from `setupAuth()`, then add specific `route.fulfill()` handlers per URL pattern.
**Reuse**: any Playwright test that needs to verify a successful API write.
