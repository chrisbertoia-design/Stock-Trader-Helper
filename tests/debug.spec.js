import { test, expect } from '@playwright/test'
import { setupAuth } from './helpers/auth.js'

test('debug — page loads without crash', async ({ page }) => {
  const errors = []
  const crashes = []

  page.on('pageerror', err => errors.push(err.message))
  page.on('crash', () => crashes.push('CRASH'))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await setupAuth(page)

  // Navigate and immediately capture what loads
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
  console.log('STATUS:', response?.status())
  console.log('URL:', page.url())

  // Wait a moment for JS to boot
  await page.waitForTimeout(2000).catch(() => {})

  const title = await page.title().catch(() => 'FAILED')
  const hasApp = await page.locator('#app').count().catch(() => -1)
  const hasHomeCard = await page.locator('.home-card').count().catch(() => -1)
  const hasConnectBtn = await page.locator('button', { hasText: /sign|connect|google/i }).count().catch(() => 0)
  const bodyHTML = await page.evaluate(() => document.getElementById('app')?.innerHTML?.slice(0, 600) || 'NO APP DIV').catch(() => 'EVAL FAILED')

  console.log('TITLE:', title)
  console.log('#app exists:', hasApp)
  console.log('.home-card count:', hasHomeCard)
  console.log('connect btn count:', hasConnectBtn)
  console.log('APP HTML:', bodyHTML)
  console.log('JS ERRORS:', errors.slice(0, 3))
  console.log('CRASHES:', crashes)

  expect(crashes).toHaveLength(0)
})
