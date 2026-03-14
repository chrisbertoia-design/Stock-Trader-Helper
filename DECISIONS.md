# DECISIONS.md — Stock Trader Helper

Architecture, design, and implementation decisions for future reference.
Last updated: 2026-03-14.

---

## 1. Project Purpose

**Single focus:** Mirror congressional stock trades intelligently.

This is a personal tool for one user operating a Charles Schwab Joint Tenant account (...805). The goal is not general stock analysis — it is specifically to detect when politicians with information advantages are making trades and to help decide whether to follow them, which stocks to include in a Schwab Stock Slice order, and how to allocate dollars across that slice.

The app answers three questions:
1. What are my watched politicians trading right now?
2. Is there a broader party-wide consensus signal on any ticker?
3. If I follow a trade, how should I size the allocation across my slice?

Everything in the codebase is oriented around those three questions.

---

## 2. Architecture Decisions

### GitHub Pages + PWA

Deployed as a static site to GitHub Pages (`/Stock-Trader-Helper/` base path). No backend server, no database, no recurring costs.

VitePWA (`vite-plugin-pwa`) makes the app installable on iOS and Android home screens via `display: standalone`. This is the primary access path — not a browser tab. The manifest is configured with `orientation: portrait` and the `StaleWhileRevalidate` Workbox strategy for the House Stock Watcher data URL.

**Why no backend:** Every data source used (House Stock Watcher, Google Sheets, Gemini API) is accessible via direct browser fetch. A backend would add cost, deployment complexity, and a CORS requirement. The app is for one person on known devices — there is no multi-user isolation problem to solve.

### Port 5175

The default Vite port (5173) was occupied on the development machine. Port 5175 is set with `strictPort: true` in `vite.config.js` so it never silently falls back to a random port. The Google OAuth authorized origins must be updated if this changes.

### Stack

- **Vite 5** — build tool and dev server
- **VitePWA 0.17** — service worker generation and PWA manifest
- **Workbox 7** — runtime caching strategy
- **chart.js 4** — available as a dependency (not yet used in views)
- **gh-pages 6** — deploy script
- No framework. Vanilla JS with ES modules throughout.

---

## 3. Data Sources

### House Stock Watcher

**URL:** `https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json`

**Why chosen over alternatives:**
- **Same-day disclosures** — politicians have 45 days to file; House Stock Watcher aggregates filed disclosures the same day they appear. This is the critical differentiator. Capitol Trades and Quiver Quant typically lag by hours to a day in their free tiers.
- **No authentication required** — direct S3 fetch, no API key, no rate limit (within reason).
- **Free** — no tier, no account.

**Caching:** localStorage key `hsw_cache`, TTL 1 hour (`CACHE_TTL = 60 * 60 * 1000`). On fetch failure, stale cache is returned with a warning rather than throwing — the app degrades gracefully if the network is unavailable.

**Normalization:** `houseStockWatcher.js` normalizes the raw JSON into a consistent shape. Transactions with no ticker (`'--'`) or that are neither purchases nor sales are filtered out. Party is inferred from the `(D)` / `(R)` suffix on the representative's name field. Amount ranges are parsed from the disclosure string into numeric low/high values.

**Amount range mapping:**
| Disclosure string | `amount_low` | `amount_high` |
|---|---|---|
| `$1,001 - $15,000` | 1001 | 15000 |
| `$15,001 - $50,000` | 15001 | 50000 |
| `$50,001 - $100,000` | 50001 | 100000 |
| `$100,001 - $250,000` | 100001 | 250000 |
| `$250,001 - $500,000` | 250001 | 500000 |
| `$500,001 - $1,000,000` | 500001 | 1000000 |
| `Over $1,000,000` | 1000001 | 5000000 |

**Party roster sizes (hardcoded in feed.js):** D = 213, R = 220. These are used as denominators for consensus percentage calculations. They represent approximate current House + Senate totals per party and can be refined via config if composition shifts.

---

## 4. AI Integration

### Provider Architecture

Two providers are implemented: Ollama (local) and Gemini (cloud). The router in `src/api/ai/index.js` picks the primary provider from config, attempts it, and falls back to the other on any error. Both failures together throw a combined error message.

```
ai_provider = ollama → try Ollama → fail → try Gemini → fail → throw
ai_provider = gemini → try Gemini → fail → try Ollama → fail → throw
```

