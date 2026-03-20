# Stock Trader Helper

## Context
Personal PWA that mirrors US congressional stock trades and helps decide which Schwab Stock Slices to buy.
Built for a single user running on GitHub Pages with Google Sheets as a free persistent database.
Stack: Vite + VitePWA, vanilla JS ES modules, Google Sheets API v4, Google OAuth GIS implicit flow,
House Stock Watcher S3 API, Gemini AI (primary in prod, Ollama fallback locally), ntfy.sh push alerts,
craft.do-inspired dark design. No backend — everything runs in the browser.

**Core value prop:** "Follow the insiders" — translate congressional trading activity into monthly Schwab Stock Slice buy decisions.

**Use case:** Monthly fixed-amount DCA into Schwab Stock Slices. The app recommends which slices to buy; Schwab handles fractional share math at execution. Not a day-trading or real-time pricing tool.

## MVP Acceptance Criteria (v1)
1. Feed tab loads real congressional trades from HSW, filtered by watchlist
2. Positions tab loads from uploaded Schwab CSV, data persists to Sheets
3. "What slices to buy with $X" — given a dollar amount, app recommends Schwab Stock Slice picks
   based on congressional consensus signals + user's current positions/allocations

## Product Scope Boundaries (Non-Goals)
- **No live stock price API** — not in scope for Phase 1 or Phase 2. Schwab executes at market price. Do not add real-time pricing unless user explicitly re-opens this decision.
- **Congressional signal is the only signal** — no earnings data, analyst ratings, news sentiment, or technical indicators. Congress trades are the sole input to recommendations.
- **No backend ever** — all computation in browser. Google Sheets is the only persistence layer. Hard constraint.
- **Monthly DCA is the use case** — not day trading, not real-time alerts. The app surfaces one answer per month: "Given $X this month, which slices?"
- **Real financial data never in repo** — public GitHub Pages deployment. Use sanitized test fixtures only. `mockPositions.js` and `src/data/test-fixtures/` are the safe references.

## Phase Sequencing
Do not start a later phase until the prior phase is confirmed working.

1. **Phase 1 — Schwab data** (positions CSV → positions view) ✅ Done
2. **Phase 2 — Congressional API** (HSW live feed → BL-019, BL-020, BL-021)
3. **Phase 3 — Use data without AI** (What to Buy driven by real signals)
4. **Phase 4 — AI layer** (Gemini/Ollama follow/ignore rationale — BL-022, BL-023)

AI work (Phase 4) requires a Mac session with Ollama running locally. Do not begin Gemini wiring until Ollama flow is validated end-to-end. Do not start Phase 4 until Phase 3 is confirmed working.

