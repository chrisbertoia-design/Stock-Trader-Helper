# UI Click-Path Pre-flight Checklist

**Purpose:** Run this checklist top-to-bottom in iOS Chrome before every mobile QA session and after any code change that touches navigation, event listeners, or async render paths. Each item is self-contained — no dependencies between groups unless noted.

**Setup:** Open `https://chrisbertoia-design.github.io/Stock-Trader-Helper/` in iOS Chrome. Sign in with Google if not already authenticated. Start from the Home view.

---

## 0. App Shell (persistent — every view)

- [ ] **Element:** STH wordmark in header
  **Expected:** Visible on every view. Tapping it does nothing (it is a `<span>`, not a button).

- [ ] **Element:** Build version string (monospace, right of wordmark)
  **Expected:** Shows a short build identifier (e.g. `v0.x.x` or a hash). Not blank, not `undefined`.

- [ ] **Element:** Sync dot (`#sync-status`)
  **Expected:** Small colored dot visible in header right area on every view.

- [ ] **Element:** Settings gear button (`⚙`) in header right
  **Expected:** Tapping navigates to Settings view. Button hides itself when Settings is active (gear disappears while on Settings). Back button becomes visible.

- [ ] **Element:** Back button (`←`) in header left
  **Expected:** Hidden on Home. Visible on every drill-down view (Feed, Positions, TopSignal, WhatToBuy, Settings). Tapping always returns to Home regardless of which view is active.
  **Regression:** Ensures `navigate('home')` fires and the back button re-hides itself.

- [ ] **Element:** Back button — tap while on Home
  **Expected:** Nothing breaks. The button is hidden (`hidden` class applied) so it should not be reachable, but if it were tapped it would call `navigate('home')` while already on home — which is a no-op (guard: `if (viewName === activeView) return`).

---

## 1. Home View

### Navigation cards

- [ ] **Element:** "What's New" card (top-left)
  **Expected:** Full card is tappable (rendered as `<button>`). Navigates to Feed view. Back button appears in header.

- [ ] **Element:** "Top Signal" card (top-right)
  **Expected:** Navigates to Top Signal view. Back button appears.

- [ ] **Element:** "My Portfolio" card (bottom-left)
  **Expected:** Navigates to Positions view. Back button appears. Skeleton shimmer shows before content loads.

- [ ] **Element:** "What to Buy" card (bottom-right)
  **Expected:** Navigates to What to Buy view. Back button appears. Step 1 input form renders.

### Visual state checks

- [ ] **Element:** New-badge dot on "What's New" card
  **Expected:** A small colored dot appears next to "What's New" title (mocked `newCount: 4 > 0`).

- [ ] **Element:** Tier badge on "Top Signal" card
  **Expected:** Shows "Tier 2" badge with accent styling.

- [ ] **Element:** Alignment score line on "My Portfolio" card
  **Expected:** Shows "● 2 of 3 aligned" in amber/accent color (not green, not red).

- [ ] **Element:** Greeting text above cards
  **Expected:** Shows time-appropriate greeting ("Good morning" / "Good afternoon" / "Good evening") and today's date in `Weekday, Month D` format.

---

## 2. Feed View

_Navigate: Home → What's New_

### Page structure

- [ ] **Element:** Page header
  **Expected:** "Recent Trades" title and count line render immediately (no async delay — mock data).

- [ ] **Element:** Trade cards list
  **Expected:** 5 trade cards render in order: Pelosi/NVDA, Crenshaw/MSFT, Khanna/AAPL, Tuberville/AMD, Pelosi/TSM.

### Card expand / collapse

- [ ] **Element:** Tap the collapsed body area of the first card (Pelosi NVDA)
  **Expected:** Expanded section slides in below — shows "AI Summary" label and the summary text. Card body is the tap target (`data-expand-target`).

- [ ] **Element:** Tap the same card body again while expanded
  **Expected:** Expanded section collapses (`display:none`). Card returns to collapsed height.

- [ ] **Element:** Tap to expand card 2, then tap to expand card 1 (both should be independently expandable)
  **Expected:** Both cards can be expanded simultaneously. Expanding one does not collapse another.