**Ollama:** Runs at `http://localhost:11434/api/chat`. Works only when the user's laptop is running Ollama locally. Uses `stream: false` and `temperature: 0.3`. The `/api/chat` endpoint is used (not `/api/generate`) for proper system message support.

**Gemini:** Uses `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. Requires `gemini_api_key` to be set (config tab or env var). System instructions are passed via the `systemInstruction` top-level field rather than as a user message. `temperature: 0.3`, `maxOutputTokens: 1024`.

### Model Resolution

**Models are never hardcoded.** Resolution order, evaluated at call time:

1. `config.ai_model` — explicit override; if non-empty, used for whichever provider is active
2. `config.ollama_fallback_model` — default `llama3.2`
3. `config.gemini_fallback_model` — default `gemini-2.0-flash`

The env var `VITE_GEMINI_MODEL` is also read as a lowest-priority fallback before Sheets is connected (pre-auth state). This means the app can make AI calls from the feed even before the full boot sequence completes.

### Prompt Types (`Prompts` object in `ai/index.js`)

| Prompt | Trigger | Output |
|---|---|---|
| `tradeContext` | "Ask AI" button on a trade card | 2–3 sentences explaining the trade relative to user's current holdings; 1 sentence on sector theme |
| `consensusSignal` | "Ask AI to explain this signal" on consensus banner | One paragraph on why party coordination at this level might matter; potential explanations |
| `sliceAllocation` | "Confirm" in Follow modal | JSON array `[{"ticker":"X","amount":N},...]` summing to exact total; weighted by signal strength and inverse existing exposure |
| `decisionMemory` | (future) pattern recognition | 1–2 sentences on decision-making pattern; one actionable observation |

The `sliceAllocation` prompt is the most structured: it requires JSON output and has a regex extraction step (`raw.match(/\[[\s\S]*\]/)`). If parsing fails for any reason, the code falls back to an even split rounded to the nearest $5 per stock.

---

## 5. Google Auth

### Design Inspiration

The flow mirrors the iOS companion app's `GoogleAuthService.swift` and `ASWebAuthenticationSession` pattern: one button, Google popup, done. No email field, no password, no user-visible client ID.

### Implementation

- Uses Google Identity Services (GIS) `initTokenClient` loaded dynamically from `https://accounts.google.com/gsi/client` on first button click (not on page load).
- Scope: `https://www.googleapis.com/auth/spreadsheets` only. No Drive scope needed — spreadsheets can be created via the Sheets API directly.
- Client ID comes from `VITE_GOOGLE_CLIENT_ID` env var. If missing, a setup screen is shown explaining how to create one at `console.cloud.google.com` with `http://localhost:5175` as an authorized origin.
- On sign-in success: fetches user email from `https://www.googleapis.com/oauth2/v3/userinfo`, stores it as `emailHint` in localStorage key `sth_auth` for silent refresh.
- Spreadsheet is named `"Stock Trader Helper"` and is created once, then its ID is stored in `sth_auth` for all future sessions.

### Token Lifecycle

- **Token age threshold: 50 minutes** (`TOKEN_MAX_AGE_MS = 50 * 60 * 1000`). Google OAuth tokens expire at 60 minutes; 50-minute check provides a 10-minute buffer.
- On boot, if stored token age exceeds 50 minutes, silent refresh is attempted with `prompt: ''` (no popup). If that fails, full sign-in is shown.
- On 401/403 errors from Sheets API calls mid-session, `sth_auth` is cleared and sign-in is re-triggered.

### Spreadsheet Creation

When no spreadsheet ID is stored, the Sheets API creates a new spreadsheet with all 10 tabs pre-declared in index order (feed=0, config=1, log=2, watchlist=3, disclosures=4, consensus=5, recommendations=6, my_decisions=7, my_allocations=8, my_positions=9). Headers are written immediately after in a single `values.batchUpdate` call.

---

## 6. Consensus Signal Thresholds

### Research Finding

The originally intuitive thresholds (50% / 65% / 80% of a party trading the same ticker) were validated against 3 years of House Stock Watcher data. Result: they **never trigger**. The maximum ever observed for any single party + ticker combination in the dataset is approximately 5% of the party.

### Validated Thresholds

These are the defaults seeded into the config tab. All are user-adjustable in the Settings view.

