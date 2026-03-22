/**
 * Feed view tests — expand/collapse, follow, ignore, persistence, crash regressions.
 */

import { test, expect } from '@playwright/test'
import { setupAuth, goHome } from './helpers/auth.js'
import { checkFeedDataSource } from './helpers/dataCheck.js'

test.beforeEach(async ({ page }) => {
  await setupAuth(page)
  // Intercept congressional-trades.json with exactly 5 controlled trades so
  // ignore-count tests are deterministic regardless of real seed file size.
  await page.route('**/congressional-trades.json', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        generated_at: new Date().toISOString(),
        trades: [
          { id: '1', politician_name: 'Nancy Pelosi',     party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 250001, amount_high: 500000,  transaction_date: '2026-03-11', disclosed_date: '2026-03-13' },
          { id: '2', politician_name: 'Tommy Tuberville', party: 'R', ticker: 'MSFT', action: 'buy',  amount_low: 15001,  amount_high: 50000,   transaction_date: '2026-03-10', disclosed_date: '2026-03-12' },
          { id: '3', politician_name: 'Ro Khanna',        party: 'D', ticker: 'AAPL', action: 'sell', amount_low: 50001,  amount_high: 100000,  transaction_date: '2026-03-08', disclosed_date: '2026-03-11' },
          { id: '4', politician_name: 'Josh Gottheimer',  party: 'D', ticker: 'AMD',  action: 'buy',  amount_low: 100001, amount_high: 250000,  transaction_date: '2026-03-07', disclosed_date: '2026-03-10' },
          { id: '5', politician_name: 'Michael McCaul',   party: 'R', ticker: 'TSM',  action: 'buy',  amount_low: 500001, amount_high: 1000000, transaction_date: '2026-03-05', disclosed_date: '2026-03-09' },
        ],
      }),
    })
  )
  await goHome(page)
  // Clear any prior decisions and cache so each test starts fresh
  await page.evaluate(() => {
    localStorage.removeItem('sth_trade_decisions')
    localStorage.removeItem('congressional_cache')
  })
  await page.locator('.home-card').first().click()
  await page.locator('#feed-cards').waitFor({ timeout: 5000 })
})

// ─── Data source observability ────────────────────────────────────────────────

test('[DATA SOURCE] feed using real HSW data vs mock fallback', async ({ page }, testInfo) => {
  // Always passes. Annotates WARNING in the report if live API data is absent.
  await checkFeedDataSource(page, testInfo)
})

// ─── Render ───────────────────────────────────────────────────────────────────

test('feed renders trade cards', async ({ page }) => {
  const cards = page.locator('.trade-card')
  await expect(cards).toHaveCount(5)
})

test('feed shows politician name and ticker on each card', async ({ page }) => {
  const firstCard = page.locator('.trade-card').first()
  await expect(firstCard).toContainText('Pelosi')
  await expect(firstCard).toContainText('NVDA')
})

// ─── Expand / collapse ────────────────────────────────────────────────────────

test('expanded section is hidden by default', async ({ page }) => {
  const expanded = page.locator('.trade-card-expanded').first()
  await expect(expanded).toBeHidden()
})

test('tapping card body expands AI summary', async ({ page }) => {
  await page.locator('.trade-card-body').first().click()
  const expanded = page.locator('.trade-card-expanded').first()
  await expect(expanded).toBeVisible()
  await expect(expanded).toContainText('AI Summary')
})

test('tapping expanded card body collapses it', async ({ page }) => {
  await page.locator('.trade-card-body').first().click()
  await page.locator('.trade-card-expanded').first().waitFor({ state: 'visible' })
  await page.locator('.trade-card-body').first().click()
  await expect(page.locator('.trade-card-expanded').first()).toBeHidden()
})

test('re-expand after collapse works', async ({ page }) => {
  await page.locator('.trade-card-body').first().click()
  await page.locator('.trade-card-expanded').first().waitFor({ state: 'visible' })
  await page.locator('.trade-card-body').first().click()
  await page.locator('.trade-card-expanded').first().waitFor({ state: 'hidden' })
  await page.locator('.trade-card-body').first().click()
  await expect(page.locator('.trade-card-expanded').first()).toBeVisible()
})

// ─── Follow ───────────────────────────────────────────────────────────────────

test('follow button changes to ✓ Follow', async ({ page }) => {
  const btn = page.locator('.trade-follow-btn').first()
  await btn.click()
  await expect(btn).toContainText('✓ Follow')
})

test('follow is idempotent — double click does not change state', async ({ page }) => {
  const btn = page.locator('.trade-follow-btn').first()
  await btn.click()
  await expect(btn).toContainText('✓ Follow')
  await btn.click()
  await expect(btn).toContainText('✓ Follow')
  // Card count unchanged — not removed
  await expect(page.locator('.trade-card')).toHaveCount(5)
})

