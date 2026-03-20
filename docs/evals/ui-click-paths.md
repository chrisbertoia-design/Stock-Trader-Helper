# STH Mobile QA — Manual Click Path Checklist

**Target device**: iPhone running iOS Chrome (WebKit engine)
**Target URL**: https://chrisbertoia-design.github.io/Stock-Trader-Helper/
**Accent color**: warm parchment gold (`var(--accent)`, approximately `#c9b187`)
**Buy color**: muted green (`var(--buy)`, approximately `#7fb883`)
**Sell color**: muted red/rust (`var(--sell)`, approximately `#c47b6e`)
**Card animation**: 300ms ease transitions on opacity and max-height
**Toast duration**: 3000ms (3 seconds) auto-dismiss

---

## Pre-Flight

- [ ] **[App Load]**: Open the GitHub Pages URL cold (no cache) in iOS Chrome
  - **Before**: Blank tab
  - **Expected**: App shell renders immediately — dark background, "STH" wordmark in header top-left, build version string next to wordmark (small monospace text), sync dot in top-right, gear (⚙) button top-right, no back button visible, home view renders with greeting + 4 cards

- [ ] **[App Load > Greeting]**: Read the greeting text at the top of the home screen
  - **Before**: Home just loaded
  - **Expected**: Greeting reads "Good morning", "Good afternoon", or "Good evening" depending on the local time of day. Below it, today's date in format like "Sunday, March 15"

- [ ] **[App Load > Header back button]**: Confirm the back (←) button is NOT visible on home
  - **Before**: Home view active
  - **Expected**: Back button has class `hidden` and is not visible. Only the wordmark, version string, sync dot, and ⚙ button appear in the header.

---

## ### Home View

### Navigation In

- [ ] **[Home > Entry]**: Home is the default view — no tap required on cold load
  - **Before**: App just opened
  - **Expected**: Four card tiles visible in a vertical stack — "What's New", "Top Signal", "My Portfolio", "What to Buy"

### Cards — General