## Repo Structure
```
src/
  api/
    googleSheets.js        # All Sheets API calls — batchGet, batchUpdate, clearTab, writeConfigBatch
    houseStockWatcher.js   # HSW fetch, normalize, consensus signals, 90-day trim, CORS proxy in dev
    ai/
      index.js             # AI router — model-agnostic, delegates to gemini or ollama by config
      gemini.js            # Gemini API client (production)
      ollama.js            # Ollama client (local dev fallback)
  data/
    mockPositions.js       # Real Schwab account snapshot used as mock (Joint Tenant ...805, 03/14/2026)
    watchlist.js           # Seed watchlist — politicians to track, seeded to Sheets `watchlist` tab
    test-fixtures/
      schwab-positions-sample.csv   # Schwab positions CSV sample for Playwright upload tests
  services/
    logger.js              # Structured logger — DEBUG/INFO/WARN/ERROR, flushes to Sheets log tab
    schwabParser.js        # Parse Schwab positions CSV + transactions CSV → canonical position shape
    sp500.js               # S&P 500 ticker set (moved from data/ to services/)
  stores/
    config.js              # Config store — reads/writes Sheets `config` tab, single source of truth
    positions.js           # Positions store — reads/writes `my_positions` tab, in-flight dedup
  styles/
    main.css               # craft.do dark design system — CSS variables, card, stat-row, btn, toast
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
      topSignal.js         # Top Signal view — mock consensus data, signal strength tiers
  main.js                  # Entry point — Google OAuth boot, renderApp() dispatch
docs/
  learnings/
    good.md
    bad.md
    LEARNINGS.md
  evals/
    ui-click-paths.md      # Canonical manual QA checklist — run on iOS Chrome before every release
tests/
  navigation.spec.js       # Playwright — routing, back button, reload persistence
  positions.spec.js        # Playwright — CSV upload, stats, position cards
  feed.spec.js             # Playwright — trade cards, expand/collapse, follow/ignore
  whatToBuy.spec.js        # Playwright — amount input, stepper, step 1→2 flow
  topSignal.spec.js        # Playwright — signal tiers, filter pills
  settings.spec.js         # Playwright — editable config fields
  debug.spec.js            # Playwright — dev/debug helpers
  helpers/
    auth.js                # Shared Playwright auth helpers (localStorage token injection)
playwright.config.js       # Playwright config — port 5175, baseURL, chromium
vite.config.js             # Port 5175, /api/hsw proxy (dev CORS fix), VitePWA, base /Stock-Trader-Helper/
.env.local                 # VITE_GEMINI_API_KEY, VITE_AI_PROVIDER, VITE_GOOGLE_CLIENT_ID
```

## Critical Rules (Read First)
These are the highest-impact rules — violations have caused production bugs or wasted hours.

1. **Vet every external API before writing any integration code** — before a single line of code depends on an external URL, verify: (a) the exact production URL returns 200, (b) CORS headers allow the production origin, (c) the hosting model is stable long-term (community S3 buckets and unofficial mirrors die without warning). The HSW S3 bucket (`bad.md` 2026-03-20) was publicly accessible for years then had public access revoked — the app burned multiple sessions debugging a dead endpoint. Vetting must happen in the architecture phase, not after the feature is built.
2. **Playwright `route.abort()` masks real API failures** — when tests intercept and abort network requests, both "real 403" and "test abort" trigger the same mock-data fallback code path. Tests pass green even though production is broken. **Action**: every view that has a mock-data fallback MUST have a dedicated test that asserts the mock-data banner is NOT shown when the real API is expected to succeed. See `bad.md` 2026-03-15 for the full incident.
3. **Never use `USER_ENTERED` for Sheets writes** — always `valueInputOption: 'RAW'`. `USER_ENTERED` converts ISO dates to numeric serials silently. (`bad.md` 2026-03-14)
4. **Always `<button>` for interactive elements on mobile** — `<div onclick>` and `<label>` wrapping hidden inputs do not reliably fire on iOS WebKit. (`good.md` 2026-03-15)
5. **Always kill port 5175 before `npm run dev`** — `fuser -k 5175/tcp 2>/dev/null || true` in every terminal block. Port conflicts cause silent stale-code serving.

