# Stock Trader Helper

## Context
Personal PWA that mirrors US congressional stock trades and helps decide which Schwab Stock Slices to buy.
Built for a single user running on GitHub Pages with Google Sheets as a free persistent database.
Stack: Vite + VitePWA, vanilla JS ES modules, Google Sheets API v4, Google OAuth GIS implicit flow,
House Stock Watcher S3 API, Gemini AI (primary in prod, Ollama fallback locally), ntfy.sh push alerts,
craft.do-inspired dark design. No backend — everything runs in the browser.

## MVP Acceptance Criteria (v1)
1. Feed tab loads real congressional trades from HSW, filtered by watchlist
2. Positions tab loads from uploaded Schwab CSV, data persists to Sheets
3. "What slices to buy with $X" — given a dollar amount, app recommends Schwab Stock Slice picks
   based on congressional consensus signals + user's current positions/allocations

## Repo Structure
```
src/
  api/
    googleSheets.js        # All Sheets API calls — batchGet, batchUpdate, clearTab, writeConfigBatch
    houseStockWatcher.js   # HSW fetch, normalize, consensus signals, 90-day trim, CORS proxy in dev
  data/
    mockPositions.js       # Sample positions for offline/unauthenticated dev
    sp500.js               # S&P 500 ticker set
  services/
    logger.js              # Structured logger — DEBUG/INFO/WARN/ERROR, flushes to Sheets log tab
    schwabParser.js        # Parse Schwab positions CSV + transactions CSV → canonical position shape
    aiService.js           # Gemini (prod) / Ollama (local) AI inference
  stores/
    config.js              # Config store — reads/writes Sheets `config` tab, single source of truth
    positions.js           # Positions store — reads/writes `my_positions` tab, in-flight dedup
  ui/
    app.js                 # App shell — home-first drill-down routing, navigate(viewName) pattern
    components/
      toast.js             # Toast notification component
    views/
      connect.js           # Google OAuth one-button sign-in, silent refresh, spreadsheet auto-create
      home.js              # Home dashboard — 4 summary cards (What's New, Signal, Portfolio, Buy)
      feed.js              # Feed drill-down — 3-state trade cards (collapsed/expanded/followed/ignored)
      positions.js         # Positions view — CSV upload, stat summary, position cards
      whatToBuy.js         # What to Buy — $X input + ranked mock slice picks with alignment indicator
      followModal.js       # AI follow/ignore decision modal
      settings.js          # Settings view — editable config keys
styles/
  main.css                 # craft.do dark design system — CSS variables, card, stat-row, btn, toast
docs/
  learnings/
    good.md
    bad.md
    LEARNINGS.md
vite.config.js             # Port 5175, /api/hsw proxy (dev CORS fix), VitePWA, base /Stock-Trader-Helper/
.env.local                 # VITE_GEMINI_API_KEY, VITE_AI_PROVIDER, VITE_GOOGLE_CLIENT_ID
```

## Key Architecture Decisions
- **Navigation**: Home dashboard + drill-down. `navigate(viewName)` in `app.js`. Back button in header. All views receive `(container, { navigate })`. `window._navigate` exposed globally.
- **UI-first build order**: All views use hardcoded mock data in Phase 1. Real API wiring happens in Phase 3. Never import from stores/api in views during UI build phase.
- **Async render pattern**: `navigate()` must `await` async render calls or errors silently escape the try/catch. Always wrap render dispatch in `async/await`.
- **Non-blocking boot**: `renderApp()` fires immediately after auth check. Sheets init runs in background `_connectSheets()`. App never shows a loading screen after auth.
- **Sheets as DB**: 9 tabs — `config`, `log`, `watchlist`, `disclosures`, `consensus`, `recommendations`, `my_decisions`, `my_allocations`, `my_positions`. All writes use `values:batchUpdate`. All reads use `values:batchGet` for dedup.
- **In-flight dedup**: Both HSW fetch (`_fetchInFlight`) and positions load (`_loadInFlight`) deduplicate concurrent callers. Never fires two parallel Sheets/S3 requests for the same resource.
- **10s Sheets timeout, 15s HSW timeout**: All fetch calls wrapped in AbortController to prevent hung connections from blocking UI.
- **CORS fix (dev only)**: Vite proxies `/api/hsw` → S3. Production uses direct S3 URL. `import.meta.env.DEV` switches the URL.
- **CSV upload replace-not-append**: `clearTab('my_positions')` before `appendRows` on every CSV upload.
- **Token age**: Tokens expire at 60min. Silent refresh triggered at 50min. Hard auth errors (401/403) clear `sth_auth` from localStorage.