test('followed state persists across navigation', async ({ page }) => {
  await page.locator('.trade-follow-btn').first().click()
  await page.locator('#back-btn').click()
  await page.locator('.home-card').first().click()
  await page.locator('#feed-cards').waitFor()
  const btn = page.locator('.trade-follow-btn').first()
  await expect(btn).toContainText('✓ Follow')
})

// ─── Ignore ───────────────────────────────────────────────────────────────────

test('ignore button removes card from feed', async ({ page }) => {
  await expect(page.locator('.trade-card')).toHaveCount(5)
  await page.locator('.trade-ignore-btn').first().click()
  // Wait for 320ms animation + removal
  await expect(page.locator('.trade-card')).toHaveCount(4, { timeout: 1500 })
})

test('ignore is idempotent — card is gone after first ignore', async ({ page }) => {
  await page.locator('.trade-ignore-btn').first().click()
  await expect(page.locator('.trade-card')).toHaveCount(4, { timeout: 1500 })
  // Second ignore on remaining first card should remove it too
  await page.locator('.trade-ignore-btn').first().click()
  await expect(page.locator('.trade-card')).toHaveCount(3, { timeout: 1500 })
})

test('ignored trade does not reappear on re-navigation', async ({ page }) => {
  await page.locator('.trade-ignore-btn').first().click()
  await expect(page.locator('.trade-card')).toHaveCount(4, { timeout: 1500 })
  await page.locator('#back-btn').click()
  await page.locator('.home-card').first().click()
  await page.locator('#feed-cards').waitFor()
  await expect(page.locator('.trade-card')).toHaveCount(4)
})

// ─── Crash regressions ────────────────────────────────────────────────────────

test('[REGRESSION] ignore then immediate back does not crash', async ({ page }) => {
  // Bug: setTimeout(card.remove, 320) fired on detached DOM → WebKit crash
  await page.locator('.trade-ignore-btn').first().click()
  // Navigate away BEFORE the 320ms card.remove fires
  await page.locator('#back-btn').click()
  // Must land on home cleanly
  await expect(page.locator('.home-card')).toHaveCount(4, { timeout: 3000 })
  // Wait for the 320ms timer to fire safely (should be a no-op, not crash)
  await page.waitForTimeout(400)
  await expect(page.locator('.home-card')).toHaveCount(4)
})

test('[REGRESSION] returning to feed after ignore does not re-add ghost card', async ({ page }) => {
  await page.locator('.trade-ignore-btn').first().click()
  await page.locator('#back-btn').click()
  await page.locator('.home-card').first().click()
  await page.locator('#feed-cards').waitFor()
  // Should still be 4, not 5 (ghost card would be a regression)
  await expect(page.locator('.trade-card')).toHaveCount(4)
})

test('[REGRESSION] listener accumulation — follow/ignore work after re-navigation', async ({ page }) => {
  // Bug: each renderFeed call added a new click listener; after 2 renders,
  // buttons could fire stale handlers or double-fire.
  await page.locator('#back-btn').click()
  await page.locator('.home-card').first().click()
  await page.locator('#feed-cards').waitFor()
  // Ignore on this second render should work correctly
  await page.locator('.trade-ignore-btn').first().click()
  await expect(page.locator('.trade-card')).toHaveCount(4, { timeout: 1500 })
})

// ─── Congressional API (static JSON) integration ─────────────────────────────

/**
 * Build a mock congressional-trades.json response body containing `count`
 * trade objects. All trades use a transaction_date 30 days ago so they pass
 * the feed's 90-day recency filter.
 *
 * Shape matches the static file produced by scripts/generate-trades.js:
 *   { generated_at: <ISO string>, trades: [ ...normalized trade objects ] }
 *
 * congressional.js reads `json.trades`, normalises each record, and derives
 * `transaction_ts` from `transaction_date` — so `transaction_ts` is NOT
 * included here.
 *
 * Provide at least 5 trades so the initial render (displayCount = 5) can
 * show a full first page. Assertions should use Math.min(count, 5).
 */
function buildTradesResponse(count = 5) {
  const recentDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  // Names must match seed watchlist so filterByWatchlist passes them through
  const WATCHLIST_NAMES = ['Nancy Pelosi', 'Josh Gottheimer', 'Marjorie Taylor Greene',
    'Ro Khanna', 'Michael McCaul', 'Mike Turner', 'Jim Himes', 'Mike Johnson']
  const trades = Array.from({ length: count }, (_, i) => ({
    id:               `mock-trade-${i + 1}`,
    politician_name:  WATCHLIST_NAMES[i % WATCHLIST_NAMES.length],
    party:            i % 2 === 0 ? 'D' : 'R',
    ticker:           ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'][i % 5],
    action:           i % 2 === 0 ? 'buy' : 'sell',
    amount_low:       1001,
    amount_high:      15000,
    transaction_date: recentDate,
    disclosed_date:   recentDate,
    sp500:            'Y',
  }))

  return {
    generated_at: new Date().toISOString(),
    trades,
  }
}

