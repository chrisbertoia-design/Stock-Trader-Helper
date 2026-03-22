/**
 * Real-data presence checks for Playwright evals.
 *
 * Each view has a mock-data indicator (banner text, subtitle copy, or known
 * phase status). These helpers detect the indicator and attach a WARNING
 * annotation to the test report — but NEVER fail the test. The goal is
 * observability: the eval suite still validates all UI functions, but the
 * report makes it visible when live API data is absent.
 *
 * Usage (in any spec file):
 *   import { checkFeedDataSource } from './helpers/dataCheck.js'
 *   test('data source check', async ({ page }, testInfo) => {
 *     await checkFeedDataSource(page, testInfo)
 *   })
 */

/**
 * Core helper — check a page for a mock-data indicator text and annotate.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {object} opts
 * @param {string}   opts.view        — view name for the annotation message
 * @param {string}   opts.mockText    — text visible in the DOM when mock data is shown
 * @param {string}   opts.reason      — why mock data appears (for human-readable report)
 * @param {string}   [opts.phase]     — if the view hasn't been wired yet, describe the phase
 * @returns {Promise<boolean>} true if mock data is present
 */
async function _check(page, testInfo, { view, mockText, reason, phase }) {
  if (phase) {
    // View is known-mock (real data wiring not yet implemented)
    testInfo.annotations.push({
      type: 'warning',
      description: `[MOCK DATA — ${phase}] ${view} has no live data path yet. ${reason}`
    })
    console.warn(`⚠  [MOCK DATA — ${phase}] ${view}: ${reason}`)
    return true
  }

  const isMock = await page.locator(`text=${mockText}`).first().isVisible().catch(() => false)
  if (isMock) {
    testInfo.annotations.push({
      type: 'warning',
      description: `[REAL DATA MISSING] ${view} is showing mock/sample data. ${reason}`
    })
    console.warn(`⚠  [REAL DATA MISSING] ${view}: ${reason}`)
  } else {
    testInfo.annotations.push({
      type: 'info',
      description: `[LIVE DATA OK] ${view} is showing real API data`
    })
  }
  return isMock
}

// ─── Per-view checks ──────────────────────────────────────────────────────────

/**
 * Feed view — checks if HSW congressional trades loaded from live API.
 * Mock indicator: subtitle shows "Sample data — connect Google to load live trades"
 */
export async function checkFeedDataSource(page, testInfo) {
  return _check(page, testInfo, {
    view:     'Feed',
    mockText: 'Sample data',
    reason:   'HSW S3 API unreachable, returned 403/timeout, or no watchlist matches in last 30 days. Check houseStockWatcher.js URL and watchlist active members.'
  })
}

/**
 * Positions view — checks if positions loaded from Sheets vs mock fallback.
 * Mock indicator: banner "Using sample data — upload CSV to see your real positions"
 */
export async function checkPositionsDataSource(page, testInfo) {
  return _check(page, testInfo, {
    view:     'Positions',
    mockText: 'Using sample data',
    reason:   'Positions are falling back to mockPositions.js. Upload a Schwab CSV or connect Google Sheets to load real portfolio data.'
  })
}

/**
 * Top Signal view — always mock in Phase 2 (live consensus wiring is BL-020).
 */
export async function checkTopSignalDataSource(page, testInfo) {
  return _check(page, testInfo, {
    view:   'Top Signal',
    reason: 'BL-020 (wire Top Signal to live consensus tab) not yet shipped. All signal cards are MOCK_SIGNALS from topSignal.js.',
    phase:  'BL-020 pending'
  })
}

/**
 * What to Buy view — BL-021 shipped: picks now come from live computeConsensusSignals().
 * Falls back to MOCK_PICKS with orange banner when no signals cross the tier1 threshold.
 */
export async function checkWhatToBuyDataSource(page, testInfo) {
  return _check(page, testInfo, {
    view:   'What to Buy',
    reason: 'BL-021 shipped. Picks from live computeConsensusSignals() with MOCK_PICKS fallback.',
    phase:  'BL-021 shipped'
  })
}