## Key Architecture Decisions
- **Navigation**: Home dashboard + drill-down. `navigate(viewName)` in `app.js`. Back button in header. All views receive `(container, signal)`. `window._navigate` exposed globally.
- **UI-first build order**: All views use hardcoded mock data in Phase 1. Real API wiring happens in Phase 3. Never import from stores/api in views during UI build phase.
- **Async render pattern**: `navigate()` must `await` async render calls or errors silently escape the try/catch. Always wrap render dispatch in `async/await`.
- **Non-blocking boot**: `renderApp()` fires immediately after auth check. Sheets init runs in background `_connectSheets()`. App never shows a loading screen after auth.
- **Sheets as DB**: 9 tabs — `config`, `log`, `watchlist`, `disclosures`, `consensus`, `recommendations`, `my_decisions`, `my_allocations`, `my_positions`. All writes use `values:batchUpdate`. All reads use `values:batchGet` for dedup.
- **In-flight dedup**: Both HSW fetch (`_fetchInFlight`) and positions load (`_loadInFlight`) deduplicate concurrent callers. Never fires two parallel Sheets/S3 requests for the same resource.
- **10s Sheets timeout, 15s HSW timeout**: All fetch calls wrapped in AbortController to prevent hung connections from blocking UI.
- **CORS fix (dev only)**: Vite proxies `/api/hsw` → S3. Production uses direct S3 URL (`us-west-2` region). `import.meta.env.DEV` switches the URL. When updating the proxy target or prod URL, verify the S3 region matches.
- **CSV upload replace-not-append**: `clearTab('my_positions')` before `appendRows` on every CSV upload.
- **Token age**: Tokens expire at 60min. Silent refresh triggered at 50min. Hard auth errors (401/403) clear `sth_auth` from localStorage.
- **RAW valueInputOption for all Sheets writes**: Every `appendRows`, `updateCell`, and `writeConfigBatch` call uses `valueInputOption: 'RAW'`. Prevents Sheets from interpreting ISO date strings as date serials (the old USER_ENTERED bug that turned `2026-03-14` into a numeric serial on write).
- **`_parseDateField()` serial guard on read**: `stores/positions.js` detects numeric date serials (range 40000–60000) on read from Sheets and converts them via the Excel epoch offset `(n - 25569) * 86400 * 1000`. Ensures backward compat with any rows written before the RAW fix.
- **Flexible column matching in `parsePositionsCsv`**: `colIdx` map uses `h.includes('qty') || h.includes('quantity')` etc. rather than exact header string matching. Tolerates Schwab export variants (e.g. `Qty (Quantity)` vs `Quantity`).
- **CUSIP_TO_TICKER normalization in schwabParser**: 9-character all-caps alphanumeric symbols are treated as CUSIPs and mapped to tickers (e.g. `33813J106` → `IAU`). Handles Schwab's ETF fractional share representation in transaction history.
- **Positions snapshot CSV as primary upload path**: Positions export (Symbol/Quantity/Market Value columns) is the preferred upload; transactions CSV is supported as a fallback that derives positions by aggregating buy/sell history.
- **Zero-qty filter at 0.001 threshold**: Applied in both `derivePositions()` (parser) and in `renderPositions()` view layer. Removes fully-sold positions (transactions residuals) from both storage and display.
- **Build stamp in header**: `vite.config.js` injects `__APP_BUILD__` (e.g. `v0315.1402`) as a version indicator shown in the app header, derived at build time from UTC date/time.
- **AI router pattern**: `src/api/ai/index.js` is the single import point for all AI calls. Routes to `gemini.js` (production) or `ollama.js` (local) based on `config.ai_provider`. Views never import provider modules directly.
- **"What to Buy" is the hero screen**: The monthly decision tool. All other views (Feed, Positions) exist to inform it. Design and performance decisions prioritize this view.
- **Pick count parameters**: min=1, default=3, max=30. N picks selected always renders exactly N result cards. User-confirmed — do not change without explicit instruction.
- **Upload = replace, not append**: Positions data is a snapshot. Re-uploading replaces current state. UI copy should say "updated" not "added".
- **Upload hint must be explicit**: Upload UI must say "Schwab Positions CSV" (not just "CSV"). Transactions CSV produces zero-quantity positions and is not the correct input.
- **Mock data baseline**: `mockPositions.js` is derived from a sanitized Feb 2026 Schwab snapshot. Update when user's portfolio changes materially.
- **Mock fallback observability**: Every view with a mock-data fallback (feed, positions) shows an orange "Using sample data" banner. When wiring real APIs, add a Playwright test that asserts this banner is NOT present under normal conditions — otherwise test isolation hides real API failures.
- **S3 URL region verification**: HSW bucket is `us-west-2`. When changing any S3 URL, verify the region matches the bucket. Wrong region returns 403, not 404 — easy to misdiagnose as a permissions issue.
- **Format detection order for multi-format parsers**: When a file could match multiple parsers (e.g. Schwab positions vs transactions CSV), detect by the most specific header pattern first (transactions: `Date,Action,Symbol`), then fall back to the more general parser. Generic `includes('symbol')` matching catches both formats and produces wrong results.

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