| Key | Default | Label | Observed frequency |
|---|---|---|---|
| `consensus_tier1_pct` | `0.08` (8%) | Elevated | 1–3 times per year |
| `consensus_tier2_pct` | `0.12` (12%) | Strong | Rare, fewer than 5 times per year |
| `consensus_tier3_pct` | `0.18` (18%) | Near-Unanimous | Almost never — would be a major signal |
| `consensus_window_days` | `14` | Clustering window | — |

### Computation

`computeConsensusSignals()` in `houseStockWatcher.js`:
1. Takes all transactions within the past `window_days` days.
2. Groups by `party::ticker` key.
3. Counts unique politician names (deduplicated traders) per group.
4. Divides by `partyRoster[party]` (D=213, R=220) to get `pct_of_party`.
5. If `pct_of_party >= tier1_pct`, emits a signal with tier 1, 2, or 3 assigned.
6. Results sorted descending by `pct_of_party`.

Tier assignment: `pct >= tier3 → 3`, `pct >= tier2 → 2`, otherwise `→ 1`.

---

## 7. Watchlist (14 Politicians)

Defined in `src/data/watchlist.js`. Seeded to the `watchlist` tab on first run. All set to `mirror: 'Y'`, `tier: 1`, `active: 'Y'`.

### Named (category: `named`)

These are tracked because of their structural roles in government.

| ID | Name | Party | Chamber | Notes |
|---|---|---|---|---|
| `pelosi_n` | Nancy Pelosi | D | House (CA) | Historically high-conviction tech trades |
| `johnson_m` | Mike Johnson | R | House (LA) | Speaker; Gang of 8 |
| `schumer_c` | Chuck Schumer | D | Senate (NY) | Senate Majority Leader; Gang of 8 |
| `jefferies_h` | Hakeem Jefferies | D | House (NY) | House Minority Leader; Gang of 8 |

### Gang of 8 (category: `gang8`)

The Gang of 8 receive classified intelligence briefings by statute. Their trades carry a presumption of information access beyond public knowledge.

| ID | Name | Party | Chamber | Role |
|---|---|---|---|---|
| `warner_m` | Mark Warner | D | Senate (VA) | Senate Intel Committee Chair |
| `cotton_t` | Tom Cotton | R | Senate (AR) | Senate Intel Ranking Member |
| `turner_m` | Mike Turner | R | House (OH) | House Intel Committee Chair |
| `himes_j` | Jim Himes | D | House (CT) | House Intel Ranking Member |
| `mcconnell_m` | Mitch McConnell | R | Senate (KY) | Senate Minority Leader; Gang of 8 |

### Auto-Recommended (category: `auto`)

Included based on trading volume, sector focus, or historically notable patterns.

| ID | Name | Party | Chamber | Reasoning |
|---|---|---|---|---|
| `tuberville_t` | Tommy Tuberville | R | Senate (AL) | Most prolific Senate trader; energy and defense heavy |
| `gottheimer_j` | Josh Gottheimer | D | House (NJ) | 100+ trades per year; tech-sector focus; pre-AI-boom pattern |
| `khanna_r` | Ro Khanna | D | House (CA) | Silicon Valley seat; semiconductor trades ahead of CHIPS Act |
| `mccaul_m` | Michael McCaul | R | House (TX) | Consistent tech/defense gains; long-tenure pattern |
| `greene_m` | Marjorie Taylor Greene | R | House (GA) | High-volume disclosure filer; aggressive buyer |

---

## 8. Google Sheets Schema (10 Tabs)

Defined in `SCHEMA` constant in `src/api/googleSheets.js`. Tab order matches creation order in the spreadsheet.

### `feed` (index 0)
No schema defined — reserved tab for future use (e.g., a curated activity summary that persists across sessions).

### `config` (index 1)
Columns: `key`, `value`, `description`, `last_modified`

The single source of truth for all runtime settings. Edited via the Settings view in-app or directly in Sheets. `last_modified` is updated on every write. Config is loaded once at boot via `loadConfig()` and cached in the `config` store module. Individual keys are updated with `writeConfigKey()` which re-reads the tab to find the row, then does a targeted cell update.

### `log` (index 2)
Columns: `timestamp`, `level`, `category`, `message`, `details`, `session_id`

