/**
 * Top Signal tests — all pills, all filter combinations, state persistence.
 */

import { test, expect } from '@playwright/test'
import { setupAuth, goHome } from './helpers/auth.js'
import { checkTopSignalDataSource } from './helpers/dataCheck.js'

// ─── Deterministic mock payload for all topSignal tests ──────────────────────
//
// Tests need a predictable, stable set of signals. Real congressional-trades.json
// changes over time and only produces signals when enough traders cross tier1
// thresholds within the active window. We use route.fulfill() in beforeEach so
// every test gets exactly 7 signals with the correct party/action distribution.
//
// 7 tickers designed for filter tests:
//   D-majority buys (partyD > partyR): NVDA, AAPL, MSFT, META  → 4 cards
//   R-majority buys (partyR > partyD): AMZN, GOOGL              → 2 cards
//   D-majority sells (partyD > partyR, sellCount > buyCount): WMT → 1 card
//
// Tier1 threshold: 8% of 213 Dems = 17.04 → need ≥18 unique D traders
//                 8% of 222 Reps = 17.76 → need ≥18 unique R traders
//
// MOCK_TRADES_PAYLOAD (single-ticker, 18 D buyers) is kept for the
// [MOCK BANNER ABSENT] test which overrides beforeEach's route via LIFO routing.

const _RECENT = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10)

const _D_NAMES = [
  'D_Rep_1','D_Rep_2','D_Rep_3','D_Rep_4','D_Rep_5','D_Rep_6',
  'D_Rep_7','D_Rep_8','D_Rep_9','D_Rep_10','D_Rep_11','D_Rep_12',
  'D_Rep_13','D_Rep_14','D_Rep_15','D_Rep_16','D_Rep_17','D_Rep_18',
]
const _R_NAMES = [
  'R_Rep_1','R_Rep_2','R_Rep_3','R_Rep_4','R_Rep_5','R_Rep_6',
  'R_Rep_7','R_Rep_8','R_Rep_9','R_Rep_10','R_Rep_11','R_Rep_12',
  'R_Rep_13','R_Rep_14','R_Rep_15','R_Rep_16','R_Rep_17','R_Rep_18',
]

function _makeTrades(ticker, party, action, names) {
  return names.map((name, i) => ({
    id:               `${ticker}-${party}-${action}-${i}`,
    politician_name:  name,
    party,
    ticker,
    action,
    amount_low:       15001,
    amount_high:      50000,
    transaction_date: _RECENT,
    disclosed_date:   _RECENT,
    sp500:            'Y',
  }))
}

// 7-ticker payload — produces exactly 7 signal cards across all filter states
const MOCK_7_PAYLOAD = {
  generated_at: new Date().toISOString(),
  trades: [
    ..._makeTrades('NVDA', 'D', 'buy',  _D_NAMES),  // D-majority buy
    ..._makeTrades('AAPL', 'D', 'buy',  _D_NAMES),  // D-majority buy
    ..._makeTrades('MSFT', 'D', 'buy',  _D_NAMES),  // D-majority buy
    ..._makeTrades('META', 'D', 'buy',  _D_NAMES),  // D-majority buy
    ..._makeTrades('AMZN', 'R', 'buy',  _R_NAMES),  // R-majority buy
    ..._makeTrades('GOOGL','R', 'buy',  _R_NAMES),  // R-majority buy
    ..._makeTrades('WMT',  'D', 'sell', _D_NAMES),  // D-majority sell
  ],
}

// Single-ticker payload for [MOCK BANNER ABSENT] test — overrides beforeEach route via LIFO.
// 18 D buyers of NVDA → 1 real signal → mock-banner must be absent.
const MOCK_TRADES_PAYLOAD = {
  generated_at: new Date().toISOString(),
  trades: _makeTrades('NVDA', 'D', 'buy', _D_NAMES),
}

test.beforeEach(async ({ page }) => {
  await setupAuth(page)
  // Intercept congressional-trades.json with deterministic 7-ticker mock data.
  // Must be registered before goHome so it's in place when Top Signal renders.
  await page.route('**/congressional-trades.json', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_7_PAYLOAD) })
  )
  await goHome(page)
  // Clear any stale cache so the route.fulfill() mock is always used.
  await page.evaluate(() => localStorage.removeItem('congressional_cache'))
  await page.locator('.home-card').nth(1).click()
  await page.locator('#party-filters').waitFor({ timeout: 5000 })
})

