/**
 * Decisions History view tests — navigation, empty state, skeleton, card rendering.
 */

import { test, expect } from '@playwright/test'
import { setupAuth, goHome } from './helpers/auth.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Inject follow/ignore decisions into localStorage before page renders. */
async function injectDecisions(page, decisions) {
  await page.addInitScript((d) => {
    localStorage.setItem('sth_trade_decisions', JSON.stringify(d))
  }, decisions)
}

/** Wait for the decisionsHistory heading div to appear (skeleton has it too, so
 *  wait for "Followed trades" section or the empty-state text instead for final render). */
function decisionsHeading(page) {
  // Heading is a div, not h2. Both skeleton and final render show it.
  return page.getByText('My Decisions', { exact: true }).first()
}

/**
 * Build a mock congressional-trades.json fulfill body with one trade.
 * Register this BEFORE goHome so the home view's initial fetch caches mock data.
 */
function buildMockTrade(tradeId) {
  return {
    status:      200,
    contentType: 'application/json',
    body: JSON.stringify({
      generated_at: new Date().toISOString(),
      trades: [{
        id:               tradeId,
        politician_name:  'Nancy Pelosi',
        party:            'D',
        ticker:           'NVDA',
        action:           'buy',
        amount_low:       250001,
        amount_high:      500000,
        transaction_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        disclosed_date:   new Date().toISOString().slice(0, 10),
        sp500:            'Y',
      }],
    }),
  }
}

// ─── Tests: empty state ───────────────────────────────────────────────────────

test.describe('decisionsHistory — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await goHome(page)
  })

  test('renders My Decisions heading', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await expect(decisionsHeading(page)).toBeVisible({ timeout: 6000 })
  })

  test('empty state shown when no decisions in localStorage', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await decisionsHeading(page).waitFor({ timeout: 6000 })
    await expect(page.locator('text=No decisions yet')).toBeVisible()
  })

  test('subtitle says "No decisions recorded yet" when empty', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await decisionsHeading(page).waitFor({ timeout: 6000 })
    await expect(page.locator('text=No decisions recorded yet')).toBeVisible()
  })

  test('back button returns to home', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await decisionsHeading(page).waitFor({ timeout: 6000 })
    await page.locator('#back-btn').click()
    await expect(page.locator('.home-card')).toHaveCount(5, { timeout: 5000 })
  })
})

// ─── Tests: ignored only (no followed) ───────────────────────────────────────

test.describe('decisionsHistory — ignored only, no followed', () => {
  test.beforeEach(async ({ page }) => {
    await injectDecisions(page, { 'trade-x': 'ignored' })
    await setupAuth(page)
    await goHome(page)
  })

  test('subtitle shows 0 followed · 1 ignored', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await decisionsHeading(page).waitFor({ timeout: 6000 })
    await expect(page.locator('text=0 followed · 1 ignored')).toBeVisible()
  })

  test('shows "No followed trades yet" not "outside window" when followedIds is empty', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    // Wait for final render — "Followed trades" section header (exact match avoids matching "No followed trades yet" message)
    await expect(page.getByText('Followed trades', { exact: true })).toBeVisible({ timeout: 6000 })
    // Must NOT show the "outside 6-month window" message
    await expect(page.locator('text=outside the 6-month data window')).not.toBeVisible()
    // Must show the "no followed trades" message
    await expect(page.locator('text=No followed trades yet')).toBeVisible()
  })
})

// ─── Tests: with followed trades ─────────────────────────────────────────────

test.describe('decisionsHistory — with followed trades', () => {
  const TRADE_ID = 'trade-abc-001'

  test.beforeEach(async ({ page }) => {
    await injectDecisions(page, { [TRADE_ID]: 'followed', 'trade-zzz': 'ignored' })
    await setupAuth(page)
    // Register mock BEFORE goHome — home view's initial fetch caches mock data.
    // TRADES_URL = BASE_URL + 'congressional-trades.json' (same-origin static file).
    await page.route('**/congressional-trades.json', route => route.fulfill(buildMockTrade(TRADE_ID)))
    await goHome(page)
  })

  test('subtitle shows followed and ignored counts', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await expect(page.locator('text=1 followed · 1 ignored')).toBeVisible({ timeout: 8000 })
  })

  test('followed trade card shows politician name', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await expect(page.locator('text=Nancy Pelosi')).toBeVisible({ timeout: 8000 })
  })

  test('followed trade card shows ticker', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await expect(page.locator('text=NVDA')).toBeVisible({ timeout: 8000 })
  })

  test('followed trade card shows ✓ Followed badge', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await expect(page.locator('text=✓ Followed')).toBeVisible({ timeout: 8000 })
  })

  test('ignored count footer shown at bottom', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await expect(page.locator('text=1 trade ignored')).toBeVisible({ timeout: 8000 })
  })

  test('back button returns to home with cards', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await expect(page.locator('text=Nancy Pelosi')).toBeVisible({ timeout: 8000 })
    await page.locator('#back-btn').click()
    await expect(page.locator('.home-card')).toHaveCount(5, { timeout: 5000 })
  })
})

// ─── Tests: stale followed trade (outside 6-month window) ────────────────────

test.describe('decisionsHistory — stub trade (outside window)', () => {
  test.beforeEach(async ({ page }) => {
    // ID 'stale-trade-999' won't be in the API response (empty trades list)
    await injectDecisions(page, { 'stale-trade-999': 'followed' })
    await setupAuth(page)
    // Register empty-trades mock BEFORE goHome to populate cache
    await page.route('**/congressional-trades.json', route => route.fulfill({
      status:      200,
      contentType: 'application/json',
      body: JSON.stringify({ generated_at: new Date().toISOString(), trades: [] }),
    }))
    await goHome(page)
  })

  test('shows "Details unavailable" stub for followed trade not in API data', async ({ page }) => {
    await page.locator('.home-card').nth(4).click()
    await expect(page.locator('text=Details unavailable')).toBeVisible({ timeout: 8000 })
  })
})

// ─── Regression ──────────────────────────────────────────────────────────────

test('[REGRESSION] rapid navigate to decisionsHistory and back does not crash', async ({ page }) => {
  await setupAuth(page)
  await goHome(page)
  for (let i = 0; i < 3; i++) {
    await page.locator('.home-card').nth(4).click()
    await decisionsHeading(page).waitFor({ timeout: 6000 })
    await page.locator('#back-btn').click()
    await page.locator('.home-card').first().waitFor({ timeout: 5000 })
  }
  await expect(page.locator('.home-card')).toHaveCount(5)
})
