/**
 * Navigation tests — every route from home, every back button path.
 */

import { test, expect } from '@playwright/test'
import { setupAuth, goHome } from './helpers/auth.js'

test.beforeEach(async ({ page }) => {
  await setupAuth(page)
  await goHome(page)
})

test('home renders 4 tiles', async ({ page }) => {
  const tiles = page.locator('.home-card')
  await expect(tiles).toHaveCount(4)
})

test('back button is hidden on home', async ({ page }) => {
  await expect(page.locator('#back-btn')).toHaveClass(/hidden/)
})

test('settings button is visible on home', async ({ page }) => {
  await expect(page.locator('#settings-btn')).toBeVisible()
})

test('home → feed (What\'s New tile)', async ({ page }) => {
  await page.locator('.home-card').first().click()
  await expect(page.locator('#feed-cards')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('#back-btn')).not.toHaveClass(/hidden/)
})

test('home → topSignal (Top Signal tile)', async ({ page }) => {
  const tiles = page.locator('.home-card')
  await tiles.nth(1).click()
  await expect(page.locator('#party-filters')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('#back-btn')).not.toHaveClass(/hidden/)
})

test('home → positions (Portfolio tile)', async ({ page }) => {
  const tiles = page.locator('.home-card')
  await tiles.nth(2).click()
  // Skeleton or content
  await expect(page.locator('h2')).toContainText('My Positions', { timeout: 6000 })
  await expect(page.locator('#back-btn')).not.toHaveClass(/hidden/)
})

test('home → whatToBuy (Buy tile)', async ({ page }) => {
  const tiles = page.locator('.home-card')
  await tiles.nth(3).click()
  await expect(page.locator('#amount-input')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('#back-btn')).not.toHaveClass(/hidden/)
})

test('home → settings (gear button)', async ({ page }) => {
  await page.locator('#settings-btn').click()
  await expect(page.locator('#save-settings')).toBeVisible({ timeout: 5000 })
  // Settings button hides itself when on settings
  await expect(page.locator('#settings-btn')).toHaveClass(/hidden/)
})

test('back from feed → home', async ({ page }) => {
  await page.locator('.home-card').first().click()
  await page.locator('#feed-cards').waitFor()
  await page.locator('#back-btn').click()
  await expect(page.locator('.home-card')).toHaveCount(4, { timeout: 5000 })
})

test('back from topSignal → home', async ({ page }) => {
  await page.locator('.home-card').nth(1).click()
  await page.locator('#party-filters').waitFor()
  await page.locator('#back-btn').click()
  await expect(page.locator('.home-card')).toHaveCount(4, { timeout: 5000 })
})

test('back from positions → home', async ({ page }) => {
  await page.locator('.home-card').nth(2).click()
  await page.locator('h2').waitFor()
  await page.locator('#back-btn').click()
  await expect(page.locator('.home-card')).toHaveCount(4, { timeout: 5000 })
})

test('back from whatToBuy → home', async ({ page }) => {
  await page.locator('.home-card').nth(3).click()
  await page.locator('#amount-input').waitFor()
  await page.locator('#back-btn').click()
  await expect(page.locator('.home-card')).toHaveCount(4, { timeout: 5000 })
})

test('back from settings → home', async ({ page }) => {
  await page.locator('#settings-btn').click()
  await page.locator('#save-settings').waitFor()
  await page.locator('#back-btn').click()
  await expect(page.locator('.home-card')).toHaveCount(4, { timeout: 5000 })
})

test('rapid back-and-forth navigation does not crash (5 cycles)', async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await page.locator('.home-card').first().click()
    await page.locator('#feed-cards').waitFor({ timeout: 5000 })
    await page.locator('#back-btn').click()
    await page.locator('.home-card').first().waitFor({ timeout: 5000 })
  }
  // Still on home after all cycles
  await expect(page.locator('.home-card')).toHaveCount(4)
})

test('navigate to same view twice does nothing (guard works)', async ({ page }) => {
  await page.locator('.home-card').first().click()
  await page.locator('#feed-cards').waitFor()
  // Second navigate to same view should be a no-op — back button stays visible
  await page.evaluate(() => window._navigate('feed'))
  await expect(page.locator('#back-btn')).not.toHaveClass(/hidden/)
  await expect(page.locator('#feed-cards')).toBeVisible()
})

test('[OPTION-A] reload restores last view via sessionStorage', async ({ page }) => {
  await setupAuth(page)
  // Navigate to Top Signal
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.home-card').nth(1).click()
  await page.locator('#party-filters').waitFor({ timeout: 5000 })

  // Reload — should land back on topSignal, not home
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('#party-filters')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.home-card')).toHaveCount(0)
})