All app logs are written here via `logger.js`. Session ID is generated at page load as `s_${Date.now().toString(36)}`. Logs buffer in memory until Sheets is initialized, then flush. Fire-and-forget writes so logging never blocks UI. Max rows controlled by `log_max_rows` config key (default 2000). Log level controlled by `log_level` (default `DEBUG`).

### `watchlist` (index 3)
Columns: `id`, `name`, `party`, `chamber`, `state`, `mirror`, `tier`, `category`, `active`, `notes`, `date_added`

- `mirror`: `Y/N` — whether to actively mirror their trades individually
- `tier`: `1` = mirror + consensus signals, `2` = consensus signals only
- `category`: `named` | `gang8` | `auto`
- `active`: `Y/N` — can deactivate without deleting the row

### `disclosures` (index 4)
Columns: `id`, `politician_id`, `politician_name`, `party`, `ticker`, `action`, `amount_low`, `amount_high`, `transaction_date`, `disclosed_date`, `fetched_at`, `sp500`, `raw_json`

- `action`: `buy` | `sell` (normalized from "purchase"/"sale")
- `sp500`: `Y/N` — enriched separately after fetch
- `raw_json`: full source object stringified, for debugging / future re-processing

### `consensus` (index 5)
Columns: `id`, `signal_date`, `party`, `tickers`, `member_count`, `party_total`, `pct_of_party`, `window_days`, `tier`, `notified`, `ai_summary`, `created_at`

- `tickers`: comma-separated (single ticker in current implementation; reserved for multi-ticker signals)
- `notified`: `Y/N` — whether an ntfy.sh push was sent for this signal
- `ai_summary`: populated when user clicks "Ask AI to explain this signal"

### `recommendations` (index 6)
Columns: `id`, `source_disclosure_ids`, `tickers`, `action`, `signal_type`, `ai_reasoning`, `positions_context`, `sp500_eligible`, `created_at`, `status`

- `signal_type`: `mirror` | `consensus` | `both`
- `positions_context`: JSON snapshot of relevant holdings at the time of recommendation, for auditability
- `status`: `pending` | `acted` | `expired`

### `my_decisions` (index 7)
Columns: `id`, `recommendation_id`, `decision`, `invest_amount`, `slice_count`, `decided_at`, `revisit_date`, `notes`

- `decision`: `follow` | `pass` | `not_now`
- `invest_amount`: total USD allocated (only populated for `follow`)
- `revisit_date`: populated for `not_now` decisions
- Decision IDs are generated as `dec_${Date.now()}`

### `my_allocations` (index 8)
Columns: `id`, `decision_id`, `ticker`, `allocation_amount`, `is_sp500`, `executed`, `executed_date`, `notes`

- One row per stock in a Schwab Stock Slice order
- `executed`: `Y/N` — manually updated by user after placing the order
- Allocation IDs are `alloc_${Date.now()}_${ticker}`

### `my_positions` (index 9)
Columns: `ticker`, `quantity`, `avg_cost`, `mkt_value`, `gain_loss`, `gain_loss_pct`, `last_csv_upload`, `source`

- `source`: `schwab_csv` | `manual`
- Populated by CSV upload in the Positions view
- Falls back to `MOCK_POSITIONS` from `src/data/mockPositions.js` when the tab is empty

---

## 9. Notifications

### ntfy.sh

Chosen for push notifications because:
- **No backend required** — the PWA can POST directly to `https://ntfy.sh/{topic}` via `fetch()`
- **iOS push supported** — the ntfy iOS app subscribes to any topic and receives push notifications
- **Email forwarding** — ntfy.sh free tier includes email forwarding (5 emails per day)
- **Self-hostable** — `ntfy_base_url` is a config key, defaulting to `https://ntfy.sh`

### Config Keys

| Key | Default | Description |
|---|---|---|
| `ntfy_topic` | `` (empty) | ntfy.sh topic slug; leave blank to disable |
| `ntfy_base_url` | `https://ntfy.sh` | ntfy server URL |
| `notify_on_tier` | `1` | Minimum consensus tier to trigger a push (1, 2, or 3) |

Notifications are sent when a consensus signal is computed with `tier >= notify_on_tier` and `notified = 'N'` in the consensus tab.

---

## 10. Schwab Integration

### CSV Format

Schwab transaction exports use the header:
```
Date, Action, Symbol, Description, Quantity, Price, Fees & Comn, Amount
```

