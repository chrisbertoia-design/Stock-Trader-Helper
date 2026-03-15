# Evals Directory

## What `ui-click-paths.md` is

`ui-click-paths.md` is an exhaustive manual QA checklist for the Stock Trader Helper PWA, targeting iOS Chrome (WebKit engine) on iPhone via the GitHub Pages deployment.

It covers every interactive element in the app — every button, pill, input, card expand/collapse, navigation path, async state transition, and scroll behavior. Each item specifies:

- **Before**: what the UI looks like before the action
- **Expected**: exactly what should change (text, color, navigation, timing, animation)
- **Regression** (where applicable): which specific bug the test catches

The checklist is organized by view: Pre-Flight, Home, Feed, Top Signal, Positions, What to Buy, Settings, Toast, Global Header, and a mandatory Crash Regression section at the end.

## When to run it

Run the checklist in these situations:

1. **After every bug fix push** — before merging or closing the backlog item
2. **Before every mobile QA session** on iPhone — run top to bottom, check off each item
3. **After adding any new interactive element** — add corresponding checklist items before shipping
4. **After any change touching** navigation (`app.js`), event listeners, async render paths, or CSS transitions

For minor copy-only or style-only changes, a targeted spot-check of the affected view is acceptable instead of a full run.

## How to run it

1. Open `https://chrisbertoia-design.github.io/Stock-Trader-Helper/` in iOS Chrome on iPhone
2. Sign in with Google if not already authenticated
3. Open `ui-click-paths.md` alongside the device (on Mac or printed)
4. Work through the checklist top to bottom — do not skip sections
5. Check off each item `[ ]` → `[x]` as you confirm it passes
6. If an item fails, note the failure inline with a brief description and open a backlog item

The Crash Regression section at the end is mandatory on every run — do not skip it even if all view-level tests pass.

## Future: Playwright automation

Manual testing against iOS Chrome/WebKit is the current approach because the app is a GitHub Pages PWA with Google OAuth and live API calls that are difficult to stub in CI.

Planned automation path:
- Playwright with WebKit driver for navigation and pill filter tests
- Mock the Google OAuth token and Sheets API calls via `page.route()` intercepts
- Automate the Crash Regression section first (rapid back-and-forth, async race, stale render) since those are highest-value and hardest to catch manually under fast-tap conditions
- Keep the manual checklist for touch-target sizing, toast timing, and visual accuracy checks that Playwright cannot fully verify