### Bug Fix Protocol (REQUIRED — always follow this sequence)
When any bug is identified, follow this exact multi-agent flow:

**Step 1 — Architecture Assessment (Explore agent, foreground)**
Launch one Explore agent to read all affected files and produce a full bug report:
- Root cause with exact file + line numbers
- Why it happens (not just what)
- Impact on other views/modules
- Recommended fix approach per bug
Do NOT write any code yet. Wait for the assessment to complete.

**Step 2 — Parallel Code Fix Agents (one agent per bug, all launched simultaneously)**
After the assessment, launch one coding agent per distinct bug. All agents run in parallel:
- Each agent receives: the assessment excerpt for its bug, the exact files it must edit, and the fix approach
- Each agent reads its files, implements the fix, and returns
- Agents must NOT push — main agent handles git after all fixes land

**Step 3 — Commit + Push (main agent)**
After all fix agents complete, main agent: reviews diffs, commits with detailed message, pushes.

**Step 4 — Full Regression Run (MANDATORY)**
Run `npx playwright test` in full. Every test must pass. If any test fails, launch fix agents, commit, and re-run. Do not proceed until suite is green.

**Step 5 — Eval Agent (MANDATORY, background)**
After green regression, launch background eval agent to update `docs/evals/ui-click-paths.md` with regression tests for the bugs just fixed and any new interactive elements added.

**Step 6 — Fix + Repeat Loop**
If eval agent surfaces gaps or regressions: fix → commit → re-run full test suite → re-run evals. Loop until clean.

**Never declare done until: full test suite green AND evals updated.**

## Eval Protocol

### Purpose
`docs/evals/ui-click-paths.md` is the canonical pre-flight checklist. Every interactive element in every view must be listed. Run this checklist on iOS Chrome (GitHub Pages) before declaring any build ready.

### When to Run Evals
- After every bug fix push
- After every new view or interactive element is added
- Before any mobile QA session

### Eval Agent Instructions (use these EXACT instructions every time you spawn an eval agent)

> You are a test engineer writing a manual QA checklist for a mobile PWA (iOS Chrome, GitHub Pages).
> Your checklist must be **exhaustive** — every tap, every button, every pill, every input, every navigation path.
> No interactive element may be skipped. Assume the tester has never seen the app.
>
> **For each item, provide:**
> - [ ] **[View > Element]**: plain English description of exactly what to tap/type/swipe
> - **Before state**: what the UI looks like before the action
> - **Expected result**: exactly what changes — text, color, navigation, animation, toast, etc.
> - **Regression** (if applicable): which bug this test prevents from re-appearing
>
> **Coverage requirements — every view must include:**
> 1. **Navigation in**: how to reach this view from home
> 2. **Navigation out**: back button behavior, where it lands
> 3. **Every button**: normal tap, double-tap (should not double-fire), tap while disabled
> 4. **Every pill/filter**: first tap (activates), second tap on same (no change or deactivates), rapid successive taps on different pills (each should register correctly), all combinations
> 5. **Every card**: expand, collapse, re-expand
> 6. **Every input**: type value, clear value, submit empty
> 7. **Every async action**: what shows during load (skeleton/spinner), what shows on success, what shows on error
> 8. **Scroll behavior**: can scroll without crash, position resets on re-navigation
> 9. **Re-navigation**: leave view, return, verify state resets correctly
>
> **Crash regression section (always include):**
> - Rapid back-and-forth navigation (home→feed→home→feed 5 times fast)
> - Tap filter pills 10 times in rapid succession
> - Navigate away from positions while skeleton is loading
> - Open feed, follow a trade, navigate home, return to feed — followed state persists
>
> **Format**: Group by view. Use `###` headers. Markdown checkboxes. Be specific about color changes, exact text, exact timing.
> **Output file**: `docs/evals/ui-click-paths.md`

