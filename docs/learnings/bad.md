# Bad Learnings — Failed Approaches & Dead Ends

<!-- Format: date | what was attempted | why it failed | what worked instead -->

## 2026-03-14 | Blocking boot on Sheets init
Awaiting `initSheets()` before calling `renderApp()` caused the app to hang indefinitely on "STH Loading..."
when Sheets was slow or returned 429 errors. User saw a blank/stuck screen.
**Fix**: render immediately, move Sheets init to background `_connectSheets()`.

## 2026-03-14 | Sequential per-key Sheets writes in saveEditableConfig
Original `saveEditableConfig` called `writeConfigKey()` for each of 48 config keys — 48 sequential API calls.
Triggered 429 rate limiting on Google Sheets API.
**Fix**: diff changed keys only, write all changes in one `writeConfigBatch()` batchUpdate call.

## 2026-03-14 | `raw_json: JSON.stringify(raw)` on every normalized HSW transaction
Stored full JSON string of each raw record in the normalized output. With 10k+ records, this consumed
massive RAM and pushed localStorage well past its 5MB quota, causing cache write failures and tab crashes.
**Fix**: remove `raw_json` from normalized records entirely. It was never read by any consumer.

## 2026-03-14 | Fetching all 50MB HSW data then normalizing 10k+ records
`res.json()` on the full 50MB response blocks the main thread during parsing. Then normalizing all 10k+
records synchronously caused Chrome to kill the tab.
**Fix**: filter to last 90 days immediately after parse (`DATA_WINDOW_DAYS`), normalize only recent records.
Still synchronous but 90-day slice is ~200-500 records vs 10k+.

## 2026-03-14 | `let activeView = 'feed'` dedup guard in app.js
Setting initial activeView to `'feed'` caused `switchView('feed')` on first call to return early (dedup
guard: `if (view === activeView) return`). Feed tab never rendered on startup.
**Fix**: `let activeView = null` so first `switchView('feed')` always executes.

## 2026-03-14 | Multiple concurrent `loadPositions()` calls without dedup
`_connectSheets()` in boot AND `renderPositions()` in the positions view both called `loadPositions()`.
Each call fired an independent `readTab('my_positions')` with a 10s AbortController timeout. Under rapid
tab-clicking, promises piled up and exhausted browser resources, crashing the tab.
**Fix**: `_loadInFlight` dedup promise — concurrent callers share one Sheets request.

## 2026-03-14 | Direct S3 fetch from localhost (CORS)
`fetch('https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/...')` from `localhost:5175` triggers
CORS preflight rejection. Browser throws "Failed to fetch" before any data arrives.
**Fix**: Vite dev proxy routes `/api/hsw` → S3 with `changeOrigin: true`. Production keeps direct URL.