- [ ] **Element:** Tap the expanded AI Summary text itself
  **Expected:** Does not collapse the card (the tap target is `data-expand-target` on the body row only — the expanded section is a sibling, not a child of the body element, so tapping inside the expanded section does not trigger expand/collapse).

### Follow button

- [ ] **Element:** "Follow" button on any card
  **Expected:** Button text changes to "✓ Follow", background brightens, card gets a green left border (`3px solid var(--buy)`). The card stays visible.

- [ ] **Element:** Tap "Follow" again on an already-followed card
  **Expected:** Nothing changes — idempotent. No double-follow.

- [ ] **Element:** Follow state after navigating away and back
  **Expected:** Navigate to Home, navigate back to Feed. Previously followed card still shows "✓ Follow" styling (state is restored from localStorage `sth_trade_decisions`).

### Ignore button

- [ ] **Element:** "Ignore" button on any card
  **Expected:** Card animates opacity to 0, collapses height to 0, then is removed from DOM. Other cards remain. The remaining count in the header does not update (page-level subtitle is set at render time), but the card count in view is visually correct.

- [ ] **Element:** Ignore an already-ignored card (by refreshing and checking)
  **Expected:** On next load of Feed, the ignored card is not shown. Its `tradeId` is in localStorage `sth_trade_decisions` with value `"ignored"` and is filtered out before render.

- [ ] **Element:** Tap the Follow button after Ignore animation starts (race condition attempt)
  **Expected:** Follow handler guards `cardState.get(tradeId) === 'ignored'` — returns early. No crash.
  **Regression:** Listener accumulation fix — event is delegated on container, not re-attached on re-render.

- [ ] **Element:** Ignore all 5 cards
  **Expected:** After last card is removed, empty state renders on next visit to Feed: "No trades to show" title and subtitle.

### Button vs. card-body tap discrimination

- [ ] **Element:** Tap Follow/Ignore buttons while card is collapsed
  **Expected:** Follow/Ignore actions fire. Card body expand does NOT trigger (buttons call `e.stopPropagation()`).

- [ ] **Element:** Tap Follow/Ignore buttons while card is expanded
  **Expected:** Same — action fires, expand state unchanged.

---

## 3. Top Signal View

_Navigate: Home → Top Signal_

### Filter pills — party

- [ ] **Element:** "All" pill (default active, party filter)
  **Expected:** Active styling on load (accent border, accent color). All 6 signals visible.

- [ ] **Element:** "Dem" pill
  **Expected:** Pill becomes active (accent border + background). "Rep" becomes inactive. Signal list filters to D-majority tickers only (NVDA, AAPL, META, GOOGL — those where partyD >= partyR). Count label updates.
  **Regression:** Filter re-renders the view without accumulating stale event listeners — `_render()` replaces `container.innerHTML` entirely each time.

- [ ] **Element:** "Rep" pill
  **Expected:** Filters to R-majority tickers (MSFT, AMZN, GOOGL — partyR > partyD). Count updates.

- [ ] **Element:** "All" pill again after filtering
  **Expected:** Returns to full 6-signal list. All three party pills visually correct.

### Filter pills — action

- [ ] **Element:** "All" pill (action filter, second row)
  **Expected:** Default active. All signals shown.

- [ ] **Element:** "Buys" pill
  **Expected:** Filters to signals where buyCount > sellCount. All 6 mock signals qualify — count stays at 6.

- [ ] **Element:** "Sells" pill
  **Expected:** Filters to signals where sellCount > 0. All 6 mock signals have at least 1 sell — count stays at 6.

- [ ] **Element:** Combine party + action filter (e.g. "Rep" + "Buys")
  **Expected:** Both filters apply. Result count and cards reflect intersection.

### Window toggle buttons

- [ ] **Element:** "14d" button (default active)
  **Expected:** Active styling (accent border, accent color). Label below signal list says "last 14 days".

- [ ] **Element:** "30d" button
  **Expected:** Active styling transfers to 30d. Label says "last 30 days". Card list unchanged (window is display-only at mock level — all signals are returned regardless).

- [ ] **Element:** "90d" button
  **Expected:** Same pattern. "last 90 days" in count label.