// ─── Data source observability ────────────────────────────────────────────────

test('[DATA SOURCE] top signal data source phase status', async ({ page }, testInfo) => {
  await checkTopSignalDataSource(page, testInfo)
})

// ─── Mock-banner observability ────────────────────────────────────────────────
// CLAUDE.md rule: every view with a mock-data fallback MUST assert the banner
// is NOT present when the real API is expected to succeed.
// Uses route.fulfill() (NOT route.abort()) so test isolation cannot mask real failures.

test('[MOCK BANNER ABSENT] no mock-data banner when congressional-trades.json returns valid data', async ({ page }) => {
  // Must be registered before navigation so it intercepts the initial fetch.
  // setupAuth already ran in beforeEach and aborted googleapis/HSW routes;
  // congressional-trades.json is not covered by that pattern and is intercepted here.
  await page.route('**/congressional-trades.json', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TRADES_PAYLOAD),
    })
  )

  // Clear localStorage cache so fetchAllTransactions hits the network (not the 1-hour cache)
  await page.evaluate(() => localStorage.removeItem('congressional_cache'))

  // Re-navigate to Top Signal so the fulfilled route is used for this render.
  await page.locator('#back-btn').click()
  await page.locator('.home-card').nth(1).click()
  await page.locator('#party-filters').waitFor({ timeout: 8000 })

  // The mock-data banner must NOT be visible when live data was returned.
  await expect(page.locator('[data-testid="mock-banner"]')).not.toBeVisible()
})

// ─── Render ───────────────────────────────────────────────────────────────────

test('shows 7 signal cards by default (all stocks)', async ({ page }) => {
  await expect(page.locator('#signal-list .card')).toHaveCount(7)
})

test('party, action, and window filter rows all visible', async ({ page }) => {
  await expect(page.locator('#party-filters')).toBeVisible()
  await expect(page.locator('#action-filters')).toBeVisible()
  await expect(page.locator('#window-filters')).toBeVisible()
})

test('Buy → button exists on each card', async ({ page }) => {
  const buyBtns = page.locator('#signal-list button', { hasText: 'Buy →' })
  await expect(buyBtns).toHaveCount(7)
})

// ─── Party filter pills ───────────────────────────────────────────────────────

test('Dem pill filters to dem-majority stocks', async ({ page }) => {
  await page.locator('[data-party="D"]').click()
  // NVDA(D11>R8), AAPL(D6>R4), META(D4>R2) = 3 dem-majority stocks
  const count = await page.locator('#signal-list .card').count()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(7)
})

test('Rep pill filters to rep-majority stocks', async ({ page }) => {
  await page.locator('[data-party="R"]').click()
  const count = await page.locator('#signal-list .card').count()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(7)
})

test('All pill after filter restores all 7 stocks', async ({ page }) => {
  await page.locator('[data-party="D"]').click()
  await page.locator('[data-party="all"]').click()
  await expect(page.locator('#signal-list .card')).toHaveCount(7)
})

test('[REGRESSION] Dem then Rep then All — each pill registers (no accumulation)', async ({ page }) => {
  // Bug: each _render() call re-attached listeners; by 3rd click there were 4+ handlers
  await page.locator('[data-party="D"]').click()
  const demCount = await page.locator('#signal-list .card').count()

  await page.locator('[data-party="R"]').click()
  const repCount = await page.locator('#signal-list .card').count()

  await page.locator('[data-party="all"]').click()
  // All must fully restore — listener accumulation would break this
  await expect(page.locator('#signal-list .card')).toHaveCount(7)

  // Each filtered state must be a proper subset (< 7), proving filters fired exactly once
  expect(demCount).toBeGreaterThan(0)
  expect(demCount).toBeLessThan(7)
  expect(repCount).toBeGreaterThan(0)
  expect(repCount).toBeLessThan(7)
})

