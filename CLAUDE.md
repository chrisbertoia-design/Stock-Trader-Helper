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

**Step 4 — Eval Agent (background)**
After push, launch a background eval agent to update `docs/evals/ui-click-paths.md` with regression tests for the bugs just fixed.

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
| What to Buy — Step 1 UI | ✅ Working | Amount input + pick count stepper (capped at available picks), pill quick-amounts |
| What to Buy — Step 2 results | ✅ Working | Ranked picks with allocation, alignment indicator, summary table |
| Positions view | ✅ Working | Stats summary, position cards sorted by mkt value, mock fallback with banner |
| CSV upload (Schwab transactions) | ✅ Working | Button→input.click() iOS fix, transactions format detected first, stock splits handled |
| Top Signal view | ✅ Working | Mock consensus data, signal strength tiers |
| Settings view | ✅ Working | Editable config keys, scrollable on mobile |
| Feed view | ✅ Working | 3-state trade cards, follows/ignores, mock HSW data |
| Toast notifications | ✅ Working | Success/error/info, auto-dismiss |
| Structured logging | ✅ Working | Flushes to Sheets `log` tab when connected, console fallback |

### Active
| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BL-001 | Settings page fully visible on mobile (overflow-x fix + async/await) | P0 | ✅ Shipped |
| BL-002 | Performance audit + optimization (Sheets init parallel, writeConfigKey batch, in-flight dedup, retry delay) | P2 | ✅ Shipped |
| BL-003 | What to Buy pick count selector (defaults to rec count, max available) | P1 | ✅ Shipped |
| BL-004 | Top Signal view — stocks ranked by member trading activity | P1 | ✅ Shipped |
| BL-005 | Home card routing + copy (Top Signal → topSignal, not whatToBuy) | P1 | ✅ Shipped |
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
| BL-011 | Positions stale-data warning when last_csv_upload > N days | P2 | |
| BL-012 | Decisions history view | P2 | |
| BL-015 | Persist HSW disclosures to `disclosures` tab | P3 | |
| BL-016 | Remove unused chart.js or implement portfolio chart | P3 | |
| BL-017 | Schwab CSV preview before commit | Backlog | |
| BL-018 | PWA installable on mobile (GitHub Pages, OAuth requires https origin) | Backlog | |
