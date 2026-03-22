/**
 * Shared Playwright auth + API mock setup.
 * Sets a fake sth_auth token so the app boots directly to home (skips OAuth).
 * Mocks all Google API calls so tests run fully offline.
 */

export const FAKE_AUTH = {
  clientId:      'test-client-id.apps.googleusercontent.com',
  accessToken:   'test-access-token-abc123',
  spreadsheetId: 'test-spreadsheet-id-xyz',
  emailHint:     'test@example.com',
  tokenTs:       Date.now(),
}

/**
 * Call before page.goto(). Injects fake auth into sessionStorage and mocks
 * all Google API network calls so no real network is needed.
 * sth_auth moved from localStorage → sessionStorage (security hardening).
 */
export async function setupAuth(page) {
  // 1. Inject fake token before page script runs
  await page.addInitScript((auth) => {
    sessionStorage.setItem('sth_auth', JSON.stringify(auth))
  }, { ...FAKE_AUTH, tokenTs: Date.now() })

  // 2. Block ALL external API calls immediately.
  //    Aborting Sheets (not 401) makes initSheets() throw → sheetsWriter never set
  //    → logger stays console-only → no appendRows→debug→flush→appendRows recursion.
  await page.route(/googleapis\.com|accounts\.google\.com|house-stock-watcher|\/api\/hsw|api\.anthropic\.com/, route => {
    route.abort()
  })
}

/**
 * Navigate to a view via the home tile or settings button.
 * Waits for navigation to complete.
 */
export async function goHome(page) {
  await page.goto('/')
  // Wait for home view to render
  await page.waitForSelector('.home-card', { timeout: 8000 })
}