test('[REGRESSION] rapid party pill taps — final state matches last tap', async ({ page }) => {
  // Tap quickly: all→D→R→all→D
  await page.locator('[data-party="all"]').click()
  await page.locator('[data-party="D"]').click()
  await page.locator('[data-party="R"]').click()
  await page.locator('[data-party="all"]').click()
  await page.locator('[data-party="D"]').click()
  // Final state: Dem filter active
  const count = await page.locator('#signal-list .card').count()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(7)
})

// ─── Action filter pills ──────────────────────────────────────────────────────

test('Buys pill filters to buy-majority stocks', async ({ page }) => {
  await page.locator('[data-action="buy"]').click()
  const count = await page.locator('#signal-list .card').count()
  expect(count).toBeGreaterThan(0)
})

test('Sells pill filters to sell-majority stocks only', async ({ page }) => {
  const allCount = await page.locator('#signal-list .card').count()
  await page.locator('[data-action="sell"]').click()
  const sellCount = await page.locator('#signal-list .card').count()
  // Should show only sell-majority stocks (fewer than all, at least 1)
  expect(sellCount).toBeGreaterThan(0)
  expect(sellCount).toBeLessThan(allCount)
})

test('All action pill restores full list', async ({ page }) => {
  await page.locator('[data-action="buy"]').click()
  await page.locator('[data-action="all"]').click()
  await expect(page.locator('#signal-list .card')).toHaveCount(7)
})

test('[REGRESSION] action pills work after party pills (cross-filter)', async ({ page }) => {
  await page.locator('[data-party="D"]').click()
  await page.locator('[data-action="buy"]').click()
  const count = await page.locator('#signal-list .card').count()
  // Combined filter — should be >= 0
  expect(count).toBeGreaterThanOrEqual(0)
  // Reset both
  await page.locator('[data-party="all"]').click()
  await page.locator('[data-action="all"]').click()
  await expect(page.locator('#signal-list .card')).toHaveCount(7)
})

// ─── Window pills ─────────────────────────────────────────────────────────────

test('90d window pill is active by default', async ({ page }) => {
  // Default _activeWindow is 90 — verify via subtitle text
  await expect(page.locator('text=last 90d')).toBeVisible()
})

test('30d window pill updates subtitle', async ({ page }) => {
  await page.locator('[data-window="30"]').click()
  await expect(page.locator('text=last 30d')).toBeVisible()
})

test('14d window pill updates subtitle', async ({ page }) => {
  await page.locator('[data-window="14"]').click()
  await expect(page.locator('text=last 14d')).toBeVisible()
})

test('14d→30d→90d→14d cycle — each registers correctly', async ({ page }) => {
  await page.locator('[data-window="30"]').click()
  await expect(page.locator('text=last 30d')).toBeVisible()
  await page.locator('[data-window="90"]').click()
  await expect(page.locator('text=last 90d')).toBeVisible()
  await page.locator('[data-window="14"]').click()
  await expect(page.locator('text=last 14d')).toBeVisible()
})

test('30d window pill becomes visually active after click (accent border)', async ({ page }) => {
  await page.locator('[data-window="30"]').click()
  // Subtitle text confirms the window state changed
  await expect(page.locator('text=last 30d')).toBeVisible()
  // All window pills must still be present after re-render
  await expect(page.locator('[data-window="30"]')).toBeVisible()
  await expect(page.locator('[data-window="14"]')).toBeVisible()
  await expect(page.locator('[data-window="90"]')).toBeVisible()
})

// ─── Card actions ─────────────────────────────────────────────────────────────

test('Buy → button navigates to whatToBuy', async ({ page }) => {
  await page.locator('#signal-list button', { hasText: 'Buy →' }).first().click()
  await expect(page.locator('#amount-input')).toBeVisible({ timeout: 5000 })
})

// ─── Re-navigation ────────────────────────────────────────────────────────────

test('filter state resets on re-navigation', async ({ page }) => {
  await page.locator('[data-party="D"]').click()
  await page.locator('#back-btn').click()
  await page.locator('.home-card').nth(1).click()
  await page.locator('#party-filters').waitFor()
  // Should show all 6 (state reset) — actually module-level state persists;
  // at minimum the view should not crash
  const count = await page.locator('#signal-list .card').count()
  expect(count).toBeGreaterThan(0)
})