### Eval Agent Model
Use **Sonnet** for eval agents — they need to reason about expected behavior, not just retrieve files.

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
- **Test isolation awareness**: When Playwright tests use `route.abort()` or `route.fulfill()` to mock network requests, green tests do NOT prove the real API works. After wiring a real API, always verify in the browser (dev server or GitHub Pages) that real data loads — not just that tests pass.
- **Scope containment**: Do not propose new features or scope expansions until current phase milestones are shipped and confirmed. Surface scope suggestions only after the user says "what's next."
- **AI feature work (Epic 2)**: Only start in Mac sessions with Ollama running locally. Do not begin AI work on mobile-constrained sessions.

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

## Confirmed Working (do not regress)
| Feature | Status | Notes |
|---------|--------|-------|
| Google OAuth (GIS implicit flow) | ✅ Working | One-button sign-in, silent refresh at 50min, token in localStorage `sth_auth` |
| Google Sheets read/write | ✅ Working | batchGet/batchUpdate, all 9 tabs auto-provisioned on first connect |
| Sheets auto-create | ✅ Working | New spreadsheet created and saved to config if none exists |
| Home → 4 tile routing | ✅ Working | What's New→feed, Top Signal→topSignal, Portfolio→positions, Buy→whatToBuy |
| Back button navigation | ✅ Working | Header back button in all drill-down views |
| What to Buy — Step 1 UI | ✅ Working | Amount input + pick count stepper (capped at 29 available picks), pill quick-amounts |
| What to Buy — Step 2 results | ✅ Working | Ranked picks with allocation, alignment indicator, summary table; 29 mock picks available |
| Positions view | ✅ Working | Stats summary, position cards sorted by mkt value, mock fallback with banner |
| CSV upload — positions format | ✅ Working | Schwab positions export parsed via flexible colIdx map; mkt value, avg cost, G/L all captured |
| CSV upload — transactions format | ✅ Working | Auto-detected by header; buy/sell aggregated into derived positions; stock splits handled |
| CSV upload — iOS file picker | ✅ Working | Button→input.click() pattern; `<label>` alone not reliable on iOS WebKit |
| CSV upload — format-aware toast | ✅ Working | "N positions loaded from positions export" vs "N positions derived from M transactions" |
| Schwab positions flexible parsing | ✅ Working | `colIdx` map tolerates `Qty (Quantity)` and other column name variants across Schwab export versions |
| CUSIP → ticker normalization | ✅ Working | `CUSIP_TO_TICKER` map in schwabParser converts 9-char CUSIPs (e.g. `33813J106` → `IAU`) |
| Zero-quantity position filtering | ✅ Working | `< 0.001` threshold in both parser (`derivePositions`) and view layer (`renderPositions`) |
| Stale data warning | ✅ Working | Orange warning shown when `last_csv_upload` is > 7 days old; suppressed for mock data |
| Empty state in positions | ✅ Working | "No positions to display" message with upload hint shown when all positions filtered out |
| Home portfolio card — live data | ✅ Working | Calls `getPositionsSummary()` — shows real account total, G/L%, position count, last upload date |
| RAW Sheets writes | ✅ Working | All `appendRows`, `updateCell`, `writeConfigBatch` use `valueInputOption: 'RAW'` — no date serial bug |
| `_parseDateField()` serial guard | ✅ Working | Reads numeric Sheets date serials and converts via Excel epoch; backward compat with old rows |
| Top Signal view | ✅ Working | Mock consensus data, signal strength tiers |
| Settings view | ✅ Working | Editable config keys, scrollable on mobile |
| Feed view | ✅ Working | 3-state trade cards, follows/ignores, mock HSW data |
| Toast notifications | ✅ Working | Success/error/info, auto-dismiss |
| Structured logging | ✅ Working | Flushes to Sheets `log` tab when connected, console fallback |
| AbortController navigation | ✅ Working | Per-navigation signal; auto-removes listeners, guards stale async renders |
| Logger re-entrancy guard | ✅ Working | `_writing` flag prevents appendRows→debug→appendRows infinite recursion |
| Playwright test suite | ✅ Working | 75 tests across all views; run with `npx playwright test` |
| Reload view persistence | ✅ Working | sessionStorage `sth_last_view` restores active view on page reload |
| Build stamp in header | ✅ Working | `__APP_BUILD__` injected at build time; shown in app header (e.g. `v0315.1402`) |
| AI router | ✅ Working | `src/api/ai/index.js` routes to Gemini or Ollama based on `config.ai_provider` |
| Seed watchlist | ✅ Working | `src/data/watchlist.js` seeds `watchlist` tab on first Sheets connect |