## Google Sheets Schema
| Tab | Columns |
|-----|---------|
| config | key, value |
| log | timestamp, level, category, message |
| watchlist | name, party, state, active |
| disclosures | id, politician_name, party, ticker, action, amount_low, amount_high, transaction_date, disclosed_date |
| consensus | id, signal_date, party, tickers, member_count, party_total, pct_of_party, window_days, tier, notified, ai_summary, created_at |
| recommendations | id, ticker, action, confidence, ai_summary, source, created_at |
| my_decisions | id, ticker, decision, reason, ai_summary, politician_context, created_at |
| my_allocations | ticker, target_pct, current_pct, notes |
| my_positions | ticker, quantity, avg_cost, mkt_value, gain_loss, gain_loss_pct, last_csv_upload, source |

## Role Shifting
At the start of new features, threads of thought, or when the task nature changes, ask: **"What role should I play for this?"**

Roles:
- **Expert Solution Designer** — end-to-end problem solving, tradeoffs, system thinking
- **UI/UX Expert** — layout, flow, hierarchy, user empathy, interaction design
- **Expert Coder** — clean implementation, performance, patterns, tests
- **Deep Data Expert** — data modeling, pipelines, queries, analysis, transformation
- **Architect** — system boundaries, integration patterns, scalability, long-term structure

Rules:
- Proactively suggest a role shift when the task type changes (bug fix → new feature, backend → frontend, building → analyzing).
- Don't ask every message — ask when the *nature* of the work changes.
- Combinations are fine (e.g., "Architect + UI/UX"). Stay in the role until the task completes or I redirect.

## Self-Learning Architecture

### File Structure
- `docs/learnings/good.md` — Successful patterns, confirmed wins, reusable approaches
- `docs/learnings/bad.md` — Failed approaches, dead ends, errors with root causes
- `docs/learnings/LEARNINGS.md` — Master file, consolidated at milestones

### Rules
- **Auto-log to `bad.md`** on: build failures, runtime errors, reverted approaches, wasted cycles. Include: what was attempted, why it failed, what worked instead.
- **Auto-log to `good.md`** on: successful implementations, user-confirmed patterns, performance wins. Include: what was done, why it worked, when to reuse it.
- **Flag uncertain entries** with `[?]` prefix — user confirms.
- **Read LEARNINGS.md on session start** — always check before making architectural decisions.
- **Milestone rollup** — after each feature lands, consolidate good/bad into LEARNINGS.md. Keep master lean.
- **Proactive suggestions** — if a pattern emerges (repeated error, emerging convention, architectural drift), suggest adding it without waiting.

## Model Routing

### Routing Rules
- **Haiku** — boilerplate, scaffolding, file ops, config generation, repetitive transforms, dependency installs, web search/fetch/retrieval
- **Sonnet** — interpret search results, business logic, debugging, moderate-complexity features, code review
- **Opus** — architecture decisions, complex refactors, multi-file rewrites, ambiguous high-stakes problems

### Search Pattern
When a task requires web research: Haiku fetches and retrieves → Sonnet reads, interprets, and decides. Never use Sonnet or Opus to do the fetching itself.

### Sub-Agents
- Default to sub-agenting. Parallelize aggressively. Target is time-to-return, not cost.
- Sub-agents default to Haiku. Escalate to Sonnet only if the subtask requires interpretation or complex logic.
- When a task can be split into 2+ independent pieces, split it. Don't serialize what can be parallelized.

## Logging
Structured logger in `src/services/logger.js`. Levels: DEBUG, INFO, WARN, ERROR. Flushes to Sheets `log` tab in batches. Falls back to console when Sheets not connected. Every module uses `const CAT = 'MODULE_NAME'` and imports `{ debug, info, warn, error }`.

## Iteration Protocol
- All new features follow: Q&A → text outline → crude visual → full implementation
- **Wait for "go"** before executing batched instructions
- At natural breakpoints, pause and surface decisions that need input
- Default to a working visual over a perfect spec