// ── Helper: navigate to feed with a fresh cache and a given trades-JSON route mock ──
// Uses the addInitScript already registered by beforeEach (no double-setup).
// Route added here intercepts the same-origin congressional-trades.json fetch
// and takes priority over any previously registered routes (last-wins in Playwright).
async function _goToFeedWithMock(page, routeHandler) {
  await page.evaluate(() => {
    localStorage.removeItem('congressional_cache')
    localStorage.removeItem('sth_trade_decisions')
    // Clear last-view so app boots to home, not feed
    sessionStorage.removeItem('sth_last_view')
  })
  await page.route('**/congressional-trades.json', routeHandler)
  await page.goto('/')
  await page.waitForSelector('.home-card', { timeout: 8000 })
  await page.locator('.home-card').first().click()
}

test('[CONGRESSIONAL API] loads real trade data from Anthropic response', async ({ page }) => {
  // Provide 5 trades — feed initially shows Math.min(tradeCount, displayCount=5) cards.
  await _goToFeedWithMock(page, route =>
    route.fulfill({
      status:      200,
      contentType: 'application/json',
      body:        JSON.stringify(buildTradesResponse(5)),
    })
  )
  await page.locator('#feed-cards').waitFor({ timeout: 10000 })

  // 5 trade cards rendered from mock API data (displayCount cap = 5)
  await expect(page.locator('.trade-card')).toHaveCount(5)
  // Mock-data banner must NOT be present — real API path was exercised
  await expect(page.locator('text=Using sample data')).not.toBeVisible()
  // First card contains the politician name from the mock payload
  await expect(page.locator('.trade-card').first()).toContainText('Nancy Pelosi')
})

test('[CONGRESSIONAL API] mock-data banner absent when API succeeds', async ({ page }) => {
  // Regression guard — critical observability test.
  // If banner IS visible when API succeeds, mock-data fallback ran despite healthy response.
  // Provide 5 trades so filterByWatchlist returns results (non-empty → no mock fallback).
  await _goToFeedWithMock(page, route =>
    route.fulfill({
      status:      200,
      contentType: 'application/json',
      body:        JSON.stringify(buildTradesResponse(5)),
    })
  )
  await page.locator('#feed-cards').waitFor({ timeout: 10000 })
  await expect(page.locator('text=Using sample data')).not.toBeVisible()
})

test('[CONGRESSIONAL API] API failure falls back to mock trades', async ({ page }) => {
  // Abort the congressional-trades.json fetch so the fallback mock path runs.
  // auth.js does NOT abort same-origin requests, so we register the abort here.
  await page.evaluate(() => {
    localStorage.removeItem('congressional_cache')
    localStorage.removeItem('sth_trade_decisions')
    sessionStorage.removeItem('sth_last_view')
  })
  await page.route('**/congressional-trades.json', route => route.abort())
  await page.goto('/')
  await page.waitForSelector('.home-card', { timeout: 8000 })
  await page.locator('.home-card').first().click()
  await page.locator('#feed-cards').waitFor({ timeout: 5000 })
  // Mock-data banner must appear when the API is unreachable
  await expect(page.locator('text=Using sample data')).toBeVisible()
})

test('[CONGRESSIONAL API] invalid JSON response falls back to mock', async ({ page }) => {
  // Return a response that parses as valid JSON but lacks the `trades` array,
  // triggering the "trades field is not an array" error path in congressional.js.
  await _goToFeedWithMock(page, route =>
    route.fulfill({
      status:      200,
      contentType: 'application/json',
      body:        JSON.stringify({ generated_at: new Date().toISOString(), error: 'not valid' }),
    })
  )
  await page.locator('#feed-cards').waitFor({ timeout: 10000 })
  // Malformed payload must trigger mock-data fallback
  await expect(page.locator('text=Using sample data')).toBeVisible()
})

test('[CONGRESSIONAL API] refresh button triggers new API call', async ({ page }) => {
  let callCount = 0
  await _goToFeedWithMock(page, route => {
    callCount++
    return route.fulfill({
      status:      200,
      contentType: 'application/json',
      body:        JSON.stringify(buildTradesResponse(5)),
    })
  })
  await page.locator('#feed-cards').waitFor({ timeout: 10000 })

  // Confirm at least one call happened during initial load
  expect(callCount).toBeGreaterThanOrEqual(1)
  const countAfterLoad = callCount

  // Click the refresh button (forceRefresh=true bypasses the 1-hour cache)
  await page.locator('#feed-refresh-btn').click()

  // Wait for cards to reload
  await page.locator('#feed-cards').waitFor({ timeout: 8000 })

  // Refresh must have triggered at least one additional API call
  expect(callCount).toBeGreaterThan(countAfterLoad)
})
