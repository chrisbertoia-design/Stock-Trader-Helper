/**
 * Feed view tests — expand/collapse, follow, ignore, persistence, crash regressions.
 */

import { test, expect } from '@playwright/test'
import { setupAuth, goHome } from './helpers/auth.js'
import { checkFeedDataSource } from './helpers/dataCheck.js'

test.beforeEach(async ({ page }) => {
  await setupAuth(page)
  await goHome(page)
  // Clear any prior decisions so each test starts fresh
  await page.evaluate(() => localStorage.removeItem('sth_trade_decisions'))
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