- [ ] **Element:** Rapid-tap through all three window buttons
  **Expected:** No crash. Final active state matches last button tapped.
  **Regression:** AbortSignal guard (`if (signal?.aborted) return`) prevents stale render from overwriting new view.

### Signal cards

- [ ] **Element:** Each signal card — static render check
  **Expected:** Rank number (#1–#6), ticker in mono font, tier badge, member count, buy%, top trader name, party bar (blue left / red right), signal strength dots all visible.

- [ ] **Element:** "Buy →" button on any signal card
  **Expected:** Navigates to What to Buy view. Back button appears.

- [ ] **Element:** "Bipartisan" badge on NVDA, MSFT, AAPL, AMZN, META, GOOGL cards
  **Expected:** All 6 mock signals have both D and R > 0, so all should show the "Bipartisan" badge.

- [ ] **Element:** Signal strength indicator on NVDA (#1)
  **Expected:** `●●● Strong` in green (buy color). Tier 3.

- [ ] **Element:** Signal strength indicator on META (#5)
  **Expected:** `●○○ Weak` in tertiary/muted color. Tier 1.

---

## 4. Positions View

_Navigate: Home → My Portfolio_

### Loading skeleton

- [ ] **Element:** Skeleton state on navigation
  **Expected:** 5 shimmer placeholder cards appear immediately while `loadPositions()` runs. "Loading positions…" subtitle visible.
  **Regression:** Prevents blank-flash race where async load overwrote the skeleton before render.

- [ ] **Element:** Skeleton → real content transition
  **Expected:** After load resolves, skeleton is replaced with stat summary and real position cards. No double-render or blank flash.
  **Regression:** `if (signal?.aborted || !container.isConnected) return` guard prevents stale async writes to a detached container.

### With mock data (unauthenticated or no Sheets)

- [ ] **Element:** "Sample data" subtitle and amber notice
  **Expected:** Subtitle shows "Sample data". Below the subtitle: "Using sample data — upload CSV to see your real positions" in accent color.

- [ ] **Element:** Stat row (Account Total, Total G/L, Positions, Cash)
  **Expected:** All four stats populated from mock summary. Values formatted as dollars and percentages.

- [ ] **Element:** Position cards sorted by market value
  **Expected:** Highest mkt_value card at top. CASH card(s) pinned to bottom regardless of value.

- [ ] **Element:** CASH position card
  **Expected:** Accent left border (3px), "CASH" label in accent mono font, dollar value. No G/L percentage shown.

- [ ] **Element:** Stock position card (any non-cash ticker)
  **Expected:** Ticker in bold mono, share count, market value, G/L percentage in green/red, avg cost below.

### CSV upload flow

- [ ] **Element:** "Upload CSV" button
  **Expected:** Tapping opens the device file picker (native iOS sheet). Does NOT show the `<input type="file">` directly — the button uses `.click()` on the hidden input to avoid iOS WebKit label-trigger bug.
  **Regression:** `<label>` elements do not reliably open file picker on iOS WebKit — the button uses `input.click()` instead.

- [ ] **Element:** Upload button while file picker is open
  **Expected:** Does not open a second picker or freeze.

- [ ] **Element:** Cancel file picker without selecting a file
  **Expected:** Nothing happens. Upload button remains labeled "Upload CSV". No error toast.

- [ ] **Element:** Select a valid Schwab transactions CSV
  **Expected:** Button label changes to "Parsing…" (disabled). After parse: button re-enables, success toast ("N positions loaded"), view re-renders with new positions data.

- [ ] **Element:** Select a valid Schwab positions CSV (non-transactions format)
  **Expected:** Same success flow. Detected by absence of `Date,Action,Symbol` header pattern.

- [ ] **Element:** Select a non-CSV or malformed file
  **Expected:** Error toast: "Could not parse CSV — use a Schwab transactions export". Button label resets to "Upload CSV". No crash.

- [ ] **Element:** Upload button state after failed parse
  **Expected:** Button is re-enabled (`disabled=false`, opacity reset). Not stuck in "Parsing…" or "Saving…".
  **Regression:** Error path in `reader.onload` always calls `_setBtnState('Upload CSV', false)` in catch block.

---

## 5. What to Buy View

_Navigate: Home → What to Buy_

### Step 1 — Input form

- [ ] **Element:** Amount input field
  **Expected:** Pre-filled with `150`. Focused state shows accent border. Blur returns to soft border. Accepts numeric input.

- [ ] **Element:** Amount input — type a number and clear
  **Expected:** If a previous error message is shown, it disappears on first keystroke (`#amount-error` removed on `input` event).

- [ ] **Element:** `$150` quick-amount pill
  **Expected:** Tapping sets input value to `150`. Any prior error clears. "Get N Picks →" button label updates.

- [ ] **Element:** `$250` pill
  **Expected:** Sets input to `250`.

- [ ] **Element:** `$500` pill
  **Expected:** Sets input to `500`.

- [ ] **Element:** `$1,000` pill
  **Expected:** Sets input to `1000`.

- [ ] **Element:** Pick count decrement button (`−`)
  **Expected:** Decrements count display by 1 each tap. Floors at 1 — cannot go below 1.

- [ ] **Element:** Pick count increment button (`+`)
  **Expected:** Increments count display by 1 each tap. Caps at `MOCK_PICKS.length` (currently 3) — cannot exceed available picks.

- [ ] **Element:** Decrement past minimum (tap `−` when count is already 1)
  **Expected:** Count stays at 1. Button does not crash or go negative.

- [ ] **Element:** Increment past maximum (tap `+` when count is already 3)
  **Expected:** Count stays at 3 ("3 available" shown). Button does not go to 4+.

- [ ] **Element:** "Get N Picks →" button label
  **Expected:** Updates dynamically as pick count or amount changes. Shows correct pluralization ("Get 1 Pick →" vs "Get 3 Picks →").

- [ ] **Element:** Slice warning message
  **Expected:** If amount ÷ pick count < $5, a red warning appears below the button: "Minimum $5 per slice — reduce picks or increase amount." Warning disappears when the ratio is valid again.

- [ ] **Element:** "Get N Picks →" button — tap with empty/zero amount input
  **Expected:** Error message appears below input: "Enter an amount to continue". Does not navigate to Step 2.

- [ ] **Element:** "Get N Picks →" button — tap with amount below $50
  **Expected:** Error: "Enter an amount between $50 and $10,000". Does not navigate.

- [ ] **Element:** "Get N Picks →" button — tap with amount above $10,000
  **Expected:** Same bounds error. Does not navigate.

- [ ] **Element:** Enter key while in amount input
  **Expected:** Same validation and submit behavior as tapping the button. Does not add a newline or lose focus silently.

- [ ] **Element:** "Get N Picks →" button — tap with valid amount (e.g. $150, 3 picks)
  **Expected:** Transitions to Step 2. Input form disappears. Results card appears with "Recommended Slices" heading.

### Step 2 — Results

_Reach Step 2 by entering $150 and tapping "Get 3 Picks →"_

- [ ] **Element:** Amount header (top right of card)
  **Expected:** Shows "$150" in mono font.

- [ ] **Element:** "← Change amount" link
  **Expected:** Tapping returns to Step 1 with empty/default input. No navigation (it re-renders within the same container via `renderWhatToBuy(container)`).

- [ ] **Element:** Pick count label ("3 picks · based on recent signals")
  **Expected:** Reflects the pick count entered in Step 1.

- [ ] **Element:** Portfolio match line
  **Expected:** Shows alignment summary e.g. "2 aligned · 1 gap" with color-coded values.

- [ ] **Element:** Pick card #1 (NVDA)
  **Expected:** Rank "#1", ticker "NVDA", allocated amount and percentage, rationale text, "✓ You followed this trade" (followed=true), "✅ Aligned with your portfolio" badge.

- [ ] **Element:** Pick card #2 (MSFT)
  **Expected:** "Gap: you own $0", "🔵 You don't own this yet — gap opportunity" badge.

- [ ] **Element:** Pick card #3 (AAPL)
  **Expected:** "You own $4,200 — small add.", "✅ Aligned with your portfolio" badge.

- [ ] **Element:** Order Summary table
  **Expected:** Three rows (NVDA, MSFT, AAPL) each showing BUY and allocated dollar amount. Total row at bottom. All amounts formatted as integers (rounded to nearest $25).

- [ ] **Element:** Total in Order Summary
  **Expected:** Equals sum of individual pick amounts (may differ from input due to $25 rounding).

- [ ] **Element:** Step 2 with 1 pick (go back and set count to 1)
  **Expected:** Only NVDA shows. Order Summary has 1 row. Pick label says "1 pick" (singular).

- [ ] **Element:** Step 2 with 2 picks
  **Expected:** NVDA and MSFT only. Portfolio match reflects only those 2 picks.

---

## 6. Settings View

_Navigate: tap the ⚙ gear in header from any view_

### Header behavior

- [ ] **Element:** Settings gear button while on Settings
  **Expected:** Gear button is hidden (`hidden` class). There is no way to navigate to Settings from Settings — this prevents a re-render loop.

- [ ] **Element:** Back button while on Settings
  **Expected:** Visible. Tapping returns to Home.

### Page structure

- [ ] **Element:** Settings page — scrollability on mobile
  **Expected:** All 4 sections (Consensus Thresholds, AI Provider, Notifications, Debug & Logging) are reachable by scrolling. Content is not clipped by the header.
  **Regression:** BL-001 — Settings was previously unscrollable on mobile due to overflow-x on the container.

- [ ] **Element:** "Save to Sheets" button at top
  **Expected:** Visible and tappable. Does not scroll out of view on mobile.

### Consensus Thresholds section

- [ ] **Element:** Tier 1 number input
  **Expected:** Shows `0.05`. Editable. Accepts decimal values.

- [ ] **Element:** Tier 2 number input
  **Expected:** Shows `0.10`.

- [ ] **Element:** Tier 3 number input
  **Expected:** Shows `0.25`.

- [ ] **Element:** Window (days) number input
  **Expected:** Shows `14`.

### AI Provider section

- [ ] **Element:** Provider select dropdown
  **Expected:** Shows "gemini" selected. Options: ollama, gemini.

- [ ] **Element:** Model Override text input
  **Expected:** Blank. Placeholder: "blank = use provider default".

- [ ] **Element:** Gemini API Key password input
  **Expected:** Blank. Input type is `password` — value masked.

- [ ] **Element:** Ollama Base URL text input
  **Expected:** Shows `http://localhost:11434`.

- [ ] **Element:** Gemini Default Model text input
  **Expected:** Shows `gemini-2.0-flash`.

### Notifications section

- [ ] **Element:** ntfy.sh Topic Slug text input
  **Expected:** Blank. Editable.

- [ ] **Element:** ntfy Server URL text input
  **Expected:** Shows `https://ntfy.sh`.

- [ ] **Element:** Notify from Tier select
  **Expected:** Shows "2" selected. Options: 1, 2, 3.

### Debug & Logging section

- [ ] **Element:** Log Level select
  **Expected:** Shows "INFO" selected. Options: DEBUG, INFO, WARN, ERROR.

- [ ] **Element:** Max Log Rows number input
  **Expected:** Shows `500`.

### Save button

- [ ] **Element:** "Save to Sheets" button — tap
  **Expected:** Toast notification appears: "Settings save available in Phase 2". No error. No navigation.

- [ ] **Element:** Footer note
  **Expected:** "Settings are stored in the `config` tab of your Google Sheet. You can also edit them directly in Sheets." visible at bottom. "Live settings sync available in Phase 2" in accent color below.

---

## 7. Navigation Path Matrix

Every from → to pair must be reachable and must leave no stale listeners or broken state.

- [ ] Home → Feed → Home (back button)
- [ ] Home → Feed → Home → Feed (re-enter same view — must re-render cleanly, not skip due to `activeView` guard)

  > Note: the guard `if (viewName === activeView) return` means navigating Home→Feed→Back→Feed will work because going back sets `activeView = 'home'`, so the second entry to Feed is a fresh render.

- [ ] Home → Top Signal → Home → Top Signal (filter state note: `_partyFilter`, `_actionFilter`, `_activeWindow` are module-level — they persist across navigations. This is expected behavior but verify it does not crash.)
- [ ] Home → Positions → Home
- [ ] Home → Positions → Home → Positions (second load should show skeleton then content again)
- [ ] Home → What to Buy → Home
- [ ] Home → What to Buy → (Step 2) → Change amount → (Step 1) → Get Picks → (Step 2) → Home (back)
- [ ] Home → Top Signal → Buy → button → What to Buy (via signal card "Buy →")
- [ ] Any view → Settings (gear) → Home (back)
- [ ] Home → Feed → Settings (gear) → Home (back) → Feed (re-enter)

---

## 8. Toast Notifications

_Toasts can be triggered from Positions (CSV upload) and Settings (Save button)._

- [ ] **Element:** Settings → "Save to Sheets" → toast
  **Expected:** Toast slides in from bottom (or top, per CSS). Text: "Settings save available in Phase 2". Auto-dismisses after ~3 seconds.

- [ ] **Element:** Toast dismiss animation
  **Expected:** Toast fades out with `leaving` animation class. Element is removed from DOM after animation ends (`animationend` listener). No orphaned toast elements accumulate.

- [ ] **Element:** Two rapid taps on "Save to Sheets"
  **Expected:** Two toasts stack (both appended to `#toast-container`). Both auto-dismiss. No crash.

---

## 9. Crash Regression Tests

These are targeted replays of bugs that were previously fixed.

- [ ] **Element:** Rapid navigation — tap Home cards quickly (4 taps in <1s)
  **Expected:** Last-tapped view renders correctly. No blank view. No JS error in console.
  **Regression:** `_navAbort.abort()` cancels the in-flight render of the previous view. The `AbortError` is swallowed silently. Without this fix, rapid taps could cause two views to fight over `container.innerHTML`.

- [ ] **Element:** Navigate to Positions, immediately tap back before skeleton resolves
  **Expected:** Home renders. Positions async callback fires but sees `signal.aborted === true` and exits without writing to the container.
  **Regression:** Stale async render after navigation — `if (signal?.aborted || !container.isConnected) return` guard in `renderPositions`.

- [ ] **Element:** Navigate Home → Top Signal → apply Dem filter → tap back → tap Top Signal again
  **Expected:** Top Signal view re-renders. Filter state shows last used party filter (module-level persistence). No duplicate event listeners fire (only one filter click produces one re-render).
  **Regression:** Listener accumulation — `_render()` passes `{ signal }` to `addEventListener`. When the AbortSignal fires on back-navigation, the old listeners are automatically removed by the browser.

- [ ] **Element:** Navigate to Feed, follow a trade, tap back, tap Feed again
  **Expected:** Followed state is restored. Only one click handler is active — clicking Follow once shows "✓ Follow" once (not duplicated).
  **Regression:** Feed uses a single delegated listener on `container` with `{ signal }` passed as options. Re-navigating creates a new container and a new listener — no accumulation.

- [ ] **Element:** Navigate to Positions, upload a CSV, wait for re-render, then tap back
  **Expected:** Home view shows. No error. Positions re-render after CSV parse uses `container.isConnected` guard so a back-navigation during "Saving…" does not cause a double-render.
  **Regression:** CSV upload re-calls `renderPositions(container, signal)` — if navigation occurred during the Sheets save, the guard aborts the re-render.

- [ ] **Element:** Open app with no internet connection
  **Expected:** App shell renders. Home view renders (mock data, no network calls). No crash or blank screen.

- [ ] **Element:** Open app, navigate to Positions with no Sheets connection
  **Expected:** Skeleton shows, then mock data renders. "Sample data" banner visible. No error toast from Sheets timeout.

---

## 10. Visual Regression Checks

Quick visual pass — not interaction-based.

- [ ] Home view fits within mobile viewport without horizontal scroll.
- [ ] Feed cards are full-width with readable text at default iOS Chrome font size.
- [ ] Top Signal filter pills are all visible on one row (3 party + 3 window buttons) without wrapping badly.
- [ ] What to Buy Step 1 card fits on screen without needing to scroll to reach "Get Picks" button.
- [ ] Positions stat row shows all 4 stats side-by-side without overflow.
- [ ] Settings page header ("Settings" + "Save to Sheets" button) is visible without scrolling.
- [ ] Settings page last section (Debug & Logging) is reachable by scrolling.
- [ ] All back buttons and the gear icon have a minimum 44×44pt tap target (iOS HIG requirement).

---

_Last updated: 2026-03-15. Regenerate when new views or interactive elements are added._
