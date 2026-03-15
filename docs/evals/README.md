# Eval Process

## What this directory is

`docs/evals/` holds test artifacts for Stock Trader Helper. The current focus is manual pre-flight testing on iOS Chrome, with a clear path to Playwright automation once the app stabilises.

---

## Files

| File | Purpose |
|------|---------|
| `ui-click-paths.md` | Manual pre-flight checklist — every interactive element, every nav path, crash regression replays |

---

## Manual Pre-flight (current process)

### When to run

Run `ui-click-paths.md` in full before:
- Every mobile QA session on the GitHub Pages deployment
- Any PR that touches `src/ui/` (any view, app shell, or component)
- Any PR that touches `src/stores/positions.js` or `src/api/googleSheets.js` (async flows that feed views)
- After a Vite config or dependency change

A quick subset run (sections 1–6 only, skip crash regression) is acceptable for cosmetic-only changes (CSS, copy, color).

### How to run

1. Open `https://chrisbertoia-design.github.io/Stock-Trader-Helper/` in iOS Chrome.
2. Sign in with Google if not already authenticated.
3. Work through `ui-click-paths.md` top-to-bottom. Check each box as you verify it.
4. If an item fails, stop and file a bug before continuing — crashes can mask downstream failures.
5. Record the result with a date stamp in a comment on the relevant PR or backlog item.

### Minimum bar to ship

All items in sections 0–8 must pass. Section 9 (crash regressions) must pass in full. Section 10 (visual) is best-effort but P0 items (horizontal scroll, tap targets) must pass.

### Resetting state between runs

Some tests depend on localStorage state (`sth_trade_decisions`). To reset:
- Open iOS Chrome DevTools via Safari remote debugging, or
- Add `?reset=1` to the URL and handle it, or
- Clear site data in iOS Chrome: Settings → Privacy → Clear Browsing Data → filter to `chrisbertoia-design.github.io`

Alternatively, run the ignore-all-trades test at the end of the Feed section to deliberately clear state, then use a fresh session for the next run.

---

## Planned: Playwright Automation

Manual pre-flight will not scale once real API calls are wired (BL-019, BL-020, BL-021). The target is to automate the interaction matrix in `ui-click-paths.md` using Playwright.

### Approach when implemented

**Stack:** Playwright with `@playwright/test`. Tests run in Chromium (closest to iOS Chrome without requiring a real device). Mobile viewport emulation (`iPhone 14` preset) for layout checks.

**Test file layout (proposed):**

```
tests/
  e2e/
    shell.spec.ts          # Header, back button, settings gear, toast
    home.spec.ts           # 4 cards, navigation paths from home
    feed.spec.ts           # Expand/collapse, follow, ignore, localStorage persistence
    topSignal.spec.ts      # Filter pills, window toggle, Buy → button
    positions.spec.ts      # Skeleton, CSV upload (fixture file), mock fallback
    whatToBuy.spec.ts      # Step 1 validation, pills, stepper, Step 2 results
    settings.spec.ts       # Form fields, Save button toast
    crash-regression.spec.ts  # All items in section 9 of ui-click-paths.md
```

**Fixtures:** A `tests/fixtures/` directory will hold sample Schwab CSV exports (positions and transactions format) for upload testing.

**Auth:** Tests will run against a locally served build (`npm run build && npx serve dist`). Google OAuth will be bypassed using a mocked auth state injected into `localStorage` before each test (`page.addInitScript`).

**CI integration:** Add a `playwright.yml` GitHub Actions workflow that runs tests on every PR to `claude/web-app-google-sheets-wt63b`. Block merge on failure.

### Migration plan

1. Write Playwright tests for sections 9 (crash regressions) first — highest ROI, lowest flakiness risk.
2. Add shell + home tests (pure mock data, no auth needed).
3. Add feed, topSignal, whatToBuy tests.
4. Add positions tests with CSV fixture files.
5. Add settings tests.
6. Once all sections are automated, the manual pre-flight checklist reduces to a visual-only pass (section 10) before each mobile QA session.

---

## Philosophy

- A manual checklist that is actually run beats an automated suite that is never maintained.
- Crash regression tests earn their place first — they document bugs that already burned time.
- Every new interactive element added to a view must get a corresponding entry in `ui-click-paths.md` before the PR lands. This is a definition-of-done requirement.
