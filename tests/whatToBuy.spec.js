/**
 * What to Buy tests — amount input, quick-amount pills, stepper, step 2 results.
 */

import { test, expect } from '@playwright/test'
import { setupAuth, goHome } from './helpers/auth.js'
import { checkWhatToBuyDataSource } from './helpers/dataCheck.js'

test.beforeEach(async ({ page }) => {
  await setupAuth(page)
  await goHome(page)
  await page.locator('.home-card').nth(3).click()
  await page.locator('#amount-input').waitFor({ timeout: 5000 })
})

// ─── Data source observability ────────────────────────────────────────────────

test('[DATA SOURCE] what to buy data source phase status', async ({ page }, testInfo) => {
  await checkWhatToBuyDataSource(page, testInfo)
})

// ─── Step 1: Amount input ─────────────────────────────────────────────────────

test('amount input is visible and editable', async ({ page }) => {
  const input = page.locator('#amount-input')
  await expect(input).toBeVisible()
  await input.fill('500')
  await expect(input).toHaveValue('500')
})

test('quick-amount pills set the amount', async ({ page }) => {
  const pills = page.locator('[data-amount]')
  await expect(pills.first()).toBeVisible()
  await pills.first().click()
  const val = await page.locator('#amount-input').inputValue()
  expect(Number(val)).toBeGreaterThan(0)
})

test('each quick-amount pill sets a different value', async ({ page }) => {
  const pills = page.locator('[data-amount]')
  await pills.first().click()
  const val1 = await page.locator('#amount-input').inputValue()
  await pills.nth(1).click()
  const val2 = await page.locator('#amount-input').inputValue()
  expect(val1).not.toEqual(val2)
})

test('pick count decrement button works', async ({ page }) => {
  const display = page.locator('#pick-count-display')
  const before = Number(await display.textContent())
  await page.locator('#pick-decrement').click()
  const after = Number(await display.textContent())
  expect(after).toBeGreaterThanOrEqual(1)
  expect(after).toBeLessThanOrEqual(before)
})

test('pick count increment button works', async ({ page }) => {
  const display = page.locator('#pick-count-display')
  const before = Number(await display.textContent())
  await page.locator('#pick-increment').click()
  const after = Number(await display.textContent())
  expect(after).toBeGreaterThanOrEqual(before)
})

// ─── Step 1 → Step 2 ─────────────────────────────────────────────────────────

test('submit with valid amount shows step 2 results', async ({ page }) => {
  await page.locator('#amount-input').fill('1000')
  await page.locator('#get-picks-btn').click()
  // Step 2 renders Change amount link
  await expect(page.locator('#change-amount-link')).toBeVisible({ timeout: 5000 })
})

test('Enter key submits the form', async ({ page }) => {
  await page.locator('#amount-input').fill('750')
  await page.locator('#amount-input').press('Enter')
  await expect(page.locator('#change-amount-link')).toBeVisible({ timeout: 5000 })
})

test('empty amount shows error, not results', async ({ page }) => {
  await page.locator('#amount-input').fill('')
  await page.locator('#get-picks-btn').click()
  await expect(page.locator('#amount-error')).toBeVisible({ timeout: 3000 })
})

// ─── Step 2: Results ──────────────────────────────────────────────────────────

test('step 2 shows change amount link', async ({ page }) => {
  await page.locator('#amount-input').fill('1000')
  await page.locator('#get-picks-btn').click()
  await expect(page.locator('#change-amount-link')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('#change-amount-link')).toContainText('← Change amount')
})