The file is named in the pattern `Joint_Tenant_XXX805_Transactions_YYYYMMDD-HHmmss.csv`. The parser searches for the header row by regex (`/^date,action,symbol/i`) rather than assuming it is line 0, because Schwab sometimes prepends account information lines.

### Amount Format

Negative amounts use parenthesis notation: `($21.42)` = -21.42. `$21.42` = +21.42. The `_parseAmount()` function strips `$`, `,`, whitespace, then checks for surrounding parentheses to determine sign.

### Position-Affecting Actions

Only these action values change share quantities:

| Raw action | Normalized |
|---|---|
| `Buy` | `buy` |
| `Sell` | `sell` |
| `Reinvest Sha` / `Reinvest Shares` | `reinvest sha` / `reinvest shares` |
| `Qual Div Reir` / `Qualified Dividend Reinvestment` | `qual div reir` / `qualified dividend reinvestment` |
| `Reinvest Dividend` | `reinvest dividend` |

### Ignored Actions

`MoneyLink Transfer`, `Bank Interest`, `Dividend`, `Wire Funds`, and any other cash-only actions are parsed but skipped when deriving positions.

### Position Derivation

`derivePositions()` aggregates transaction history into current holdings:
- Buys / reinvestments: add quantity
- Sells: subtract quantity
- Positions with `|quantity| < 0.0001` are discarded (fully sold out)
- `avg_cost` = `cost_basis / quantity` (cost basis is sum of `amount_abs` for all position-affecting transactions)

### Current Account State (as of 2026-03-14)

Account: Joint Tenant ...805

| Field | Value |
|---|---|
| Total market value | $2,330.18 |
| Total cost basis | $2,165.94 |
| Total gain/loss | +$164.24 (+7.58%) |
| Cash & equivalents | $335.06 |
| Account total | $2,665.24 |
| Equity value | $2,045.87 |
| ETF/CEF value | $259.89 |

46 real positions (44 equities + 2 ETFs/CEFs: IAU, QYLD). Positions effectively excluded: OPITQ ($0.17 market value, -99.44%) and FISKER (bankrupt, $0.00).

Two separate CSVs can be uploaded: a **transactions export** (detected by filename containing "transaction" or content containing "action") which runs through `parseTransactionsCsv` + `derivePositions`, and a **positions export** which runs through `parsePositionsCsv` directly. The positions export includes live market values; the transactions export only derives quantity and average cost.

---

## 11. Stock Slice Strategy

### Schwab Stock Slices — Rules

- Minimum 1 stock (app UI presets: 1, 3, 5, 10)
- Maximum 30 stocks
- Minimum $5 per stock
- Minimum total for 3 stocks: $15 (displayed in the modal as a validation hint)

### S&P 500 Eligibility

`getSP500Tickers()` in `src/services/sp500.js`:
- Fetches `https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv` (the DataHub.io S&P 500 dataset, updated on constituent changes)
- Cached in localStorage key `sp500_tickers` for 30 days (`CACHE_TTL = 30 * 24 * 60 * 60 * 1000`)
- On fetch failure, falls back to a hardcoded set of ~100 large-cap members embedded in the file

Schwab Stock Slices are restricted to S&P 500 members. S&P eligibility is displayed as an `S&P` badge on allocation rows in the Follow modal.

### AI-Weighted Allocation

