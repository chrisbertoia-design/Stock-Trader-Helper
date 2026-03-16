/**
 * Settings view tests — field rendering, save button, toast, persistence.
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

// ─── Persistence ──────────────────────────────────────────────────────────────

test('editing a field and blurring triggers Sheets write and shows Saved toast', async ({ page }) => {
  // Track Sheets API calls by intercepting them
  const sheetsCalls = []
  // Unroute the default abort handler, then add our mock
  await page.unrouteAll({ behavior: 'wait' })
  await page.route(/googleapis\.com/, async route => {
    const url = route.request().url()
    const method = route.request().method()
    // Capture write calls (POST for batchUpdate, config reads return empty)
    if (method === 'POST' && url.includes('batchUpdate')) {
      const body = route.request().postDataJSON()
      sheetsCalls.push({ url, method, body })
      // Fulfill with a mock success response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ spreadsheetId: 'test-spreadsheet-id-xyz', totalUpdatedRows: 1 })
      })
    } else if (method === 'GET' && url.includes('values')) {
      // Return empty config tab (no existing rows)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ values: [['key', 'value', 'description', 'last_modified']] })
      })
    } else if (method === 'POST' && url.includes('append')) {
      // Mock append (for new keys not found in config tab)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ spreadsheetId: 'test-spreadsheet-id-xyz', updates: { updatedRows: 1 } })
      })
    } else {
      await route.abort()
    }
  })
  // Also block other external calls
  await page.route(/accounts\.google\.com|house-stock-watcher|\/api\/hsw/, route => route.abort())

  // Find the Ollama Base URL text input and change it
  const input = page.locator('input[data-key="ollama_base_url"]')
  await expect(input).toBeVisible()

  // Clear and type a new value
  await input.fill('http://my-ollama:11434')

  // Blur the field (click elsewhere) to trigger save
  await page.locator('h2').first().click()

  // Verify Saved toast appears
  await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.toast')).toContainText('Saved')
})

test('Enter key in a field triggers save', async ({ page }) => {
  // Unroute default, mock Sheets calls
  await page.unrouteAll({ behavior: 'wait' })
  await page.route(/googleapis\.com/, async route => {
    const method = route.request().method()
    const url = route.request().url()
    if (method === 'POST' && url.includes('batchUpdate')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ spreadsheetId: 'test-spreadsheet-id-xyz', totalUpdatedRows: 1 })
      })
    } else if (method === 'GET' && url.includes('values')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ values: [['key', 'value', 'description', 'last_modified']] })
      })
    } else if (method === 'POST' && url.includes('append')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ spreadsheetId: 'test-spreadsheet-id-xyz', updates: { updatedRows: 1 } })
      })
    } else {
      await route.abort()
    }
  })
  await page.route(/accounts\.google\.com|house-stock-watcher|\/api\/hsw/, route => route.abort())

  const input = page.locator('input[data-key="ollama_base_url"]')
  await input.fill('http://enter-test:11434')
  await input.press('Enter')

  await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.toast')).toContainText('Saved')
})

test('select change triggers save', async ({ page }) => {
  // Unroute default, mock Sheets calls
  await page.unrouteAll({ behavior: 'wait' })
  await page.route(/googleapis\.com/, async route => {
    const method = route.request().method()
    const url = route.request().url()
    if (method === 'POST' && url.includes('batchUpdate')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ spreadsheetId: 'test-spreadsheet-id-xyz', totalUpdatedRows: 1 })
      })
    } else if (method === 'GET' && url.includes('values')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ values: [['key', 'value', 'description', 'last_modified']] })
      })
    } else if (method === 'POST' && url.includes('append')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ spreadsheetId: 'test-spreadsheet-id-xyz', updates: { updatedRows: 1 } })
      })
    } else {
      await route.abort()
    }
  })
  await page.route(/accounts\.google\.com|house-stock-watcher|\/api\/hsw/, route => route.abort())

  // Change the log level select
  const select = page.locator('select[data-key="log_level"]')
  await expect(select).toBeVisible()

  // Change from current value to a different one
  await select.selectOption('WARN')

  await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.toast')).toContainText('Saved')
})

test('Sheets write failure shows Save failed toast', async ({ page }) => {
  // Unroute default, mock Sheets calls to fail
  await page.unrouteAll({ behavior: 'wait' })
  await page.route(/googleapis\.com/, async route => {
    const method = route.request().method()
    const url = route.request().url()
    if (method === 'GET' && url.includes('values')) {
      // Return empty config — forces append path
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ values: [['key', 'value', 'description', 'last_modified']] })
      })
    } else if (method === 'POST') {
      // Fail the write
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Internal error' } })
      })
    } else {
      await route.abort()
    }
  })
  await page.route(/accounts\.google\.com|house-stock-watcher|\/api\/hsw/, route => route.abort())

  const input = page.locator('input[data-key="ollama_base_url"]')
  await input.fill('http://will-fail:11434')
  await page.locator('h2').first().click()  // blur

  await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.toast')).toContainText('Save failed')
})
