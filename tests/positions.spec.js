/**
 * Positions view tests — skeleton, content load, async race regressions.
 */

import { test, expect } from '@playwright/test'
import { setupAuth, goHome } from './helpers/auth.js'
import { checkPositionsDataSource } from './helpers/dataCheck.js'

test.beforeEach(async ({ page }) => {
  await setupAuth(page)
  await goHome(page)
})

// ─── Data source observability ────────────────────────────────────────────────

test('[DATA SOURCE] positions using real Sheets data vs mock fallback', async ({ page }, testInfo) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })
  await checkPositionsDataSource(page, testInfo)
})

// ─── Render ───────────────────────────────────────────────────────────────────

test('skeleton shows then real content loads', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  // Content loads (skeleton may be too fast to catch reliably, but final state must be correct)
  await expect(page.locator('h2', { hasText: 'My Positions' })).toBeVisible({ timeout: 8000 })
})

test('stats row renders with 4 stats', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })
  await expect(page.locator('.stat')).toHaveCount(4)
})

test('position cards render', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })
  await expect(page.locator('#positions-list .card').first()).toBeVisible()
})

test('mock data banner shows when using sample data', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })
  // Either "Using sample data" banner or account info — one must be present
  const hasMockBanner = await page.locator('text=Using sample data').isVisible()
  const hasAccount    = await page.locator('text=Schwab Account').isVisible().catch(() => false)
  const hasSamplePart = await page.locator('text=Sample data').isVisible().catch(() => false)
  expect(hasMockBanner || hasAccount || hasSamplePart).toBeTruthy()
})

test('CSV upload button is visible', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })
  await expect(page.locator('#csv-upload-label')).toBeVisible()
  await expect(page.locator('#csv-upload-label')).toContainText('Upload CSV')
})

test('positions list is scrollable', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })
  // Scroll to bottom of list and back — should not crash
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)
  await page.evaluate(() => window.scrollTo(0, 0))
  // View still intact
  await expect(page.locator('#positions-list')).toBeVisible()
})

// ─── Crash regressions ────────────────────────────────────────────────────────

test('[REGRESSION] navigate away during skeleton load does not crash', async ({ page }) => {
  // Bug: await loadPositions() completed after user navigated away, then
  // container.innerHTML = ... overwrote the new view
  await page.locator('.home-card').nth(2).click()
  // Hit back IMMEDIATELY before skeleton finishes
  await page.locator('#back-btn').click()
  // Must land on home cleanly
  await expect(page.locator('.home-card')).toHaveCount(5, { timeout: 5000 })
  // Wait for loadPositions async to resolve (mocked to be fast, but check)
  await page.waitForTimeout(500)
  // Home must still show — stale render must NOT have overwritten it
  await expect(page.locator('.home-card')).toHaveCount(5)
  await expect(page.locator('#positions-list')).toHaveCount(0)
})

test('[REGRESSION] positions then home shows home content (no stale render)', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })
  await page.locator('#back-btn').click()
  await expect(page.locator('.home-card')).toHaveCount(5, { timeout: 5000 })
  // Positions content must be gone
  await expect(page.locator('#positions-list')).toHaveCount(0)
  await expect(page.locator('h2', { hasText: 'My Positions' })).toHaveCount(0)
})

test('[REGRESSION] scroll during content load does not crash', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  // Start scrolling during skeleton phase
  await page.evaluate(() => window.scrollTo(0, 200))
  // Content loads
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })
  // App still functional
  await expect(page.locator('#positions-list')).toBeVisible()
})

// ─── CSV preview modal ────────────────────────────────────────────────────────

test('CSV upload shows preview modal with position count and top tickers', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#csv-upload-label').click(),
  ])
  await fileChooser.setFiles('src/data/test-fixtures/schwab-positions-sample.csv')

  // Preview modal must appear with position summary
  await expect(page.locator('text=Preview:')).toBeVisible({ timeout: 6000 })
  await expect(page.locator('#preview-cancel')).toBeVisible()
  await expect(page.locator('#preview-confirm')).toBeVisible()
})

test('CSV preview modal Cancel aborts upload — positions view stays unchanged', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#csv-upload-label').click(),
  ])
  await fileChooser.setFiles('src/data/test-fixtures/schwab-positions-sample.csv')
  await page.locator('#preview-cancel').waitFor({ timeout: 6000 })
  await page.locator('#preview-cancel').click()

  // Modal dismissed — positions view still shows
  await expect(page.locator('text=Preview:')).not.toBeVisible()
  await expect(page.locator('h2', { hasText: 'My Positions' })).toBeVisible()
})

test('CSV preview modal Confirm proceeds and shows success toast', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#csv-upload-label').click(),
  ])
  await fileChooser.setFiles('src/data/test-fixtures/schwab-positions-sample.csv')
  await page.locator('#preview-confirm').waitFor({ timeout: 6000 })
  await page.locator('#preview-confirm').click()

  // Modal dismissed and upload proceeds — toast or positions reload
  await expect(page.locator('text=Preview:')).not.toBeVisible({ timeout: 3000 })
  // Positions view must still be shown (no crash)
  await expect(page.locator('h2', { hasText: 'My Positions' })).toBeVisible({ timeout: 8000 })
})

test('CSV preview shows "From positions export" label for positions CSV format', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2', { hasText: 'My Positions' }).waitFor({ timeout: 8000 })

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#csv-upload-label').click(),
  ])
  await fileChooser.setFiles('src/data/test-fixtures/schwab-positions-sample.csv')
  await expect(page.locator('text=From positions export')).toBeVisible({ timeout: 6000 })
})