The `sliceAllocation` prompt instructs the AI to:
1. Respect the $5 minimum per stock
2. Cap at 30 stocks
3. Sum amounts to exactly `totalAmount`
4. Weight by signal strength (the disclosing politician's ticker gets `1.0`; additional tickers get decreasing weights `0.5 - i * 0.05`)
5. Underweight tickers the user already holds heavily (based on `mkt_value` from current positions)

The response is expected as a JSON array. If the AI fails or the JSON cannot be parsed, the fallback is an even split: `Math.floor(amount / count / 5) * 5` per stock (rounded down to nearest $5).

---

## 12. Known Issues and Bugs Fixed

### 429 Rate Limit on Startup

**Problem:** On first sign-in (or after tabs are missing), `_ensureAllTabs()` was calling `appendRows()` once per tab to write headers. With 9 tabs this burst 9 consecutive Sheets API writes immediately after spreadsheet creation, reliably hitting the Google Sheets API rate limit (429).

**Fix:** All header writes are batched into a single `values.batchUpdate` call with all 9 tab ranges in the `data` array. One API call regardless of tab count. This is idempotent — writing to row 1 always overwrites the header safely.

### Tabs Created Without Headers

**Problem:** `connect.js` created tabs via `spreadsheets.batchUpdate` (the structural operation) but `_ensureAllTabs()` only wrote headers to *missing* tabs, not to tabs that already existed. On a fresh spreadsheet where all tabs were pre-created by connect.js, headers were never written.

**Fix:** `_ensureAllTabs()` now always writes headers for all tabs in SCHEMA, not just newly created ones. The `values.batchUpdate` call is unconditional (not gated on `missing.length > 0`).

### `_withRetry` Exponential Backoff

Wraps any Sheets API call that may encounter 429. Retry schedule:

| Attempt | Delay before retry |
|---|---|
| 1 | 2s |
| 2 | 4s |
| 3 | 8s |
| 4 | 16s |
| 5 | 30s (capped) |

The cap is `Math.min(delay * 2, 30000)`. After 5 attempts the error is rethrown. Used on `appendRows` and the header batch write. Not used on read operations (reads rarely 429).

---

## 13. Design System

### Inspiration

Visual references: craft.do, linear.app, fey.com, Monarch Money. The aesthetic is refined dark-mode productivity tool — not a Bloomberg terminal, not a retail brokerage app.

### Colors

| Variable | Value | Usage |
|---|---|---|
| `--bg-base` | `#0d0d0d` | Page background |
| `--accent` | `#e8d5b0` | Warm parchment — primary accent |
| `--buy` | Muted green | Positive gain / buy badge |
| `--sell` | Terracotta | Negative gain / sell badge |

**Deliberate choice:** Green/red were avoided for buy/sell because they create anxiety and are cliche in finance UIs. Muted green and terracotta communicate directionality without the alarm-system feel.

### Typography

| Variable | Font | Usage |
|---|---|---|
| `--font-sans` | Inter | All UI text |
| `--font-mono` | JetBrains Mono | Tickers, prices, numbers, code |

### Component Conventions

- Cards use `var(--bg-raised)` background with `var(--border-soft)` border
- Consensus banner uses `var(--accent-glow)` background with accent border
- Trade cards dim to `opacity: 0.4` after a decision is recorded
- The Follow modal slides up from the bottom (sheet pattern), anchored at `align-items: flex-end`
- `env(safe-area-inset-bottom)` is applied to the modal to respect iOS home indicator

---

## 14. Environment Variables

All in `.env.local`. This file is gitignored and must never be committed.

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 Web Client ID (`xxx.apps.googleusercontent.com`). Create at `console.cloud.google.com` → APIs & Services → Credentials → OAuth 2.0 Client IDs. Type: Web application. Add `http://localhost:5175` as an authorized JavaScript origin and `https://{username}.github.io` for production. |
| `VITE_GEMINI_API_KEY` | If using Gemini | Gemini API key from `aistudio.google.com`. Can also be stored in the config tab post-auth under `gemini_api_key`. The env var is used as pre-auth fallback only. |
| `VITE_AI_PROVIDER` | No | `ollama` or `gemini`. Overridden by `ai_provider` in config tab once signed in. |
| `VITE_GEMINI_MODEL` | No | Model name fallback used before Sheets is connected. Normally left unset. |

The config tab in Google Sheets takes precedence over all env vars once the user is signed in. Env vars are only the bootstrap defaults used during the auth flow before Sheets is accessible.

---

## 15. Build and Deploy

```bash
# Development
npm run dev
# → http://localhost:5175/Stock-Trader-Helper/

# Production build
npm run build
# → dist/

# Deploy to GitHub Pages
npm run deploy
# → runs: npm run build && gh-pages -d dist
```

The `base: '/Stock-Trader-Helper/'` in `vite.config.js` ensures all asset paths are correct for the GitHub Pages subdirectory deployment. The PWA `scope` and `start_url` match this base path.

The service worker (`autoUpdate` register type) will auto-update when a new build is deployed — users don't need to manually clear cache.

For the OAuth client to work on the deployed URL, `https://{github-username}.github.io` must be added as an authorized JavaScript origin in the Google Cloud Console credential, in addition to `http://localhost:5175` for local development.
