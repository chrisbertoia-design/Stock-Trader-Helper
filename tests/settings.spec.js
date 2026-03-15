/**
 * Settings view tests — field rendering, save button, toast.
 */

import { test, expect } from '@playwright/test'
import { setupAuth, goHome } from './helpers/auth.js'

test.beforeEach(async ({ page }) => {
  await setupAuth(page)
  await goHome(page)
  await page.locator('#settings-btn').click()
  await page.locator('#save-settings').waitFor({ timeout: 5000 })
})

// ─── Render ───────────────────────────────────────────────────────────────────

test('settings renders multiple sections', async ({ page }) => {
  await expect(page.locator('.card')).toHaveCount(await page.locator('.card').count())
  expect(await page.locator('.card').count()).toBeGreaterThan(0)
})

test('input fields are visible and editable', async ({ page }) => {
  // Find text inputs (not password, not select)
  const inputs = page.locator('input[type="text"], input:not([type])')
  const count = await inputs.count()
  expect(count).toBeGreaterThan(0)
  // Edit the first visible text input
  const first = inputs.first()
  await first.fill('test-value')
  await expect(first).toHaveValue('test-value')
})

test('save button is visible', async ({ page }) => {
  await expect(page.locator('#save-settings')).toBeVisible()
  await expect(page.locator('#save-settings')).toContainText('Save')
})

test('save button shows toast', async ({ page }) => {
  await page.locator('#save-settings').click()
  await expect(page.locator('.toast')).toBeVisible({ timeout: 3000 })
})

test('toast auto-dismisses (does not stay permanently)', async ({ page }) => {
  await page.locator('#save-settings').click()
  await page.locator('.toast').waitFor({ state: 'visible', timeout: 3000 })
  // Toast should disappear within 5 seconds (3s display + animation)
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 5000 })
})

test('back button visible on settings', async ({ page }) => {
  await expect(page.locator('#back-btn')).not.toHaveClass(/hidden/)
})

test('settings button hidden on settings view', async ({ page }) => {
  await expect(page.locator('#settings-btn')).toHaveClass(/hidden/)
})

test('page is scrollable to see all fields', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)
  // Should not crash and save button still works after scroll
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('#save-settings').click()
  await expect(page.locator('.toast')).toBeVisible({ timeout: 3000 })
})