### Active
| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BL-001 | Settings page fully visible on mobile (overflow-x fix + async/await) | P0 | ✅ Shipped |
| BL-002 | Performance audit + optimization (Sheets init parallel, writeConfigKey batch, in-flight dedup, retry delay) | P2 | ✅ Shipped |
| BL-003 | What to Buy pick count selector (defaults to rec count, max available) | P1 | ✅ Shipped |
| BL-004 | Top Signal view — stocks ranked by member trading activity | P1 | ✅ Shipped |
| BL-005 | Home card routing + copy (Top Signal → topSignal, not whatToBuy) | P1 | ✅ Shipped |
| BL-013 | Schwab positions CSV parsing (flexible colIdx, CUSIP normalization, zero-qty filter) | P0 | ✅ Shipped |
| BL-014 | RAW Sheets writes + `_parseDateField()` serial guard | P0 | ✅ Shipped |
| BL-025 | Home portfolio card wired to live `getPositionsSummary()` | P1 | ✅ Shipped |
| BL-026 | Stale data warning (> 7 days) + empty state message in positions view | P1 | ✅ Shipped |
| BL-027 | Format-aware upload toast (positions vs transactions) | P1 | ✅ Shipped |
| BL-028 | 29-pick mock pool in What to Buy (expanded from 10) | P2 | ✅ Shipped |
| BL-019 | Wire Feed view to real HSW congressional trades API | P0 | 🔲 Next |
| BL-020 | Wire Top Signal to live `consensus` tab (replace mock) | P0 | 🔲 Next |
| BL-021 | Wire What to Buy picks to live `recommendations` tab (replace mock) | P0 | 🔲 Next |
| BL-022 | AI: Gemini wiring for follow/ignore modal recommendations | P1 | 🔲 Next |
| BL-023 | AI: What to Buy ranked picks with Gemini rationale | P1 | 🔲 Next |

### Pending
| ID | Title | Priority | Notes |
|----|-------|----------|-------|
| BL-006 | HSW JSON parse: move to Web Worker to unblock main thread on 30-50MB payload | P1 | Biggest perf win |
| BL-007 | `readTab` unbounded A:ZZ range → use schema column bounds | P2 | Reduces Sheets read latency |
| BL-008 | Skeleton/loading states for all views | P2 | Positions already has skeleton |
| BL-009 | localStorage cache for HSW → IndexedDB (quota + sync JSON.parse) | P2 | Prevents silent cache failures |
| BL-010 | PARTY_ROSTER config-driven (party_roster_d/r keys in config tab) | P2 | |
| BL-011 | Positions stale-data warning when last_csv_upload > N days | P2 | ✅ Shipped as BL-026 |
| BL-012 | Decisions history view | P2 | |
| BL-015 | Persist HSW disclosures to `disclosures` tab | P3 | |
| BL-016 | Remove unused chart.js or implement portfolio chart | P3 | |
| BL-017 | Schwab CSV preview before commit | Backlog | |
| BL-018 | PWA installable on mobile (GitHub Pages, OAuth requires https origin) | Backlog | |
| BL-024 | history.pushState URL routing (Option C) | Backlog | Real URLs per view (`/feed`, `/positions`, etc.), survives reload, shareable links. Suggest when user says "I don't know what to do next" or there's no urgent work. |