## Working Style
- ALWAYS use `cd ~/Stock-Trader-Helper` in terminal blocks (not full /home/user paths)
- ALWAYS include git pull before starting the server
- ALWAYS kill the dev port before npm run dev
- Standard restart block (use this exact sequence every time):
  ```bash
  cd ~/Stock-Trader-Helper
  git pull origin claude/web-app-google-sheets-wt63b
  fuser -k 5175/tcp 2>/dev/null || true && npm run dev
  ```
- Every URL must be clickable
- On errors: log to `bad.md`, try one fix, surface to user with context if it fails
- `CLAUDE.md` updates triggered by user-confirmed success ("that works", "ship it"), not every commit

## GitHub Pages / Mobile Deployment
- **URL**: `https://chrisbertoia-design.github.io/Stock-Trader-Helper/`
- **Auto-deploys** on every push to `claude/web-app-google-sheets-wt63b` via `.github/workflows/deploy.yml`
- **Env vars**: `VITE_GOOGLE_CLIENT_ID` + `VITE_AI_PROVIDER` in `.env.production` (committed). `VITE_GEMINI_API_KEY` set as GitHub Actions secret.
- **Google OAuth**: `https://chrisbertoia-design.github.io` must be in Authorized JavaScript origins in Google Console — ✅ done
- **iOS Safari clickability**: Never use `div onclick` for navigation. Always use `<button>` elements — iOS Safari does not reliably fire click on divs even with `cursor:pointer` and inline `onclick`.

## User Devices & Testing Environment
- **Browser**: Chrome exclusively — on both Mac and mobile (iOS Chrome)
- **Devices**: Mac (primary dev/review) + iPhone (mobile testing via GitHub Pages)
- **Workflow**: Develops and reviews on Mac, bounces to iPhone for mobile QA via `https://chrisbertoia-design.github.io/Stock-Trader-Helper/`
- **Note**: iOS Chrome uses WebKit under the hood (Apple App Store rule) — same `<button>` tap-target rules apply as iOS Safari

## Known Backlog

### Active
| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BL-001 | Settings page fully visible on mobile (overflow-x fix + async/await) | P0 | ✅ Shipped |
| BL-002 | Performance audit + optimization (Sheets init parallel, writeConfigKey batch, in-flight dedup, retry delay) | P2 | ✅ Shipped (P0/P1 items done; P2 items below) |
| BL-003 | What to Buy pick count selector (defaults to rec count, max 30) | P1 | ✅ Shipped |
| BL-004 | Top Signal view — stocks ranked by member trading activity | P1 | ✅ Shipped |
| BL-005 | Home card routing + copy (Top Signal → topSignal, not whatToBuy) | P1 | ✅ Shipped |

### Pending
| ID | Title | Priority | Notes |
|----|-------|----------|-------|
| BL-006 | HSW JSON parse: move to Web Worker to unblock main thread on 30-50MB payload | P1 | Biggest perf win; needs Phase 3 wiring |
| BL-007 | `readTab` unbounded A:ZZ range → use schema column bounds | P2 | Reduces Sheets read latency |
| BL-008 | Skeleton/loading states for all views before Phase 3 API wiring | P2 | Prevents blank screen on real data fetches |
| BL-009 | localStorage cache for HSW → IndexedDB (quota + sync JSON.parse) | P2 | Prevents silent cache failures + 50MB re-downloads |
| BL-010 | PARTY_ROSTER config-driven (party_roster_d/r keys in config tab) | P2 | |
| BL-011 | Positions stale-data warning when last_csv_upload > N days | P2 | |
| BL-012 | Decisions history view | P2 | |
| BL-013 | Pick count selector: wire to live `recommendations` tab (currently mock) | P2 | Needs Phase 3 |
| BL-014 | Top Signal view: wire to live `consensus` tab (currently mock) | P2 | Needs Phase 3 |
| BL-015 | Persist HSW disclosures to `disclosures` tab | P3 | |
| BL-016 | Remove unused chart.js or implement portfolio chart | P3 | |
| BL-017 | Schwab CSV preview before commit | Backlog | |
| BL-018 | PWA installable on mobile (GitHub Pages, OAuth requires https origin) | Backlog | |