- [ ] **[Home > What's New card — live data loaded]**: Verify card content after HSW fetch resolves successfully with watchlist results
  - **Before**: Home loaded; `fetchAllTransactions()` resolved with N > 0 watchlist trades
  - **Expected**: Title "What's New" with a filled dot badge (new-badge, small colored dot) to the right of the title text when `newCount > 0`. Value row reads "N trade(s) since your last visit" where N is the actual filtered count (not hardcoded "4"). If N = 1, reads "1 trade since your last visit" (singular). Sub-row reads "[politician] · [TICKER] · [buy|sell] · [relative date]" sourced from the most recent watchlist trade (index 0 of the filtered array). Chevron "›" on the right side of the header row.
  - **Regression**: Prevents hardcoded "4 trades" from appearing regardless of real data; confirms live count from `filterByWatchlist()` is used.

- [ ] **[Home > What's New card — zero trades]**: Verify card content when fetch returns 0 watchlist results
  - **Before**: Home loaded; HSW fetch succeeded but filtered array has 0 entries (`newCount = 0`)
  - **Expected**: Value row reads "0 trades since your last visit". No new-badge dot is shown (badge is only rendered when `newCount > 0`). Sub-row reads "No recent trades on watchlist" in `var(--text-tertiary)` (muted/dim color), not the politician line. Card is still tappable and navigates to Feed.
  - **Regression**: Confirms fallback sub-row text appears and badge is absent when count is zero.

- [ ] **[Home > What's New card — API error / offline]**: Verify card content when `fetchAllTransactions()` throws
  - **Before**: Home loaded; device offline or HSW API unreachable; `fetchAllTransactions()` rejects
  - **Expected**: The `catch` block fires silently (no toast on Home). Value row reads "0 trades since your last visit". Sub-row reads "No recent trades on watchlist" in tertiary color. No badge dot. Card is still tappable and navigates to Feed.
  - **Regression**: Confirms silent fallback — home never shows a blank/error state because of a failed Feed API call.

- [ ] **[Home > What's New card — singular vs plural]**: Verify correct grammatical form for trade count
  - **Before**: Home loaded; exactly 1 trade in watchlist result
  - **Expected**: Value row reads "1 trade since your last visit" (no "s"). With 2+ trades it reads "N trades since your last visit". Grammar is driven by `newCount !== 1 ? 's' : ''` template literal.

- [ ] **[Home > What's New card — sub-row politician line format]**: Verify sub-row format when live data is present
  - **Before**: Home loaded with `topTrade` set (live data with ≥ 1 watchlist result)
  - **Expected**: Sub-row reads exactly "[politician_name] · [ticker] · [action] · [relative date]" — all lowercase action (buy/sell), relative date from `_relDate()` (today/yesterday/Nd ago), no trailing period. Example: "Nancy Pelosi · NVDA · buy · 2d ago". Source is `visible[0]` (most recent filtered trade).

- [ ] **[Home > Top Signal card]**: Verify card content
  - **Before**: Home loaded
  - **Expected**: Title "Top Signal". Value row shows "NVDA" in bold monospace, a tier badge labeled "Tier 2" in accent styling (amber/gold tint), and "· R + D" in secondary text color. Sub-row reads "14% of Congress buying · last 14 days · stocks by member activity".

- [ ] **[Home > My Portfolio card]**: Verify card content
  - **Before**: Home loaded
  - **Expected**: Title "My Portfolio". Value row shows "$12.5k" in bold, "+2.3" in green (buy color). Sub-row reads "8 positions". Below that: "Updated Mar 11 · Last buy Mar 7" in tertiary color. Below that: a colored dot + "2 of 3 aligned" in accent color (amber, because 2 of 3 is one less than total but not all-wrong).

- [ ] **[Home > What to Buy card]**: Verify card content
  - **Before**: Home loaded
  - **Expected**: Title "What to Buy". Value row reads "Ready to invest?". Sub-row reads "Enter an amount to get slice picks".

### Navigation Out — Each Tile

- [ ] **[Home > What's New tile tap]**: Tap the "What's New" card
  - **Before**: Home view, four tiles visible; card shows live trade count and top politician line (or "No recent trades on watchlist" if 0 results)
  - **Expected**: Feed view renders with skeleton, then live trade cards. Header back button (←) becomes visible. Settings (⚙) button is still visible. "Recent Trades" heading appears with trade cards below it. The tap works regardless of whether the card currently shows live data or the fallback "No recent trades" sub-row.
  - **Regression**: Catches iOS div-click non-firing — card is a `<button>` element, must register tap on iOS Chrome.

- [ ] **[Home > Top Signal tile tap]**: Tap the "Top Signal" card
  - **Before**: Home view
  - **Expected**: Top Signal view renders. Filter pills appear (All / Dem / Rep and All / Buys / Sells and 14d / 30d / 90d). Signal cards appear below. Back button visible.

- [ ] **[Home > My Portfolio tile tap]**: Tap the "My Portfolio" card
  - **Before**: Home view
  - **Expected**: Skeleton loading state appears briefly (5 shimmer cards with animated gradient). Then positions view renders with stat summary row and position cards. "Upload CSV" button visible. Back button visible.

- [ ] **[Home > What to Buy tile tap]**: Tap the "What to Buy" card
  - **Before**: Home view
  - **Expected**: What to Buy Step 1 renders. Amount input pre-filled with "150". Pick count stepper shows "3". Four quick-amount pills visible ($150, $250, $500, $1,000). "Get 3 Picks →" button at bottom. Back button visible.

### Double-tap Regression

- [ ] **[Home > What's New double-tap]**: Tap the "What's New" card twice in rapid succession
  - **Before**: Home view
  - **Expected**: Navigates to Feed exactly once. Does not double-render or show a blank intermediate state. `navigate()` guard (`if (viewName === activeView) return`) prevents second render.

- [ ] **[Home > Top Signal double-tap]**: Tap the "Top Signal" card twice in rapid succession
  - **Before**: Home view
  - **Expected**: Navigates to Top Signal exactly once.

### Settings Access from Home

- [ ] **[Home > Settings button]**: Tap ⚙ in the header
  - **Before**: Home view, ⚙ button visible
  - **Expected**: Settings view renders. Back button (←) appears. ⚙ button is now HIDDEN (toggled off when in settings view).

---

## ### Feed View

### Navigation In

- [ ] **[Feed > Entry path]**: From Home, tap "What's New" tile
  - **Before**: Home view
  - **Expected**: Feed view renders with skeleton immediately. After data loads, header shows ← back button and ⚙ button. "Recent Trades" heading visible. Subtitle reads "N disclosures · last 90 days" (live) or the mock subtitle. The first 5 trade cards are visible in default collapsed state. If more than 5 trades exist, a "Show more (N remaining)" button appears below the fifth card.

- [ ] **[Feed > Header subtitle]**: Open Feed and read the subtitle text below "Recent Trades" after data loads
  - **Before**: Feed skeleton cleared; live or mock data is displayed
  - **Expected**: Subtitle contains "last 90 days" — for example "N disclosures · last 90 days". It must NOT say "last 30 days".
  - **Regression**: Subtitle was hardcoded "last 30 days" even though the trade filter uses a 90-day window; the string was corrected to match the actual filter.

- [ ] **[Feed > Trade count]**: Open Feed after deploy and count visible trade cards
  - **Before**: Feed has loaded (live or seed data)
  - **Expected**: More than 5 trades are visible — either directly or after tapping "Show more" once. If seed data is active, there should be 30 trades spread across the last 90 days, so "Show more" will be present and tapping it reveals additional cards beyond the initial 5. At minimum, at least 6 cards should be reachable.
  - **Regression**: generate-trades.js was prompted to produce 2024-dated trades which fell outside the 90-day filter window, leaving only 5 seed trades visible and hiding all remaining cards.

### Trade Cards — Initial State

- [ ] **[Feed > Card 1 initial state]**: Inspect the first card (Pelosi / NVDA)
  - **Before**: Feed view just loaded
  - **Expected**: Party badge "D" in blue tint (color ~#6b9bd2, blue-tinted background). Politician name "Nancy Pelosi". Relative date in top-right ("4 days ago" or similar from 2026-03-11). Below: "NVDA" in large monospace bold, "BUY" in green (buy color), "$250k–$500k" in secondary text. No expanded section visible. "Follow" and "Ignore" buttons visible at the bottom of the card.

- [ ] **[Feed > Card 2 initial state]**: Inspect the second card (Crenshaw / MSFT)
  - **Before**: Feed view
  - **Expected**: Party badge "R" in red tint (color ~#c47b6e, red-tinted background). "Dan Crenshaw". "MSFT" in monospace, "BUY" in green, "$15k–$50k". Follow / Ignore buttons visible.

- [ ] **[Feed > Card 3 initial state]**: Inspect the third card (Khanna / AAPL)
  - **Before**: Feed view
  - **Expected**: Party badge "D" blue tint. "Ro Khanna". "AAPL" monospace, "SELL" in sell color (muted red/rust), "$50k–$100k". Follow / Ignore buttons.

- [ ] **[Feed > Card 4 initial state]**: Inspect the fourth card (Tuberville / AMD)
  - **Before**: Feed view
  - **Expected**: Party badge "R" red tint. "Tommy Tuberville". "AMD" monospace, "BUY" green, "$100k–$250k".

- [ ] **[Feed > Card 5 initial state]**: Inspect the fifth card (Pelosi / TSM)
  - **Before**: Feed view
  - **Expected**: Party badge "D" blue tint. "Nancy Pelosi". "TSM" monospace, "BUY" green, "$500k–$1M".

### Trade Cards — Expand / Collapse

- [ ] **[Feed > Card expand (tap body)]**: Tap the body area (name/ticker row, not the buttons) of the first card (NVDA)
  - **Before**: Card collapsed — only party badge, name, date, ticker, action, amount visible. Expanded section has `display:none`.
  - **Expected**: AI Summary section appears below the ticker row. Label "AI SUMMARY" in small uppercase tertiary text. Below: paragraph text about Pelosi's NVDA trades and committee timing. Below that: "Disclosed: Mar 13 · Traded: Mar 11" in small tertiary text. Card's `data-expanded` attribute becomes "true".

- [ ] **[Feed > Card collapse (re-tap body)]**: Tap the same card body again
  - **Before**: Card expanded, AI summary visible
  - **Expected**: AI summary section disappears (`display` set back to `none`). Card returns to collapsed state. `data-expanded` becomes "false".

- [ ] **[Feed > Card re-expand]**: Tap the card body a third time
  - **Before**: Card collapsed after first collapse
  - **Expected**: AI summary re-appears. Toggle works repeatedly without state corruption.

- [ ] **[Feed > Expand multiple cards simultaneously]**: Expand card 1, then tap card 2 body without collapsing card 1
  - **Before**: All cards collapsed
  - **Expected**: Both cards can be simultaneously expanded. Each card tracks its own `data-expanded` state independently.

- [ ] **[Feed > Collapse one, other stays expanded]**: With both card 1 and card 2 expanded, tap card 1 to collapse
  - **Before**: Card 1 and Card 2 both expanded
  - **Expected**: Card 1 collapses. Card 2 remains expanded. No cross-contamination between card states.

### Trade Cards — Follow Action

- [ ] **[Feed > Follow button tap]**: Tap "Follow" on card 1 (NVDA)
  - **Before**: Follow button shows text "Follow", background is subtle green tint (`rgba(127,184,131,0.12)`), border is faint green, no left border on card
  - **Expected**: Button text changes to "✓ Follow". Button background becomes a stronger green tint (`rgba(127,184,131,0.22)`). Border color becomes more opaque green (`rgba(127,184,131,0.4)`). Card gets a 3px left border in buy color (green). No toast appears. Decision saved to `localStorage` key `sth_trade_decisions`.

- [ ] **[Feed > Follow button double-tap]**: Tap "Follow" on a card that is already in followed state
  - **Before**: Card already shows "✓ Follow" with green left border
  - **Expected**: No change. The `alreadyFollowed` guard returns early — no duplicate localStorage writes, no visual flicker.

- [ ] **[Feed > Follow persistence check]**: Follow card 2 (MSFT), tap back to home, tap "What's New" to return to Feed
  - **Before**: Card 2 has been followed in a previous session of the Feed view
  - **Expected**: On re-render of Feed, card 2 MSFT shows "✓ Follow" text and green 3px left border. Followed state is loaded from `localStorage` on every render via `_loadDecisions()`.
  - **Regression**: Core persistence regression — confirms localStorage round-trip works.

### Trade Cards — Ignore Action

- [ ] **[Feed > Ignore button tap]**: Tap "Ignore" on card 3 (AAPL / Khanna)
  - **Before**: Card 3 visible with Ignore button
  - **Expected**: Card animates out — opacity transitions to 0, max-height and margins collapse over ~300ms. After ~320ms, the card element is removed from the DOM entirely. Remaining cards shift up to fill the space. No toast.

- [ ] **[Feed > Ignore animation timing]**: Watch the ignore animation carefully on a card
  - **Before**: Card visible
  - **Expected**: The collapse is smooth — opacity and height animate simultaneously. No snap or jump. Card element is fully removed approximately 320ms after the tap (300ms transition + 20ms buffer in `setTimeout(..., 320)`).

- [ ] **[Feed > Ignored card does not return]**: Ignore card 3, tap back to home, tap "What's New" to return to Feed
  - **Before**: Card 3 has been ignored (stored in localStorage as `'ignored'`)
  - **Expected**: Feed re-renders filtering out ignored trades. Card 3 (Khanna / AAPL) does not appear. The `visibleTrades` filter (`decisions[t.id] !== 'ignored'`) removes it before render.

- [ ] **[Feed > Empty state]**: Ignore all 5 visible cards one by one
  - **Before**: All 5 cards visible (assuming none were previously ignored)
  - **Expected**: After ignoring all cards, the feed shows the empty state: title "No trades to show", subtitle "No recent politician disclosures found." Header still shows "Recent Trades".

### Feed — Lazy-Load ("Show more")

- [ ] **[Feed > Show more > button appears on initial render]**: Load Feed when more than 5 non-ignored trades are available
  - **Before**: Feed skeleton just cleared; more than 5 trades in the visible (non-ignored) set
  - **Expected**: Exactly 5 trade cards are rendered in `#feed-cards`. Below the fifth card, a full-width ghost button labeled "Show more (N remaining)" is visible, where N = total visible trades minus 5. Button uses the `btn btn-ghost` classes, width 100%, font-size 13px.

- [ ] **[Feed > Show more > button absent when ≤ 5 trades]**: Load Feed when 5 or fewer non-ignored trades exist
  - **Before**: Feed loads with exactly 5 or fewer trades
  - **Expected**: No "Show more" button is rendered. All trades are visible immediately. `_buildShowMoreBtn()` returns an empty string when `remaining <= 0`.

- [ ] **[Feed > Show more > tap appends 5 more cards]**: With 10+ total visible trades, tap "Show more" once
  - **Before**: 5 cards visible; button reads "Show more (N remaining)" where N ≥ 5
  - **Expected**: 5 additional trade cards appear below the existing 5 without re-rendering the first 5. Existing cards retain their exact DOM state — expanded/collapsed state, followed styling, and left border are unchanged. Button label updates to "Show more (N−5 remaining)". Total card count in `#feed-cards` is now 10.
  - **Regression**: Confirms DocumentFragment append path: new cards are appended, not a full `innerHTML` replacement.

- [ ] **[Feed > Show more > existing card expand state preserved]**: Expand card 1 (tap its body), then tap "Show more"
  - **Before**: Card 1 is expanded (`data-expanded="true"`); summary section visible
  - **Expected**: After "Show more" appends 5 new cards, card 1 remains expanded. The expanded section is still visible. `data-expanded` is still `"true"`. No visual flicker or collapse on card 1.
  - **Regression**: Core lazy-load correctness — innerHTML replace would collapse all expanded cards; append must not.

- [ ] **[Feed > Show more > existing followed card preserved]**: Follow card 2 (tap its Follow button), then tap "Show more"
  - **Before**: Card 2 shows "✓ Follow" with green border; remaining cards are in default state
  - **Expected**: After "Show more" appends new cards, card 2 still shows "✓ Follow" with intensified green button background (`rgba(127,184,131,0.22)`) and 3 px green left border. The newly appended cards appear in their default (unfollowed) state. `_applyFollowedUI` was NOT re-run on card 2 (it retained its DOM state from before the append).
  - **Regression**: Follow state must survive "Show more" without being cleared or duplicated.

- [ ] **[Feed > Show more > newly appended cards — follow works]**: After tapping "Show more" to reveal new cards, tap "Follow" on one of the newly appended cards (e.g. card 6)
  - **Before**: New cards visible from "Show more"; card 6 shows "Follow" in default state
  - **Expected**: Card 6's Follow button changes to "✓ Follow" with green styling and 3 px left border. `sth_trade_decisions` in localStorage is updated with that trade's ID as "followed". The follow action works identically to cards from the initial render batch. `_attachHandlersForBatch()` wired the new cards' event listeners correctly.

- [ ] **[Feed > Show more > newly appended cards — ignore works]**: After tapping "Show more", tap "Ignore" on one of the newly appended cards (e.g. card 7)
  - **Before**: New cards visible; card 7 in default state
  - **Expected**: Card 7 animates out over ~300ms (opacity → 0, max-height collapse), then its element is removed from the DOM after 320ms. localStorage is updated. Remaining cards close the gap. The ignore animation is identical to the initial-batch cards.

- [ ] **[Feed > Show more > newly appended cards — expand/collapse works]**: After "Show more", tap the body of a newly appended card (e.g. card 8) to expand it
  - **Before**: Card 8 is collapsed
  - **Expected**: Card 8's expanded section becomes visible (`display: block`). `data-expanded` changes to `"true"`. The expand is triggered by the delegated `click` listener on the container, which covers both initial-batch and appended cards. No separate listener registration is needed for expand — it uses event delegation.

- [ ] **[Feed > Show more > button label updates correctly]**: With 12 total visible trades, tap "Show more" once
  - **Before**: 5 cards shown; button reads "Show more (7 remaining)"
  - **Expected**: After tap, 10 cards shown; button reads "Show more (2 remaining)". The label count reflects exactly `_allVisibleTrades.length - _displayCount`.

- [ ] **[Feed > Show more > button disappears on last batch]**: Tap "Show more" until all trades are visible
  - **Before**: Button shows "Show more (N remaining)" where N ≤ 5
  - **Expected**: After the final tap that shows the last remaining cards, the "Show more" button is removed from the DOM entirely (`btn.remove()` is called). No empty or disabled button remains. All trades are now visible.

- [ ] **[Feed > Show more > button disappears immediately when exactly 5 remain]**: 10 total trades; button reads "Show more (5 remaining)"; tap it
  - **Before**: 5 cards shown; exactly 5 remain
  - **Expected**: All 5 remaining cards append. `remaining = 10 - 10 = 0`. `btn.remove()` fires. Button is gone. No lingering "Show more (0 remaining)" label.

- [ ] **[Feed > Show more > double-tap does not duplicate cards]**: Tap "Show more" twice in rapid succession (~100ms between taps)
  - **Before**: "Show more" button visible with ≥ 5 remaining trades
  - **Expected**: Only one batch of 5 cards is appended. The second tap is rejected by the `_showMorePending` guard (`if (_showMorePending) return`). `_displayCount` increments only once. Total card count increases by exactly 5, not 10.
  - **Regression**: Core double-tap deduplication — without `_showMorePending`, rapid taps insert duplicate cards from the same batch indices.

- [ ] **[Feed > Show more > newly appended followed cards restored on re-render]**: Follow a trade from the second batch (e.g. card 8), navigate to Home, then return to Feed
  - **Before**: Card 8 was followed in a previous Feed session
  - **Expected**: On re-render, Feed shows the initial 5 cards. Card 8 is NOT in the first 5 (it requires a "Show more" tap). After tapping "Show more", card 8 appears and `_applyFollowedUI` is called during the append via `decisions[trade.id] === 'followed'` check. Card 8 shows "✓ Follow" with green border immediately on append.
  - **Regression**: Confirms `_attachShowMoreHandler` restores followed state on append, not just initial batch.

- [ ] **[Feed > Show more > navigate away mid-append is safe]**: Tap "Show more" and immediately tap ← back before the append completes
  - **Before**: "Show more" was tapped; `_showMorePending = true`; append code running synchronously
  - **Expected**: Home view renders correctly. No stale Feed content appears. The `signal` abort path and `container.isConnected` guard prevent any post-navigation DOM writes. The "Show more" operation is synchronous (no async), so in practice the append completes before the navigation handler runs — but no crash occurs either way.

- [ ] **[Feed > Show more > pagination resets on re-entry]**: Tap "Show more" twice (showing 15 cards), navigate to Home, return to Feed
  - **Before**: Feed was showing 15 cards (3 batches) on previous visit
  - **Expected**: On re-entry, Feed re-renders from scratch. `renderFeed()` resets `_displayCount = 5` and `_allVisibleTrades = visibleTrades`. Only the first 5 cards are shown. "Show more" button reappears with full remaining count. Previous pagination position is not preserved across navigations.

---

### Feed — Scroll

- [ ] **[Feed > Scroll to bottom — initial 5 cards]**: Scroll down through the first 5 trade cards before tapping "Show more"
  - **Before**: Feed at top; 5 cards and "Show more" button visible
  - **Expected**: All 5 cards and the "Show more" button are reachable by scrolling. Button is fully visible and tappable (not clipped by viewport). No content cut off at the bottom. Page does not crash or freeze.

- [ ] **[Feed > Scroll to bottom — after Show more]**: After tapping "Show more" once (10 cards now visible), scroll down
  - **Before**: 10 cards and optionally another "Show more" button visible
  - **Expected**: All 10 cards reachable. The "Show more" button (if present) is fully visible below card 10. No content clipped.

- [ ] **[Feed > Scroll back to top]**: After scrolling to bottom, scroll back to top
  - **Before**: Feed scrolled to bottom
  - **Expected**: Top of Feed visible again with "Recent Trades" heading. No jump or layout shift.

### Navigation Out

- [ ] **[Feed > Back button]**: Tap ← back button in header
  - **Before**: Feed view visible
  - **Expected**: Home view renders. Back button disappears. Four home tiles appear. Settings ⚙ button visible. Followed/ignored state from Feed does not affect Home card copy.

---

## ### Top Signal View

### Navigation In

- [ ] **[TopSignal > Entry path]**: From Home, tap "Top Signal" tile
  - **Before**: Home view
  - **Expected**: Top Signal view renders. Three filter rows appear. Signal cards appear below. Back button (←) visible. ⚙ button visible.

### Filter Row Layout

- [ ] **[TopSignal > Filter row 1 layout]**: Inspect the top filter row
  - **Before**: Top Signal just loaded
  - **Expected**: Left side: three pills "All", "Dem", "Rep" in a horizontal row. Right side: three smaller pills "14d", "30d", "90d". "All" party pill is active (accent-colored border, amber/gold tint background, accent text color). "14d" window pill is active (accent border, slight amber background).

- [ ] **[TopSignal > Filter row 2 layout]**: Inspect the second filter row
  - **Before**: Top Signal just loaded
  - **Expected**: Three pills "All", "Buys", "Sells" in a horizontal row below row 1. "All" action pill is active.

- [ ] **[TopSignal > Signal count text]**: Read the count text below filters
  - **Before**: Default filters (All party, All action, 14d window)
  - **Expected**: Text reads "7 stocks with congressional activity · last 14 days" (NVDA, MSFT, AAPL, AMZN, META, GOOGL, WMT — WMT is included because it is in the default All / All filter set)

### Party Filter Pills

- [ ] **[TopSignal > Party pill: All (default)]**: Confirm "All" is active on load
  - **Before**: Fresh load
  - **Expected**: "All" pill has `border: 1px solid var(--accent)` (amber border) and `background: rgba(201,177,135,0.12)` (subtle amber fill). Text color is accent. "Dem" and "Rep" pills have soft border and bg-elevated background with secondary text color.

- [ ] **[TopSignal > Party pill: tap Dem]**: Tap "Dem" pill
  - **Before**: "All" is active
  - **Expected**: "All" deactivates (loses accent border, returns to bg-elevated). "Dem" activates (accent border, amber tint background, accent text). Signal list re-renders showing only stocks where `partyD >= partyR`: NVDA (D=11≥R=8), AAPL (D=6≥R=4), META (D=4≥R=2), GOOGL (D=2<R=3 — excluded? No: D=2, R=3 means R>D, so excluded). Result: NVDA, AAPL, META — 3 stocks. Count text updates to "3 stocks with congressional activity · last 14 days".

- [ ] **[TopSignal > Party pill: tap same pill (Dem) again]**: Tap "Dem" again while it is already active
  - **Before**: "Dem" is active, list shows 3 stocks
  - **Expected**: Filter re-applies to same value. Same 3 stocks render. Pill stays styled as active. No visual glitch.

- [ ] **[TopSignal > Party pill: tap Rep]**: Tap "Rep" pill while Dem is active
  - **Before**: "Dem" is active
  - **Expected**: "Dem" deactivates. "Rep" activates. List re-renders showing stocks where `partyR > partyD`: MSFT (R=7>D=5), AMZN (R=5>D=3), GOOGL (R=3>D=2) — 3 stocks. Count updates.

- [ ] **[TopSignal > Party pill: return to All]**: Tap "All" while Rep is active
  - **Before**: "Rep" is active
  - **Expected**: "Rep" deactivates. "All" activates. Full 6-stock list restored.

- [ ] **[TopSignal > Party pill rapid succession]**: Tap All → Dem → Rep → All → Dem in rapid sequence (within ~1 second)
  - **Before**: "All" is active
  - **Expected**: Final state shows "Dem" active with 3-stock list (NVDA, AAPL, META). Each tap registers. No stuck state, no blank list, no crash.

### Action Filter Pills

- [ ] **[TopSignal > Action pill: All (default)]**: Confirm "All" action is active on load
  - **Before**: Fresh load
  - **Expected**: "All" pill is accent-bordered. "Buys" and "Sells" are inactive.

- [ ] **[TopSignal > Action pill: tap Buys]**: Tap "Buys" pill
  - **Before**: "All" action active
  - **Expected**: "All" deactivates, "Buys" activates. List re-renders showing stocks where `buyCount > sellCount`. All 6 mock stocks qualify (all have more buys than sells), so count stays 6.

- [ ] **[TopSignal > Action pill: tap Sells]**: Tap "Sells" pill
  - **Before**: "All" or "Buys" active
  - **Expected**: "Sells" activates. List shows ONLY stocks where `sellCount > buyCount`. From mock data only WMT qualifies (sellCount=7 > buyCount=2). Count text updates to "1 stock with congressional activity · last 14 days". NVDA, MSFT, AAPL, AMZN, META, and GOOGL do NOT appear — they are all buy-majority.
  - **Regression**: BUG-SELL-PILL — prior to fix, Sells filtered with `sellCount > 0`, causing all 7 stocks to appear. Correct filter is `sellCount > buyCount`, which yields only WMT.

- [ ] **[TopSignal > Action pill Sells — WMT card content]**: After tapping "Sells", inspect the single visible card
  - **Before**: "Sells" filter active, 1 stock visible
  - **Expected**: Card shows ticker "WMT". memberCount=6, buyCount=2, sellCount=7. Buy percentage shown as "22%" (2/9 total trades). Signal strength: "●●○ Moderate" (tier=2). Top trader "Collins". "Bipartisan" label (partyD=2 and partyR=4, both > 0).

- [ ] **[TopSignal > Action pill Buys — WMT absent]**: Tap "Buys" pill
  - **Before**: "All" action active, 7 stocks visible
  - **Expected**: "Buys" activates. List shows stocks where `buyCount > sellCount`. WMT has buyCount=2, sellCount=7, so WMT is excluded. NVDA, MSFT, AAPL, AMZN, META, GOOGL all appear (all are buy-majority). Count: "6 stocks with congressional activity · last 14 days".
  - **Regression**: BUG-SELL-PILL — WMT must NOT appear in the Buys filter.

- [ ] **[TopSignal > Action pill: return to All after Sells]**: Tap "All" action after Sells was active
  - **Before**: "Sells" active, 1 stock (WMT) visible
  - **Expected**: "All" reactivates, all 7 stocks restore. Count: "7 stocks with congressional activity · last 14 days".
  - **Regression**: BUG-SELL-PILL — verifies that returning to All restores all 7 stocks including WMT.

- [ ] **[TopSignal > Action pill rapid succession]**: Tap All → Buys → Sells → All → Buys in rapid sequence
  - **Before**: "All" action active
  - **Expected**: Final state shows "Buys" active with 6 stocks (WMT excluded). All intermediate renders complete without crash.

### Window Filter Pills

- [ ] **[TopSignal > Window pill: 14d (default)]**: Confirm "14d" active on load
  - **Before**: Fresh load
  - **Expected**: "14d" pill has accent-colored border and amber background. "30d" and "90d" have subtle border and transparent background. Count text says "last 14 days".

- [ ] **[TopSignal > Window pill: tap 30d]**: Tap "30d"
  - **Before**: "14d" active
  - **Expected**: "14d" deactivates. "30d" activates. Count text changes to "last 30 days". Signal list re-renders (same mock data, window label updates).

- [ ] **[TopSignal > Window pill: tap 90d]**: Tap "90d"
  - **Before**: "30d" active
  - **Expected**: "30d" deactivates. "90d" activates. Count text changes to "last 90 days".

- [ ] **[TopSignal > Window pill: return to 14d]**: Tap "14d"
  - **Before**: "90d" active
  - **Expected**: "90d" deactivates. "14d" activates. Count text returns to "last 14 days".

- [ ] **[TopSignal > Window pill rapid succession]**: Tap 14d → 30d → 90d → 14d → 30d rapidly
  - **Before**: "14d" active
  - **Expected**: Final state shows "30d" active. No crash.

### Combined Filter Interactions

- [ ] **[TopSignal > Dem + Buys combined]**: Set Party = Dem, then tap Action = Buys
  - **Before**: "All" party and "All" action active
  - **Expected**: First tap "Dem": stocks where `partyD >= partyR` — NVDA (D=11≥R=8), AAPL (D=6≥R=4), META (D=4≥R=2) = 3 stocks. Then tap "Buys": additionally filters `buyCount > sellCount`. All three already qualify (all buy-majority), so result is still 3 stocks. WMT has partyD=2 < partyR=4 so it is already excluded by the Dem filter. Count text: "3 stocks with congressional activity · last 14 days".

- [ ] **[TopSignal > Dem + Sells combined]**: Set Party = Dem, then tap Action = Sells
  - **Before**: "All" party and "All" action active
  - **Expected**: Party = Dem: NVDA, AAPL, META. Then Sells (`sellCount > buyCount`): none of those three qualify (all are buy-majority). Result: 0 stocks. Empty-state div shows: "No signals" / "No trades match this filter in the selected window."
  - **Regression**: BUG-SELL-PILL — with the old `sellCount > 0` filter, 3 stocks would appear here. Correct result is 0.

- [ ] **[TopSignal > Rep + Buys combined]**: Set Party = Rep, then tap Action = Buys
  - **Before**: "All" party and "All" action active
  - **Expected**: Party = Rep: stocks where `partyR > partyD` — MSFT (R=7>D=5), AMZN (R=5>D=3), GOOGL (R=3>D=2), WMT (R=4>D=2) = 4 stocks. Then Buys (`buyCount > sellCount`): WMT is excluded (sellCount=7 > buyCount=2). Result: MSFT, AMZN, GOOGL = 3 stocks.
  - **Regression**: BUG-SELL-PILL — WMT must be excluded from Rep + Buys since it is sell-majority.

- [ ] **[TopSignal > Rep + Sells combined]**: Set Party = Rep, then tap Action = Sells
  - **Before**: Some filter state
  - **Expected**: Party = Rep: MSFT, AMZN, GOOGL, WMT (4 stocks). Then Sells (`sellCount > buyCount`): only WMT qualifies (sellCount=7 > buyCount=2). Result: 1 stock (WMT). Count: "1 stock with congressional activity · last 14 days".
  - **Regression**: BUG-SELL-PILL — with the old `sellCount > 0` filter, all 4 Rep stocks would appear here. Correct result is 1 (WMT only).

- [ ] **[TopSignal > Empty state via filter]**: Set a combination that yields 0 results (e.g., Dem + Sells)
  - **Before**: Some filter active
  - **Expected**: If filtered result is 0, empty-state div shows: title "No signals", subtitle "No trades match this filter in the selected window." Signal list area is empty. Count text reads "0 stocks with congressional activity".

### Signal Card Content

- [ ] **[TopSignal > Card 1 content (NVDA)]**: Inspect the first signal card
  - **Before**: Default filters (All / All / 14d), all 7 cards visible
  - **Expected**: Rank "#1" in monospace secondary color. Ticker "NVDA" bold monospace. Tier badge "Tier 3" with bright styling (class `tier-bright`, bright/green appearance). "Bipartisan" label (small pill, since both D=11 and R=8 > 0). Company name "NVIDIA Corp". "Buy →" button in accent gold color on right. Member count "19" bold. Buy percentage "89%" in buy color (17/19). Sub-label "17B · 2S" in tertiary. Top trader "Pelosi · 1 day ago". Party progress bar: ~58% blue (D) / ~42% red (R). Signal strength: "●●● Strong" in buy color (green).

- [ ] **[TopSignal > Card 2 content (MSFT)]**: Inspect second card
  - **Before**: Default filters
  - **Expected**: Rank "#2". Ticker "MSFT". Tier badge "Tier 2" with accent styling (class `tier-accent`). "Bipartisan" label. "Microsoft Corp". "Buy →" button. Member count "12". Buy pct "83%" (10/12). "10B · 2S". Top trader "Crenshaw · 2 days ago". Signal strength: "●●○ Moderate" in accent color (amber/gold).

- [ ] **[TopSignal > Card 5/6 tier-subtle (META or GOOGL)]**: Inspect META or GOOGL card
  - **Before**: Default filters
  - **Expected**: Tier badge "Tier 1" with subtle styling (class `tier-subtle`, tertiary text color). Signal strength: "●○○ Weak" in tertiary color.

- [ ] **[TopSignal > WMT card content (sell-majority)]**: Inspect WMT card (visible under All / All filter)
  - **Before**: Default filters (All / All / 14d), all 7 cards visible
  - **Expected**: Ticker "WMT". Tier badge "Tier 2". "Bipartisan" label (partyD=2 and partyR=4, both > 0). memberCount=6. Buy percentage shown as "22%" (2 buys out of 9 total trades). Sub-label "2B · 7S" in tertiary. Top trader "Collins". Party progress bar: ~33% blue (D) / ~67% red (R). Signal strength: "●●○ Moderate" in accent color.
  - **Regression**: BUG-SELL-PILL — WMT must appear under All/All filters but disappear under the Buys filter and appear alone under the Sells filter.

- [ ] **[TopSignal > Buy → button tap]**: Tap "Buy →" on any signal card
  - **Before**: Top Signal view active
  - **Expected**: Navigates to What to Buy Step 1 view. Back button still visible. Amount input pre-filled with 150. Pick count shows 3.

- [ ] **[TopSignal > Buy → button double-tap]**: Tap "Buy →" twice rapidly on any card
  - **Before**: Top Signal view
  - **Expected**: Navigates to What to Buy once. Second tap is ignored by the `navigate()` guard.

### Scroll

- [ ] **[TopSignal > Scroll through all 7 cards]**: Scroll down through all 7 signal cards
  - **Before**: Top Signal at top
  - **Expected**: All 7 cards reachable (NVDA, MSFT, AAPL, AMZN, META, GOOGL, WMT). No content clipped. No crash.

### Navigation Out

- [ ] **[TopSignal > Back button]**: Tap ← from Top Signal
  - **Before**: Top Signal view
  - **Expected**: Home view renders. Filter state (`_partyFilter`, `_actionFilter`, `_activeWindow`) is preserved in module-level variables — if you return to Top Signal, the last-used filters are still active.

- [ ] **[TopSignal > Filter state persists on re-entry]**: Set Dem filter active, tap back to home, tap "Top Signal" tile again
  - **Before**: Dem filter set, then navigated away
  - **Expected**: On re-entry, "Dem" pill is still styled as active, list shows only Dem-weighted stocks. Module-level variables survive navigation cycles.

---

## ### Positions View

### Navigation In

- [ ] **[Positions > Entry path]**: From Home, tap "My Portfolio" tile
  - **Before**: Home view
  - **Expected**: Skeleton loading state appears immediately — header reads "My Positions" with subtitle "Loading positions...", followed by 5 shimmer cards. Each shimmer card has a left-to-right gradient animation at 1.5s cycle (the `shimmer` keyframe animation). Back button visible.

- [ ] **[Positions > Skeleton to content transition]**: Observe the skeleton until it resolves
  - **Before**: Skeleton just appeared
  - **Expected**: Skeleton is replaced by full content after `loadPositions()` resolves. The swap is a full innerHTML replacement — no partial update or blending.

### Positions Content — Mock Data State

- [ ] **[Positions > Header — mock banner]**: After skeleton clears, inspect the header area
  - **Before**: Positions loaded with mock data (no CSV uploaded to this device)
  - **Expected**: "My Positions" title. Subtitle: "Sample data" (no upload date). Banner line below subtitle in accent color: "Using sample data — upload CSV to see your real positions". "Upload CSV" ghost button in top-right corner.

- [ ] **[Positions > Stats row]**: Inspect the four-stat summary row
  - **Before**: Positions loaded
  - **Expected**: Four stat blocks displayed in a horizontal row: "Account Total" with dollar value (formatted to 2 decimal places, e.g. "$12,450.00"), "Total G/L" with percentage in green (buy color) if positive or red (sell color) if negative, "Positions" with an integer count, "Cash" with a dollar amount.

- [ ] **[Positions > Position cards sort order]**: Inspect the list of position cards
  - **Before**: Positions loaded
  - **Expected**: Cards sorted by market value descending (highest value first). Non-cash positions show: ticker in monospace bold, share quantity in secondary text (e.g. "15 shares"), market value right-aligned bold, gain/loss percentage in green or red below value (hidden if 0%), average cost in small tertiary text. CASH position (ticker "CASH" or "$") appears last with 3px left border in accent color.

- [ ] **[Positions > Scroll through all position cards]**: Scroll the list to the bottom
  - **Before**: Positions loaded with multiple cards
  - **Expected**: All position cards visible without overflow clipping. CASH card visible at bottom. No content hidden behind header.

### Upload CSV Button

- [ ] **[Positions > Upload CSV button tap]**: Tap "Upload CSV" button
  - **Before**: Positions view loaded, button reads "Upload CSV" in ghost style
  - **Expected**: iOS native file picker dialog opens (Files app or other source). This works because the button calls `input.click()` on a hidden `<input type="file" accept=".csv">` — the correct iOS workaround.
  - **Regression**: BL-004 iOS file picker regression — must be a `<button>` calling `.click()` on the hidden input, not a `<label>` element.

- [ ] **[Positions > Upload CSV — cancel picker]**: Open the file picker and dismiss it without selecting a file
  - **Before**: File picker open
  - **Expected**: Picker dismisses. Button remains "Upload CSV" and interactive. No error toast. No state change.

- [ ] **[Positions > Upload CSV — valid Schwab transactions CSV]**: Select a valid Schwab transactions CSV (header row: Date, Action, Symbol, ...)
  - **Before**: File picker open with a valid Schwab transactions file
  - **Expected**: Button label changes to "Parsing…" and is disabled (opacity 0.5). After a brief parse delay (~30ms yield to allow label to render), positions are derived. If Sheets is connected: button shows "Saving…", then writes to the `my_positions` tab. On success: toast appears reading "N positions loaded" (where N is the count). Toast visible for ~3 seconds. View re-renders with real data. Mock banner ("Using sample data") disappears.

- [ ] **[Positions > Upload CSV — invalid/malformed CSV]**: Select a non-Schwab or malformed CSV file
  - **Before**: File picker open with an invalid file
  - **Expected**: Parse fails. Toast appears: "Could not parse CSV — use a Schwab transactions export" in error styling. Button returns to "Upload CSV" and re-enables. `input.value` cleared so the same file can be re-selected.

- [ ] **[Positions > Upload CSV button — double-tap]**: Tap "Upload CSV" twice rapidly
  - **Before**: Positions view
  - **Expected**: File picker opens once. No crash.

- [ ] **[Positions > Upload CSV — select file then immediately tap Back]**: Tap "Upload CSV", select a valid CSV file, then immediately tap ← back before parsing completes
  - **Before**: File selected, button transitioning to "Parsing…" state
  - **Expected**: Back button navigates to Home immediately. Home view renders cleanly with four tiles. No "Parsing…" button bleeds through. No ghost DOM elements from the Positions view remain visible. The `signal?.aborted` and `container.isConnected` guards in the `reader.onload` callback prevent any post-navigation DOM writes.
  - **Regression**: BUG-CSV-NAV — before the fix, navigating away mid-upload caused stale Positions DOM to render over whatever view was active after navigation.

- [ ] **[Positions > Upload CSV — navigate away while "Parsing…" showing]**: Trigger CSV parse (button shows "Parsing…"), then tap ← within the ~30ms yield window
  - **Before**: Upload button shows "Parsing…" and is disabled
  - **Expected**: Home view renders correctly and is fully interactive. The upload operation resolves internally but all DOM writes are gated by `container.isConnected`. No crash, no blank screen, no Positions content appearing in home.
  - **Regression**: BUG-CSV-NAV — stale async render guard.

- [ ] **[Positions > Upload CSV — "Parsing…" state never gets permanently stuck]**: Trigger CSV upload; if file read does not complete within 15 seconds (simulated by a very large or unresponsive file)
  - **Before**: Button shows "Parsing…"
  - **Expected**: Button returns to "Upload CSV" state within 15 seconds maximum (the `_readTimeout` fires at 15000ms). A toast appears: "File read timed out — please try again" in error styling. Button re-enables and is interactive.
  - **Regression**: BUG-CSV-NAV — upload button must never be permanently stuck in "Parsing…".

- [ ] **[Positions > Upload CSV — navigate away while "Saving…" showing]**: After parse completes (button shows "Saving…"), tap ← back before Sheets write finishes
  - **Before**: Upload button shows "Saving…", Sheets write in progress
  - **Expected**: Home view renders and is fully interactive. The Sheets write completes in the background but the `container.isConnected` guard prevents `renderPositions()` from overwriting the current view. No ghost DOM from Positions view.
  - **Regression**: BUG-CSV-NAV — covers the Sheets-save phase of the navigation guard.

### Navigation Out

- [ ] **[Positions > Back button]**: Tap ← from Positions
  - **Before**: Positions view loaded with content
  - **Expected**: Home view renders. Positions content is completely gone. Home shows its four tiles and greeting. No position cards, stat rows, or CSV buttons visible.
  - **Regression**: Stale render regression — the `signal?.aborted` and `container.isConnected` guards must prevent a late-resolving `loadPositions()` from overwriting the Home view.

---

## ### What to Buy View

### Navigation In

- [ ] **[WhatToBuy > Entry path]**: From Home, tap "What to Buy" tile
  - **Before**: Home view
  - **Expected**: What to Buy Step 1 renders inside a card. Heading "How much are you investing?". Dollar sign "$" to the left of the input. Amount input pre-filled with "150". "# of picks" label with stepper: "−" button, count display "3" in monospace bold (DEFAULT_PICK_COUNT = MOCK_PICKS.length = 3), "+" button, and "30 available" label in tertiary text (MAX_PICK_COUNT = 30). Four quick-amount pills: $150, $250, $500, $1,000. Primary button "Get 3 Picks →" spanning full width. Footer disclaimer text. Back button visible.
  - **Regression**: BUG-STEPPER-MAX — before the fix, the label incorrectly read "3 available" due to MAX_PICK_COUNT being set to 3. Correct value is 30.

### Amount Input

- [ ] **[WhatToBuy > Amount input — focus style]**: Tap the amount input field
  - **Before**: Input border is `var(--border-soft)` (subtle, dark)
  - **Expected**: Border color changes to `var(--accent)` (amber/gold) via the `onfocus` inline handler. Keyboard slides up from bottom.

- [ ] **[WhatToBuy > Amount input — blur style]**: Tap outside the input to dismiss keyboard
  - **Before**: Input focused, amber border active
  - **Expected**: Border returns to `var(--border-soft)` via the `onblur` inline handler.

- [ ] **[WhatToBuy > Amount input — type value]**: Clear the input and type "500"
  - **Before**: Input shows "150"
  - **Expected**: Input updates to "500". No error message appears. Button label remains "Get 3 Picks →" (count unchanged at 3). No slice warning (500/3 ≈ $167, above $5 minimum).

- [ ] **[WhatToBuy > Amount input — slice warning appears]**: With pick count at 3, type "10" in the amount input
  - **Before**: Input shows some value
  - **Expected**: 10/3 ≈ $3.33 < $5 minimum. Warning div appears below the button: "Minimum $5 per slice — reduce picks or increase amount." in sell color (muted red/rust). Warning element has id `slice-warning`.

- [ ] **[WhatToBuy > Amount input — slice warning clears on fix]**: Change amount from "10" to "500"
  - **Before**: Slice warning visible below button
  - **Expected**: Warning div is removed from the DOM. No warning visible. Button label unchanged.

- [ ] **[WhatToBuy > Amount input — Enter key submits]**: With a valid amount ("500") in the input and pick count at 3, press the keyboard Return/Enter key
  - **Before**: Amount input focused and showing "500"
  - **Expected**: `_submit()` fires. Step 2 renders with amount $500 and 3 picks. Same result as tapping "Get 3 Picks →".

### Quick-Amount Pills

- [ ] **[WhatToBuy > Pill $150]**: Tap the "$150" pill
  - **Before**: Amount input shows some other value
  - **Expected**: Amount input value sets to "150". Any existing error message (id=`amount-error`) is removed. Button label updates to "Get 3 Picks →".

- [ ] **[WhatToBuy > Pill $250]**: Tap the "$250" pill
  - **Before**: Any amount in input
  - **Expected**: Amount input value sets to "250". Button label: "Get 3 Picks →".

- [ ] **[WhatToBuy > Pill $500]**: Tap the "$500" pill
  - **Before**: Any amount in input
  - **Expected**: Amount input value sets to "500".

- [ ] **[WhatToBuy > Pill $1,000]**: Tap the "$1,000" pill
  - **Before**: Any amount in input
  - **Expected**: Amount input value sets to "1000". Button label: "Get 3 Picks →".

- [ ] **[WhatToBuy > Pill — tap same pill twice]**: Tap "$500" while input already shows 500
  - **Before**: Input already shows 500 from a previous tap
  - **Expected**: No error. Input stays at 500. No duplicate state issue.

- [ ] **[WhatToBuy > Pill rapid succession]**: Tap $150 → $250 → $500 → $1,000 rapidly
  - **Before**: Some amount in input
  - **Expected**: Final amount input value is "1000". Each tap registers. No crash.

### Pick Count Stepper

- [ ] **[WhatToBuy > Stepper — initial state]**: Inspect the stepper on fresh load
  - **Before**: What to Buy Step 1 just loaded
  - **Expected**: "−" button (44×44px touch target), count display "3" in monospace bold center-aligned (DEFAULT_PICK_COUNT = MOCK_PICKS.length = 3), "+" button (44×44px touch target). "30 available" text in tertiary to the right of the stepper (MAX_PICK_COUNT = 30).
  - **Regression**: BUG-STEPPER-MAX — the available label must read "30 available", not "3 available".

- [ ] **[WhatToBuy > Stepper — decrement]**: Tap "−" button once
  - **Before**: Count shows "3"
  - **Expected**: Count decrements to "2". Button label updates to "Get 2 Picks →". Slice warning recalculates if current amount is very small.

- [ ] **[WhatToBuy > Stepper — decrement to 1]**: Tap "−" twice more from count 2
  - **Before**: Count shows "2"
  - **Expected**: Taps go 2 → 1. At 1, button reads "Get 1 Pick →" (singular "Pick").

- [ ] **[WhatToBuy > Stepper — decrement floor at 1]**: With count at 1, tap "−" again
  - **Before**: Count shows "1"
  - **Expected**: Count stays at "1". `Math.max(1, 1-1)` = 1. No change. No crash.
  - **Regression**: BUG-STEPPER-MAX — min floor of 1 must be enforced.

- [ ] **[WhatToBuy > Stepper — increment from 1]**: With count at 1, tap "+" button
  - **Before**: Count shows "1"
  - **Expected**: Count increments to "2". Button reads "Get 2 Picks →".

- [ ] **[WhatToBuy > Stepper — increment past 3]**: Starting from count "3", tap "+" four times
  - **Before**: Count shows "3"
  - **Expected**: Count goes 3 → 4 → 5 → 6 → 7. The stepper is NOT capped at 3. `Math.min(MAX_PICK_COUNT, count+1)` allows up to 30. Each tap registers correctly.
  - **Regression**: BUG-STEPPER-MAX — before the fix, incrementing from 3 did nothing because MAX_PICK_COUNT was incorrectly set to 3 (MOCK_PICKS.length) instead of 30.

- [ ] **[WhatToBuy > Stepper — increment to 30]**: Starting from count "1", tap "+" 29 times (or type to simulate)
  - **Before**: Count shows "1"
  - **Expected**: Count reaches "30". Button reads "Get 30 Picks →". At 30, the "30 available" label confirms this is the maximum.
  - **Regression**: BUG-STEPPER-MAX — the true ceiling is MAX_PICK_COUNT = 30.

- [ ] **[WhatToBuy > Stepper — increment ceiling at 30]**: With count at 30, tap "+" again
  - **Before**: Count shows "30"
  - **Expected**: Count stays at "30". `Math.min(30, 30+1)` = 30. No change. No crash.
  - **Regression**: BUG-STEPPER-MAX — max ceiling of 30 must be enforced.

### Get Picks Button — Validation

- [ ] **[WhatToBuy > Submit — empty input]**: Clear the amount input completely and tap "Get N Picks →"
  - **Before**: Input is empty (or shows 0)
  - **Expected**: Error message appears below the input with id `amount-error`: "Enter an amount to continue" in sell color, red-tinted background, red border. No navigation to Step 2.

- [ ] **[WhatToBuy > Submit — below minimum]**: Type "49" and tap "Get N Picks →"
  - **Before**: Input shows "49"
  - **Expected**: Error message: "Enter an amount between $50 and $10,000" in sell color error styling.

- [ ] **[WhatToBuy > Submit — above maximum]**: Type "10001" and tap "Get N Picks →"
  - **Before**: Input shows "10001"
  - **Expected**: Error message: "Enter an amount between $50 and $10,000".

- [ ] **[WhatToBuy > Submit — valid $150, 3 picks]**: With input "150" and count "3", tap "Get 3 Picks →"
  - **Before**: Step 1 valid state
  - **Expected**: Step 2 renders within the same container. Step 1 content is fully replaced. Back button remains visible.

- [ ] **[WhatToBuy > Submit — valid $500, 2 picks]**: Set amount to 500, decrement to 2, tap "Get 2 Picks →"
  - **Before**: Step 1 with amount 500 / count 2
  - **Expected**: Step 2 renders with 2 pick cards (NVDA at rank #1, MSFT at rank #2). Amount shown: "$500". Per-pick allocation: `round(500/2/25)*25 = $250` each.

### Step 2 — Results View

- [ ] **[WhatToBuy > Step2 header]**: Inspect the Step 2 header area
  - **Before**: Step 2 just rendered with $150, 3 picks
  - **Expected**: "← Change amount" link on left (secondary text color, no underline). "$150" in large monospace bold on right. Below: "Recommended Slices" heading. Subtitle: "3 picks · based on recent signals". "Portfolio match: N aligned · N gaps" line with colored counts.

- [ ] **[WhatToBuy > Step2 — pick card 1 (NVDA)]**: Inspect first pick card
  - **Before**: Step 2 with 3 picks
  - **Expected**: Rank "#1" in monospace secondary. Ticker "NVDA" bold monospace. Amount and percentage in top-right (e.g. "$50 (40%)"). Rationale: "Pelosi + 14% of Congress buying. AI chip tailwind." Below rationale: "✓ You followed this trade" in buy color (green) — this pick has `followed: true`. Alignment badge: "✅ Aligned with your portfolio" in buy color.

- [ ] **[WhatToBuy > Step2 — pick card 2 (MSFT)]**: Inspect second pick card
  - **Before**: Step 2 with at least 2 picks
  - **Expected**: Rank "#2". Ticker "MSFT". Rationale: "Crenshaw bought recently. Strong enterprise AI demand." "Gap: you own $0" in tertiary color (owned=0 and not followed). Alignment badge: "🔵 You don't own this yet — gap opportunity" in accent color (amber).

- [ ] **[WhatToBuy > Step2 — pick card 3 (AAPL)]**: Inspect third pick card
  - **Before**: Step 2 with 3 picks
  - **Expected**: Rank "#3". Ticker "AAPL". Rationale: "Bipartisan buying pattern. Modest add recommended." "You own $4,200 — small add." in tertiary color. Alignment badge: "✅ Aligned with your portfolio" in buy color.

- [ ] **[WhatToBuy > Step2 — Order Summary table]**: Inspect the summary table below the pick cards
  - **Before**: Step 2 rendered
  - **Expected**: Table with header row: "SYMBOL", "ACTION", "AMOUNT" (small uppercase tertiary). Each pick has a row: ticker bold monospace, "BUY" in buy green uppercase, per-pick amount in monospace. Final "Total" row: colspan spanning first two columns with "Total" label, right-aligned total sum of all allocations in bold monospace.

- [ ] **[WhatToBuy > Step2 — Change amount link tap]**: Tap "← Change amount" link
  - **Before**: Step 2 visible
  - **Expected**: `renderWhatToBuy(container)` is called. Step 1 re-renders. Amount input defaults to "150". Pick count resets to "3". All Step 2 content gone. No navigation to home.

- [ ] **[WhatToBuy > Step2 — Change amount double-tap]**: Tap "← Change amount" twice rapidly
  - **Before**: Step 2 visible
  - **Expected**: Returns to Step 1 once. No crash on second tap (the link is gone after first tap replaces the DOM).

### Navigation Out

- [ ] **[WhatToBuy > Back from Step 1]**: Tap ← from Step 1
  - **Before**: What to Buy Step 1 visible
  - **Expected**: Home view renders. What to Buy state is fully reset on next entry (fresh Step 1).

- [ ] **[WhatToBuy > Back from Step 2]**: Navigate to Step 2, then tap ←
  - **Before**: Step 2 visible
  - **Expected**: Home view renders. Step 2 content gone. Next visit to What to Buy starts at Step 1 with default values.

---

## ### Settings View

### Navigation In

- [ ] **[Settings > Entry path from home]**: Tap ⚙ button in the header
  - **Before**: Home view, ⚙ button visible
  - **Expected**: Settings view renders. "Settings" heading + "Save to Sheets" button (primary style, amber gold fill, dark text) in a header row. Four section cards visible below. ⚙ button in header is HIDDEN. Back button (←) is visible.

- [ ] **[Settings > Entry path from Feed]**: Navigate to Feed, then tap ⚙
  - **Before**: Feed view active
  - **Expected**: Settings view renders cleanly. No Feed content bleeds through. Back button (←) is visible. ⚙ is hidden.

### Section Cards — Content

- [ ] **[Settings > Section 1: Consensus Thresholds]**: Inspect first section card
  - **Before**: Settings loaded
  - **Expected**: Card header "Consensus Thresholds". Explanatory note below in tertiary text. Four fields in a 2-column grid (180px label column, input column): "Tier 1 — Elevated" (number input, value 0.05), "Tier 2 — Strong" (0.10), "Tier 3 — Near-Unanimous" (0.25), "Window (days)" (14).

- [ ] **[Settings > Section 2: AI Provider]**: Inspect second section card
  - **Before**: Settings loaded
  - **Expected**: Title "AI Provider". Note about Ollama vs Gemini. Fields: "Provider" (select, options ollama/gemini, default gemini), "Model Override" (text, placeholder "blank = use provider default"), "Ollama Base URL" (text, default "http://localhost:11434"), "Ollama Default Model" (text, default "llama3.2"), "Gemini API Key" (password input — always empty on load, value never pre-filled), "Gemini Default Model" (text, default "gemini-2.0-flash").

- [ ] **[Settings > Section 3: Notifications]**: Inspect third section card
  - **Before**: Settings loaded
  - **Expected**: Title "Notifications". Note about ntfy.sh push. Fields: "ntfy.sh Topic Slug" (text, placeholder "your-private-topic-xyz", empty by default), "ntfy Server URL" (text, default "https://ntfy.sh"), "Notify from Tier" (select, options 1/2/3, default 2).

- [ ] **[Settings > Section 4: Debug & Logging]**: Inspect fourth section card
  - **Before**: Settings loaded
  - **Expected**: Title "Debug & Logging". Note about log tab verbosity. Fields: "Log Level" (select, options DEBUG/INFO/WARN/ERROR, default INFO), "Max Log Rows" (number input, default 500).

### Input Interactions

- [ ] **[Settings > Number input — tap and edit]**: Tap the "Tier 1 — Elevated" number input and change its value
  - **Before**: Value shows "0.05"
  - **Expected**: Keyboard appears. Input becomes editable. Type "0.08". Value updates. No save fires automatically (Phase 1 — inputs are purely cosmetic).

- [ ] **[Settings > Text input — tap and type]**: Tap the "ntfy.sh Topic Slug" text input and type a value
  - **Before**: Input is empty (placeholder "your-private-topic-xyz" shown in tertiary)
  - **Expected**: Placeholder disappears. Typed text appears. Value persists on blur (no save).

- [ ] **[Settings > Password input — value hidden]**: Tap "Gemini API Key" password input and type characters
  - **Before**: Input is empty, type=password
  - **Expected**: Typed characters appear as bullet/dot symbols (obscured). On load, the field is always empty — password fields are never pre-populated from config for security.

- [ ] **[Settings > Select dropdown — Provider]**: Tap the "Provider" select and change to "ollama"
  - **Before**: "gemini" is selected (default)
  - **Expected**: Native iOS select picker opens. Options: "ollama", "gemini". Select "ollama". Picker closes. Select shows "ollama". No auto-save.

- [ ] **[Settings > Select dropdown — Log Level]**: Tap "Log Level" select and change to "DEBUG"
  - **Before**: "INFO" selected
  - **Expected**: Native picker opens with options DEBUG, INFO, WARN, ERROR. Select "DEBUG". Picker closes. Shows "DEBUG".

- [ ] **[Settings > Select — Notify from Tier]**: Tap "Notify from Tier" select
  - **Before**: "2" selected
  - **Expected**: Native picker opens with options 1, 2, 3. Pre-selected on 2. Change to "3". Shows "3".

### Save Button

- [ ] **[Settings > Save to Sheets button tap]**: Tap the "Save to Sheets" button (amber/primary style)
  - **Before**: Settings view, some fields may have been edited
  - **Expected**: Toast appears: "Settings save available in Phase 2". Toast is visible for approximately 3 seconds (full 3-second display window), then fades and is removed from the DOM.

- [ ] **[Settings > Save button double-tap]**: Tap "Save to Sheets" twice rapidly
  - **Before**: Settings view
  - **Expected**: Two toast elements appear stacked in the toast container, each with its own independent 3-second timer. No crash. No duplicate event listener cascade.

### Scroll

- [ ] **[Settings > Scroll through all sections]**: Scroll from top to bottom through all four section cards
  - **Before**: Settings at top, showing section 1
  - **Expected**: Sections 2, 3, and 4 all reachable by scrolling. Footer text at the very bottom reads: "Settings are stored in the config tab of your Google Sheet. You can also edit them directly in Sheets." with "Live settings sync available in Phase 2" in accent color below.
  - **Regression**: BL-001 mobile overflow — settings page must be fully scrollable without content clipping on mobile.

- [ ] **[Settings > Scroll back to top]**: After reaching the bottom, scroll back up
  - **Before**: Settings scrolled to bottom
  - **Expected**: "Settings" heading and "Save to Sheets" button visible again at the top.

### Navigation Out

- [ ] **[Settings > Back button]**: Tap ← from Settings
  - **Before**: Settings view, ⚙ button hidden
  - **Expected**: Home view renders. ⚙ button reappears in header. Back button disappears. Four home tiles visible. Settings is the only view that hides the ⚙ button.

---

## ### Toast Notifications

- [ ] **[Toast > Trigger via Settings save]**: Tap ⚙, then tap "Save to Sheets"
  - **Before**: Settings view
  - **Expected**: Toast element appears in the `#toast-container` div (fixed-positioned, typically at the bottom of the viewport). Text: "Settings save available in Phase 2". Toast has CSS class `toast`. Clearly readable against the dark background.

- [ ] **[Toast > Auto-dismiss timing]**: After triggering a toast, watch until it disappears
  - **Before**: Toast just appeared
  - **Expected**: Toast remains visible for approximately 3 full seconds. After 3 seconds, the CSS class `leaving` is added, triggering the dismiss animation. After the animation ends (`animationend` event), the element is removed from the DOM. No ghost element remains.

- [ ] **[Toast > Multiple simultaneous toasts]**: Tap "Save to Sheets" twice in rapid succession
  - **Before**: Settings view
  - **Expected**: Two separate toast elements appear in the container (stacked or sequential). Each has its own independent 3-second timer. Both dismiss independently. No crash.

- [ ] **[Toast > Toast does not block navigation]**: Trigger a toast, then immediately navigate by tapping back
  - **Before**: Toast visible
  - **Expected**: Toast stays visible but does not block taps. Navigation proceeds normally. Toast dismisses after its own 3-second timer regardless of what view is active.

---

## ### Global Header

- [ ] **[Header > Back button hidden on home]**: Observe the ← button on the home view
  - **Before**: Home view active
  - **Expected**: Back button is not visible. The `hidden` class is applied via `backBtn.classList.toggle('hidden', viewName === 'home')`.

- [ ] **[Header > Back button visible on drill-down views]**: Navigate to Feed, then TopSignal, then Positions, then WhatToBuy individually
  - **Before**: Home view
  - **Expected**: After each navigation, ← button is visible. Tapping it returns to home.

- [ ] **[Header > Settings button hidden in settings view]**: Navigate to Settings via ⚙ button
  - **Before**: Home view, ⚙ visible
  - **Expected**: Once Settings renders, ⚙ button has class `hidden`. `settingsBtn.classList.toggle('hidden', viewName === 'settings')` applies. Back button visible instead.

- [ ] **[Header > Settings button visible on all non-settings views]**: Check ⚙ in Feed, TopSignal, Positions, WhatToBuy
  - **Before**: In each of these drill-down views
  - **Expected**: ⚙ button is visible. Tapping it from any view navigates to Settings.

- [ ] **[Header > STH wordmark always visible]**: Check header on every view
  - **Before**: Any view
  - **Expected**: "STH" text always present on the left side of the header. Build version string in small monospace tertiary immediately to its right.

- [ ] **[Header > Sync dot visible]**: Observe the sync dot
  - **Before**: App loaded
  - **Expected**: Small dot element (class `sync-dot`) visible in the header to the left of the ⚙ button on all views.

---

## ### Crash Regression Tests

These tests target specific known failure modes. Run them in order after any code change.

- [ ] **[Crash > Rapid back-and-forth (5 cycles)]**: From home, tap "What's New" → tap ← → tap "What's New" → tap ← repeat 5 full cycles as fast as possible
  - **Before**: Home view
  - **Expected**: No blank screens, no "Something went wrong" error state, no console exceptions. Each navigation resolves cleanly. The `AbortController` mechanism in `navigate()` cancels in-flight renders from superseded navigations. Final state: Home view.

- [ ] **[Crash > Pill spam on TopSignal (10 rapid taps)]**: Navigate to Top Signal. Tap Dem → Rep → All → Dem → Rep → All → Dem → Rep → All → Dem rapidly (10 taps total)
  - **Before**: Top Signal view
  - **Expected**: View re-renders correctly for each tap (module-level variables update synchronously). No crash, no blank list, no frozen state. Final state: "Dem" active (last tap), list shows Dem-weighted stocks.

- [ ] **[Crash > Async race — back before positions loads]**: Tap "My Portfolio" to enter Positions (skeleton appears), then immediately (within ~200ms) tap ← back
  - **Before**: Positions skeleton just appeared, `loadPositions()` still resolving
  - **Expected**: Back button returns to Home. Home renders correctly. The `signal?.aborted` and `container.isConnected` guards in `renderPositions` prevent the Positions content from overwriting the Home view after navigation completes.
  - **Regression**: Core async-render abort regression. A failure here means Positions content overwrites Home.

- [ ] **[Crash > Stale render — positions content must not bleed into home]**: Navigate to Positions, wait for full content to load (skeleton replaced by real cards), tap ←
  - **Before**: Positions fully loaded
  - **Expected**: Home renders fresh with four tiles. No position cards, no stat row, no "Upload CSV" button visible in the home view.

- [ ] **[Crash > Feed persistence across 3 navigations]**: Enter Feed. Follow card 1 (NVDA). Tap back. Tap "What's New" (re-entry 1) — confirm NVDA shows "✓ Follow" and green left border. Tap back. Tap "What's New" (re-entry 2) — confirm NVDA still shows "✓ Follow".
  - **Before**: NVDA has been followed once
  - **Expected**: On every re-entry to Feed, NVDA card shows "✓ Follow" with green 3px left border. `_loadDecisions()` reads from `localStorage` (`sth_trade_decisions`) on every render. No state corruption across any number of navigations.
  - **Regression**: Feed persistence regression.

- [ ] **[Crash > Toast timing — must not flash and disappear]**: Trigger a toast (tap ⚙, tap "Save to Sheets"), then count "one Mississippi, two Mississippi, three Mississippi"
  - **Before**: Toast just appeared
  - **Expected**: Toast is clearly readable for the full 3-second window. It does NOT flash and vanish in under 1 second. The `setTimeout(..., 3000)` timer ensures a full 3-second display before the `leaving` class is added and the dismiss animation begins.

- [ ] **[Crash > Settings → Feed → Settings re-entry]**: Tap ⚙ (settings), tap ← (home), tap "What's New" (feed), tap ← (home), tap ⚙ (settings again)
  - **Before**: Home view
  - **Expected**: Settings re-renders cleanly on second visit. All four section cards visible with correct default values. "Save to Sheets" button functions. Toast fires correctly. No error state or blank view.

- [ ] **[Crash > WhatToBuy Step2 → back → re-entry]**: Enter What to Buy, submit $500 / 3 picks to reach Step 2, tap ←, then tap "What to Buy" tile again
  - **Before**: Step 2 was the last What to Buy state before backing out
  - **Expected**: Step 1 renders fresh on re-entry — amount input shows "150", pick count shows "3". No Step 2 content leaks through. `renderWhatToBuy(container)` is always called fresh on navigation.

- [ ] **[Crash > Home What's New live fetch — back during load]**: Cold-load the app; immediately tap "What's New" while the home view is still resolving the `fetchAllTransactions()` call for the What's New card
  - **Before**: Home is rendering; `fetchAllTransactions()` is in-flight for the What's New tile; user taps the tile before the fetch settles
  - **Expected**: Feed renders normally with its own skeleton. No double-fetch error. No blank screen. Home's in-flight `fetchAllTransactions()` promise resolves or rejects silently after navigation (the `if (signal?.aborted) return` guard prevents the stale result from writing back to the Home container). Feed runs its own independent fetch.

- [ ] **[Crash > Feed Show more — rapid open/close]**: Navigate to Feed (Show more button visible), tap "Show more" once, immediately tap ← back, then immediately tap "What's New" to re-enter Feed
  - **Before**: Mid-animation state possible; `_showMorePending` may still be true
  - **Expected**: Feed re-renders cleanly from scratch on re-entry (`_showMorePending` is reset to `false` inside `renderFeed()`). Exactly 5 cards are shown. "Show more" button visible with correct remaining count. No duplicated cards from the previous partial append.

- [ ] **[Crash > Double-fire settings button from home]**: Tap ⚙ twice very rapidly from Home
  - **Before**: Home view
  - **Expected**: Settings renders once. The `navigate()` guard (`if (viewName === activeView) return`) prevents double-render. No duplicate event listeners attached to the Save button. Save button toast fires exactly once per physical tap.

---

## ### Epic 3 Regressions (Portfolio Accuracy)

### Home — Portfolio Card Live Data

- [ ] **[Home > Portfolio card > no CSV uploaded]**: Load app fresh, do not upload CSV
  - **Before**: Home renders with mock data fallback
  - **Expected**: Portfolio card shows `—` and "Upload CSV to see your real portfolio". No `$12.4k` or `8 positions` hardcoded text appears.
  - **Regression**: Prevents MOCK_PORTFOLIO constant from showing stale fake data

- [ ] **[Home > Portfolio card > after positions CSV upload]**: Upload a valid Schwab Positions snapshot CSV, then navigate back to Home
  - **Before**: Portfolio card shows `—` empty state
  - **Expected**: Card shows real account total (e.g. `$2.7k`), colored G/L %, and position count. "sample data" label does NOT appear.

- [ ] **[Home > Portfolio card > mock active]**: Use app without uploading CSV (mock positions active)
  - **Before**: Mock positions loaded from mockPositions.js
  - **Expected**: Card shows total with `sample data` label in muted text next to the number. Tapping still navigates to positions view.

### Positions — Zero-Quantity Filter

- [ ] **[Positions > upload transactions CSV]**: Upload a Schwab Transactions (history) CSV
  - **Before**: Positions view open
  - **Expected**: Toast reads "N positions derived from M transactions". If all derived positions have qty < 0.001, the list shows the empty state message: "No positions to display. Upload a Schwab **Positions** CSV (not Transactions) to see your holdings."
  - **Regression**: Prevents blank black screen when all filtered positions are zero-quantity

- [ ] **[Positions > empty state message]**: Trigger empty list (upload transactions CSV with zero-qty results)
  - **Before**: Stats show 0 positions
  - **Expected**: Helpful message visible below stats row. No blank black void.

- [ ] **[Positions > position count stat]**: Upload positions CSV with 30 valid positions
  - **Before**: Stats row shows old count
  - **Expected**: POSITIONS stat shows count matching the number of visible cards (not the raw Sheets row count)
  - **Regression**: Prevents count showing 51 while list shows 0 cards

### Positions — Format-Aware Toast

- [ ] **[Positions > upload positions snapshot CSV]**: Upload Schwab Positions export
  - **Expected**: Toast reads "N positions loaded from positions export"

- [ ] **[Positions > upload transactions CSV]**: Upload Schwab Transactions export
  - **Expected**: Toast reads "N positions derived from M transactions"

### Positions — Stale Data Warning

- [ ] **[Positions > stale warning > fresh data]**: Upload CSV today, view positions
  - **Expected**: No stale warning shown. Subtitle shows "Updated YYYY-MM-DD" only.

- [ ] **[Positions > stale warning > old data]**: View positions when last_csv_upload is 8+ days ago
  - **Expected**: Amber `⚠ Data is N days old — upload a fresh CSV` appears below subtitle line

- [ ] **[Positions > stale warning > mock data]**: View positions when using mock/sample data
  - **Expected**: No stale warning shown regardless of date

### What to Buy — 30 Picks

- [ ] **[What to Buy > stepper max]**: Tap `+` button repeatedly from default (3)
  - **Before**: Shows "3", "10 available"
  - **Expected**: Can increment up to 30. Label shows "30 available". Cannot go above 30.

- [ ] **[What to Buy > N picks = N cards]**: Set pick count to 7, submit $250
  - **Before**: Step 1 showing
  - **Expected**: Step 2 shows exactly 7 ranked pick cards and 7 rows in the Order Summary table.

- [ ] **[What to Buy > minimum 1 pick]**: Tap `−` from 1
  - **Expected**: Count stays at 1, does not go to 0.

---

### Feed — BL-019 HSW Integration

#### Loading State

- [ ] **[Feed > Skeleton > appears immediately]**: Tap "What's New" tile on Home to navigate to Feed
  - **Before**: Home view is visible; Feed has not rendered yet
  - **Expected**: Within one animation frame of the tap, the Feed container fills with 6 shimmer card placeholders. The shimmer animation (left-to-right light sweep, ~1.5 s cycle) is visible on all 6 cards before any network response arrives. The page does NOT show a blank black screen at any point between the tap and skeleton render.

- [ ] **[Feed > Skeleton > card count]**: Count the shimmer placeholders while Feed is loading
  - **Before**: HSW fetch is in-flight; skeleton is displayed
  - **Expected**: Exactly 6 skeleton cards are visible — no more, no fewer. Each card has 3 shimmer bars (title ~65% width, subtitle ~45% width, third bar ~55% width) inside a `.card`-styled container with standard padding.

- [ ] **[Feed > Skeleton > subtitle text]**: Read the subtitle below the "Recent Trades" heading during load
  - **Before**: Skeleton is showing; fetch not yet resolved
  - **Expected**: Subtitle reads exactly "Loading congressional trades…" in muted secondary text color. The heading "Recent Trades" is already visible in full-weight white/primary text.

- [ ] **[Feed > Skeleton > heading visible]**: Confirm heading renders with skeleton
  - **Before**: Feed just navigated to; skeleton active
  - **Expected**: "Recent Trades" heading (18 px, font-weight 600, `var(--text-primary)`) is visible above the 6 skeleton cards. No "N disclosures" count appears yet — that text only appears after data loads.

---

#### Live Data Success State

- [ ] **[Feed > Live > subtitle format]**: Wait for HSW fetch to complete successfully with watchlist results
  - **Before**: Skeleton was showing; fetch just resolved with N > 0 trades
  - **Expected**: Subtitle changes from "Loading congressional trades…" to "N disclosures · last 90 days" where N is the actual count of visible (non-ignored) trades. If exactly 1 disclosure, reads "1 disclosure · last 90 days" (singular). If 5 disclosures, reads "5 disclosures · last 90 days".
  - **Regression**: Subtitle was hardcoded "last 30 days" even though the filter window is 90 days.

- [ ] **[Feed > Live > no mock banner]**: Observe the area below the subtitle after live data loads
  - **Before**: Live HSW data loaded successfully (N > 0 watchlist results)
  - **Expected**: No accent-colored banner text reading "Using sample data" or "Sample data — connect Google to load live trades" is present. The mock indicator `<div>` element is not rendered anywhere in the view.

- [ ] **[Feed > Live > politician names]**: Inspect the name label in any trade card
  - **Before**: Live data displayed
  - **Expected**: Politician names match actual congressional member names from the HSW API (not "Nancy Pelosi", "Dan Crenshaw" etc. from the mock constant). Names appear in 14 px medium-weight text in `var(--text-primary)` color, to the right of the party badge.

- [ ] **[Feed > Live > ticker display]**: Inspect the ticker symbol in any trade card
  - **Before**: Live data displayed
  - **Expected**: Ticker symbol appears in monospace font, 18 px, font-weight 700, `var(--text-primary)`. Value is an uppercase stock ticker (e.g. "AAPL", "NVDA") sourced from the live HSW payload — not from the MOCK_TRADES constant.

- [ ] **[Feed > Live > party badge D color]**: Locate a Democrat trade card
  - **Before**: Live data loaded with at least one Democrat trade visible
  - **Expected**: The party badge shows "D" with blue-tinted text (`color: #6b9bd2`), blue-tinted background (`rgba(107,155,210,0.14)`), and blue-tinted border (`rgba(107,155,210,0.25)`). The badge has a pill shape (`border-radius: 100px`).

- [ ] **[Feed > Live > party badge R color]**: Locate a Republican trade card
  - **Before**: Live data loaded with at least one Republican trade visible
  - **Expected**: The party badge shows "R" with red-tinted text (`color: #c47b6e`), red-tinted background (`rgba(196,123,110,0.14)`), and red-tinted border (`rgba(196,123,110,0.25)`). Visual contrast with "D" badge is immediately apparent.

- [ ] **[Feed > Live > BUY action color]**: Find a trade card with action = BUY
  - **Before**: Live data loaded
  - **Expected**: "BUY" label is rendered in `var(--buy)` (muted green, ~`#7fb883`), 13 px, font-weight 600. Color is distinctly green, not red or neutral.

- [ ] **[Feed > Live > SELL action color]**: Find a trade card with action = SELL
  - **Before**: Live data loaded
  - **Expected**: "SELL" label is rendered in `var(--sell)` (muted red/rust, ~`#c47b6e`), 13 px, font-weight 600. Color is distinctly red/rust, not green.

- [ ] **[Feed > Live > relative date "today"]**: View a trade card where `transaction_date` is today's date
  - **Before**: Live data contains a trade filed today
  - **Expected**: The top-right timestamp on that card reads "today" (lowercase), not a date string like "Mar 15" or "0 days ago".

- [ ] **[Feed > Live > relative date "yesterday"]**: View a trade card where `transaction_date` is yesterday
  - **Before**: Live data contains a trade from yesterday
  - **Expected**: Timestamp reads "yesterday" (lowercase).

- [ ] **[Feed > Live > relative date "X days ago"]**: View a trade card where `transaction_date` is 5 or more days ago
  - **Before**: Live data contains an older trade
  - **Expected**: Timestamp reads "N days ago" where N is the integer number of full days elapsed (e.g. "5 days ago", "12 days ago"). Never shows a raw date string in this position.

---

#### Mock Fallback States

- [ ] **[Feed > Mock > HSW fetch fails — toast]**: Simulate or wait for an HSW network failure (e.g. offline mode, proxy down)
  - **Before**: Skeleton is showing; HSW fetch was attempted
  - **Expected**: An error toast appears with the exact text "Could not load live trades — showing sample data". Toast uses error styling (rust/red accent). It auto-dismisses after ~3 seconds. The feed then renders with MOCK_TRADES data.

- [ ] **[Feed > Mock > HSW fetch fails — cards render]**: After the error toast from an HSW failure
  - **Before**: Toast has appeared; error path taken
  - **Expected**: 5 mock trade cards render (Nancy Pelosi/NVDA, Dan Crenshaw/MSFT, Ro Khanna/AAPL, Tommy Tuberville/AMD, Nancy Pelosi/TSM). The skeleton is fully replaced — no shimmer cards remain.

- [ ] **[Feed > Mock > HSW fetch fails — mock banner visible]**: Inspect the area below the subtitle after HSW failure
  - **Before**: Error path; usingMock = true
  - **Expected**: An accent-colored (`var(--accent)`) line reads "Using sample data — upload positions or connect Google to see live trades". This line appears directly below the subtitle, at 11 px font size.

- [ ] **[Feed > Mock > HSW fetch fails — subtitle text]**: Read the subtitle after HSW failure
  - **Before**: Mock data rendered after error
  - **Expected**: Subtitle reads "Sample data — connect Google to load live trades" in `var(--text-secondary)` color. It does NOT read "N disclosures · last 30 days".

- [ ] **[Feed > Mock > HSW returns 0 results — mock banner]**: HSW fetch succeeds but watchlist filter returns 0 trades in past 30 days
  - **Before**: Skeleton was showing; fetch resolved with an empty filtered array
  - **Expected**: No error toast is shown. The feed renders MOCK_TRADES. The mock banner "Using sample data — upload positions or connect Google to see live trades" is visible. Subtitle reads "Sample data — connect Google to load live trades".

- [ ] **[Feed > Mock > HSW returns 0 results — no error toast]**: Confirm no toast fires on empty-results path
  - **Before**: HSW returned data but watchlist filter yielded 0 results
  - **Expected**: No toast notification appears. The transition from skeleton to mock cards is silent. This distinguishes the "no results" path (silent fallback) from the "fetch error" path (error toast).

- [ ] **[Feed > Mock > Google not connected — seed watchlist]**: Open Feed without completing Google OAuth (not signed in)
  - **Before**: App loaded but user has not authenticated; `sth_auth` is not in localStorage
  - **Expected**: The Sheets watchlist read fails silently. Feed falls back to the seed watchlist (`WATCHLIST` from `src/data/watchlist.js`), which includes members like Nancy Pelosi and Mike Johnson with `active: 'Y'`. If HSW fetch also fails (unauthenticated CORS), mock data is shown. No crash. No empty white screen.

- [ ] **[Feed > Mock > mock subtitle format]**: Read subtitle when mock data is active for any reason
  - **Before**: `usingMock = true` (either error path or zero-results path)
  - **Expected**: Subtitle is exactly "Sample data — connect Google to load live trades". This text appears regardless of whether the mock was triggered by an HSW error or by a 0-result filter.

---

#### Watchlist Filtering

- [ ] **[Feed > Watchlist > only watchlist members shown]**: Load Feed with live HSW data while authenticated with a Sheets watchlist containing specific names
  - **Before**: Live data loaded; Sheets watchlist has e.g. 5 active members
  - **Expected**: Every visible trade card shows a politician name that appears in the Sheets watchlist. No trade from a politician NOT on the watchlist is rendered. This applies to both name exact-match and case-insensitive match as implemented by `filterByWatchlist`.

- [ ] **[Feed > Watchlist > non-watchlist politicians absent]**: Confirm a known non-watchlist politician is not shown
  - **Before**: Live data; Sheets watchlist does not include e.g. "Mitch McConnell"
  - **Expected**: No card for Mitch McConnell (or any other off-watchlist politician) appears in the feed, even if HSW returned trades for that politician within the past 30 days.

- [ ] **[Feed > Watchlist > 90-day window]**: Verify trades older than 90 days are excluded
  - **Before**: Live data loaded; some HSW transactions have `transaction_date` older than 90 days ago
  - **Expected**: No card appears for a transaction dated more than 90 days before today. Only trades within the rolling 90-day window appear. Count in subtitle reflects only the 90-day window ("N disclosures · last 90 days").
  - **Regression**: Subtitle previously said "last 30 days" while the filter used 90 days; both are now aligned at 90 days.

- [ ] **[Feed > Watchlist > Sheets watchlist takes priority over seed]**: Authenticated user with a populated `watchlist` Sheets tab
  - **Before**: Sheets tab has active members; seed WATCHLIST constant also has members
  - **Expected**: The names used for filtering come from Sheets, not from the seed constant. If a name appears in the seed but not Sheets (and Sheets has ≥ 1 active member), that seed name is NOT used for filtering.

- [ ] **[Feed > Watchlist > empty Sheets watchlist falls back to seed]**: Authenticated user whose `watchlist` Sheets tab exists but has 0 rows with `active = 'Y'`
  - **Before**: Sheets tab is present but all members have `active ≠ 'Y'`
  - **Expected**: App falls back to seed watchlist (WATCHLIST constant). No error toast. Filtering proceeds using seed names. Debug log reads "Sheets watchlist empty — using seed (N members)".

---

#### Card Interactions — Regression (must work with live data)

- [ ] **[Feed > Card > tap body to expand]**: Tap anywhere in the upper body of a trade card (name/ticker area, not on a button)
  - **Before**: Card is collapsed; the "AI Summary" section (`data-expanded-id`) has `display: none`
  - **Expected**: The expanded section animates open (display switches to `block`). An "AI SUMMARY" label (11 px, uppercase, spaced, `var(--text-tertiary)`) and summary body text appear. "Disclosed: [date] · Traded: [date]" meta row is visible below the summary. The card body click target is the full `.trade-card-body` div — tapping ticker text, politician name, or relative date all trigger expand.

- [ ] **[Feed > Card > tap body to collapse]**: Tap the card body of an already-expanded card
  - **Before**: Card has `data-expanded="true"`; summary section is visible
  - **Expected**: Expanded section collapses (`display: none`). Card returns to compact height. No animation jank. `data-expanded` attribute changes to `"false"`.

- [ ] **[Feed > Card > tap expand, then collapse, then re-expand]**: Tap card body three times in sequence
  - **Before**: Card starts collapsed
  - **Expected**: First tap → expands. Second tap → collapses. Third tap → expands again. State toggles cleanly each time. No event listener duplication; third tap does not fire twice.

- [ ] **[Feed > Card > Follow button tap]**: Tap the "Follow" button on any trade card
  - **Before**: Button reads "Follow" with subtle green background (`rgba(127,184,131,0.12)`) and green text (`var(--buy)`)
  - **Expected**: Button text changes to "✓ Follow". Button background intensifies to `rgba(127,184,131,0.22)`. Border color brightens to `rgba(127,184,131,0.4)`. The card's left border becomes 3 px wide and `var(--buy)` green. The change is instant (no animation). `sth_trade_decisions` in localStorage has `{ "[tradeId]": "followed" }`.

- [ ] **[Feed > Card > Follow button — idempotent second tap]**: Tap "✓ Follow" on an already-followed card
  - **Before**: Card already in followed state (`✓ Follow` label, green border)
  - **Expected**: Nothing changes. The `if (cardState.get(tradeId) === 'followed') return` guard fires. No duplicate localStorage writes. Button does not toggle off. Card retains green border.

- [ ] **[Feed > Card > Ignore button tap]**: Tap the "Ignore" button on any trade card
  - **Before**: Card is visible; button reads "Ignore" in ghost style
  - **Expected**: Card begins a fade-out + collapse animation over ~300 ms (opacity → 0, max-height → 0, margins collapse). After 320 ms the card element is fully removed from the DOM. The remaining cards close the vertical gap smoothly. `sth_trade_decisions` in localStorage has `{ "[tradeId]": "ignored" }`.

- [ ] **[Feed > Card > Ignore removes from DOM]**: After ignoring a card, inspect the DOM
  - **Before**: Card removal animation completed
  - **Expected**: The `.trade-card[data-trade-id="N"]` element is absent from `#feed-cards`. No ghost space or invisible element remains. The total visible card count decreases by 1.

- [ ] **[Feed > Card > Follow persists across navigation]**: Follow a trade, navigate to Positions, then navigate back to Feed
  - **Before**: A trade was followed in Feed; user is now returning
  - **Expected**: The followed trade card reappears with "✓ Follow" label, intensified green button background, and 3 px green left border — restored by `_applyFollowedUI()` during render. `sth_trade_decisions` in localStorage still holds `"followed"` for that trade ID.

- [ ] **[Feed > Card > Ignore persists across navigation]**: Ignore a trade, navigate to Home, then navigate back to Feed
  - **Before**: A trade was ignored; user is returning to Feed
  - **Expected**: The ignored trade card is NOT rendered. `visibleTrades` filtered it out via `decisions[t.id] !== 'ignored'`. The subtitle count reflects the reduced count. The ignored trade never appears during this session or future sessions until localStorage is cleared.

- [ ] **[Feed > Card > Follow button does not trigger card expand]**: Tap the Follow button precisely
  - **Before**: Card is collapsed
  - **Expected**: Card stays collapsed. The follow button has `e.stopPropagation()` which prevents the click from bubbling to the `.trade-card-body` expand handler. Only card body taps trigger expand/collapse.

- [ ] **[Feed > Card > Ignore button does not trigger card expand]**: Tap the Ignore button precisely
  - **Before**: Card is collapsed
  - **Expected**: Card begins the removal animation immediately. It does NOT expand first. `e.stopPropagation()` prevents the click from reaching the expand handler.

---

#### Signal / Navigation Guards

- [ ] **[Feed > Signal > navigate away during skeleton]**: Tap "What's New" to start Feed load, then immediately tap ← back before skeleton finishes
  - **Before**: Feed skeleton just appeared; HSW fetch is in-flight; user taps ← within ~200 ms
  - **Expected**: Home view renders correctly. The in-flight HSW fetch may complete but its result is discarded. No stale feed content overwrites the Home view. No JS error thrown. `signal.aborted` check in `renderFeed` prevents the `container.innerHTML` write from executing after navigation.

- [ ] **[Feed > Signal > navigate away after fetch resolves]**: Tap "What's New", wait ~2 s for HSW to complete, then rapidly tap ← just as cards begin rendering
  - **Before**: HSW fetch completed; render is about to write card HTML
  - **Expected**: If `container.isConnected` is false at that moment, the render is abandoned. Home view is intact. No feed cards flash briefly over the home view. No DOM exception from writing to a detached container.

- [ ] **[Feed > Signal > rapid home→feed→home→feed navigation]**: Tap "What's New" → ← → "What's New" → ← → "What's New" five times in rapid succession (~300 ms between taps)
  - **Before**: Starting from Home; performing 5 rapid round-trips
  - **Expected**: On the final navigation to Feed, one and only one feed render completes. Earlier in-flight renders are cancelled by their AbortController signals. The final feed view shows the correct trade cards with no duplicate event listeners. No crash. No blank screen. Subtitle count is correct.

- [ ] **[Feed > Signal > ignore animation abort on navigation]**: Tap Ignore on a card to start its removal animation, then immediately tap ← to navigate home before the 320 ms timer fires
  - **Before**: Ignore animation is in-flight (card fading); user navigates away
  - **Expected**: The `signal` abort event fires, cancelling the `requestAnimationFrame` and `setTimeout` for that card. No attempt to call `.remove()` on a detached node. No crash. Home view renders normally.

---

#### Edge Cases

- [ ] **[Feed > Empty State > all trades ignored]**: Ignore every visible trade card one by one until none remain
  - **Before**: Feed showing N trade cards (either mock or live)
  - **Expected**: After ignoring the last card, the feed area (below the header row) shows a centered empty-state block with the text "No recent disclosures found for your watchlist." and a secondary line "All trades may have been dismissed, or your watchlist may be empty." in `var(--text-tertiary)`. No card container or `#feed-cards` div is present.

- [ ] **[Feed > Empty State > correct subtitle when empty]**: Observe the subtitle when the empty state is displayed
  - **Before**: All trades ignored; empty state rendered
  - **Expected**: The "Recent Trades" heading and subtitle are still shown above the empty-state message. If on live data, subtitle reads "0 disclosures · last 90 days". If on mock data, subtitle reads "Sample data — connect Google to load live trades".

- [ ] **[Feed > Empty State > persists on return]**: After ignoring all trades, navigate to Home and return to Feed
  - **Before**: Empty state was the last Feed render before navigating away
  - **Expected**: Feed re-renders the empty state on return. All decisions are loaded from `sth_trade_decisions` in localStorage. No previously-ignored trade reappears. Empty state message is visible again.

- [ ] **[Feed > Empty State > empty state does not crash]**: Confirm no JS exception when all trades are filtered out
  - **Before**: `visibleTrades.length === 0` after decision filter
  - **Expected**: The early-return branch in `renderFeed` executes, writing the empty-state HTML and returning. No subsequent card-render or event-listener code runs. No "Cannot read properties of undefined" or similar error in the console.

---

#### Regression Tests

- [ ] **[Feed > Regression > follow → positions → return]**: Follow one trade card, navigate to Positions (Home → Portfolio tile), then navigate back to Feed (Home → What's New)
  - **Before**: Trade was followed; Feed is being re-rendered
  - **Expected**: The followed trade card is visible. Its Follow button reads "✓ Follow" with the intensified green style. Its card has a 3 px green left border. `_applyFollowedUI` ran during render. The other cards are in their default state.

- [ ] **[Feed > Regression > ignore 3 → home → return count]**: Ignore exactly 3 trade cards, navigate to Home, then return to Feed
  - **Before**: 3 trades ignored; Feed re-renders
  - **Expected**: The 3 ignored cards are absent. If there were originally 5 mock cards, now 2 are shown. Subtitle reads "2 disclosures · last 90 days" (or mock equivalent with count 2). Ignored trade IDs remain in localStorage.

- [ ] **[Feed > Regression > ignore 3 → home → return DOM check]**: After returning from Home, inspect the DOM for ignored card elements
  - **Before**: 3 trades were ignored before navigating away
  - **Expected**: None of the 3 ignored trade card elements (`.trade-card[data-trade-id="X"]`) exist in the DOM. They were excluded from `visibleTrades` before rendering — they were never inserted, not just hidden.

- [ ] **[Feed > Regression > mock IDs vs live IDs do not cross-contaminate]**: Ignore a mock trade (e.g. id "1" = Pelosi/NVDA), then authenticate and reload Feed so live data loads
  - **Before**: `sth_trade_decisions` has `{ "1": "ignored" }` from mock session; live data now loads
  - **Expected**: If a live trade happens to have id "1", it will also be filtered out (since the decision lookup is by `trade.id`). If live trade IDs are different (e.g. HSW uses different ID format), those trades appear normally. The key point: no crash, no stale mock card reappears, and ignored IDs from mock do not cause live cards with different IDs to disappear. Verify the live ID format in the HSW API response and confirm the behavior is deterministic.

- [ ] **[Feed > Regression > double-tap Follow does not double-write localStorage]**: Tap Follow on a card, then tap "✓ Follow" again immediately
  - **Before**: First tap already applied `followed` state
  - **Expected**: `localStorage.getItem('sth_trade_decisions')` contains exactly one entry for that trade ID. No duplicate or overwrite race condition. The `if (cardState.get(tradeId) === 'followed') return` guard fires on the second tap.

- [ ] **[Feed > Regression > Ignore during expand does not crash]**: Expand a card (tap body), then tap the Ignore button while it is in expanded state
  - **Before**: Card is expanded (`data-expanded="true"`); expanded section is visible
  - **Expected**: The full card (including its expanded section) animates out together. The `.trade-card` wrapper includes both the collapsed and expanded DOM, so both fade and collapse simultaneously. No orphaned expanded-section element remains. No JS error.

- [ ] **[Feed > Regression > skeleton replaced on error]**: Trigger HSW fetch failure (offline)
  - **Before**: Skeleton showing 6 shimmer cards
  - **Expected**: After the error, all 6 shimmer cards are replaced by real mock trade cards. No shimmer card remains in the DOM. The error toast fires once. The mock banner appears. The subtitle is the mock subtitle text.

---

---

## ### Logging / Observability

- [ ] **[Sheets log > API entry]**: Open the app, navigate to Feed, and wait for trades to finish loading. Then open the connected Google Sheet and inspect the `log` tab.
  - **Before**: App just navigated to Feed; HSW fetch resolved successfully
  - **Expected**: At least one row is present in the `log` tab with all 6 columns populated: column A = ISO timestamp (e.g. `2026-03-20T14:05:00.000Z`), column B = level (`INFO` or `DEBUG`), column C = category (`CONGRESSIONAL_API`), column D = message (`Raw API response received`), column E = any context string, column F = JSON object containing a `trade_count` key. Column A must NOT be empty — the timestamp must appear in the first column, not shifted to column B.
  - **Regression**: The logger re-entrancy guard (`_writing` flag) was buffering new entries while a Sheets write was in progress and never draining the buffer. As a result, log entries generated during `appendRows` calls (including API response logs) were silently dropped and never written to the Sheet. Additionally, the last row of each batch had an empty column A because the timestamp was being shifted one column right. Both issues are resolved — buffer drains after each write, and column ordering is stable.

---

*Last updated: 2026-03-20*
