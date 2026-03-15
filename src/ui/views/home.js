/**
 * Home dashboard — 4 summary cards.
 * Portfolio card uses live data from the positions store.
 * Cards use onclick="window._navigate(...)" — no closure, no async.
 */

import { getPositionsSummary, getPositions } from '../../stores/positions.js'

function isMockPositions() {
  const positions = getPositions()
  const entries   = Object.values(positions)
  if (!entries.length) return true
  return entries.every(p => p.source === 'mock')
}

function _greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function _dateLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function _fmt$(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_FEED = { newCount: 4, topTrade: { politician: 'Pelosi', ticker: 'NVDA', action: 'buy', when: '2 days ago' } }

const MOCK_SIGNAL = { ticker: 'NVDA', tier: 2, flags: 'R + D', stat: '14% of Congress buying · last 14 days' }


// ── Render ────────────────────────────────────────────────────────────────────

export function renderHome(container, signal) {
  const { newCount, topTrade }                   = MOCK_FEED
  const { ticker: sigTicker, tier, flags, stat } = MOCK_SIGNAL

  const tierClass = tier >= 3 ? 'tier-bright' : tier === 2 ? 'tier-accent' : 'tier-subtle'

  // ── Live portfolio data ──────────────────────────────────────────────────────
  const posSummary    = getPositionsSummary()
  const posIsMock     = isMockPositions()

  const accountTotal  = posSummary.account_total  || 0
  const totalGlPct    = posSummary.total_gl_pct   || 0
  const positionCount = posSummary.position_count || 0
  const lastUpload    = posSummary.last_csv_upload

  const lastUpdatedFmt = lastUpload
    ? new Date(lastUpload + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  const glSign  = totalGlPct >= 0 ? '+' : ''
  const glColor = totalGlPct >= 0 ? 'var(--buy)' : 'var(--sell)'

  container.innerHTML = `
    <div class="home-wrapper">
      <div class="home-greet-block">
        <div class="home-greeting">${_greeting()}</div>
        <div class="home-date">${_dateLabel()}</div>
      </div>

      <div class="home-cards">

        <!-- What's New -->
        <button class="home-card" onclick="window._navigate('feed')">
          <div class="home-card-header">
            <span class="home-card-title">
              What's New
              ${newCount > 0 ? '<span class="new-badge"></span>' : ''}
            </span>
            <span class="home-card-chevron">›</span>
          </div>
          <div class="home-card-value">${newCount} trade${newCount !== 1 ? 's' : ''} since your last visit</div>
          <div class="home-card-sub">${topTrade.politician} · ${topTrade.ticker} · ${topTrade.action} · ${topTrade.when}</div>
        </button>

        <!-- Top Signal -->
        <button class="home-card" onclick="window._navigate('topSignal')">
          <div class="home-card-header">
            <span class="home-card-title">Top Signal</span>
            <span class="home-card-chevron">›</span>
          </div>
          <div class="home-card-value">
            <span style="font-family:var(--font-mono);font-weight:700;">${sigTicker}</span>
            <span class="tier-badge ${tierClass}">Tier ${tier}</span>
            <span style="color:var(--text-secondary);">· ${flags}</span>
          </div>
          <div class="home-card-sub">${stat} · stocks by member activity</div>
        </button>

        <!-- My Portfolio -->
        <button class="home-card" onclick="window._navigate('positions')">
          <div class="home-card-header">
            <span class="home-card-title">My Portfolio</span>
            <span class="home-card-chevron">›</span>
          </div>
          ${accountTotal > 0 ? `
          <div class="home-card-value">
            <span style="font-weight:700;">${_fmt$(accountTotal)}</span>
            <span style="color:${glColor};font-size:14px;margin-left:6px;">${glSign}${totalGlPct.toFixed(1)}%</span>
            ${posIsMock ? '<span style="font-size:11px;color:var(--text-tertiary);margin-left:6px;">sample data</span>' : ''}
          </div>
          <div class="home-card-sub">${positionCount} positions</div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">
            ${lastUpdatedFmt ? `Updated ${lastUpdatedFmt}` : 'No data uploaded'}
          </div>
          ` : `
          <div class="home-card-value" style="font-size:15px;color:var(--text-secondary);">—</div>
          <div class="home-card-sub" style="color:var(--text-tertiary);">Upload CSV to see your real portfolio</div>
          `}
        </button>

        <!-- What to Buy -->
        <button class="home-card" onclick="window._navigate('whatToBuy')">
          <div class="home-card-header">
            <span class="home-card-title">What to Buy</span>
            <span class="home-card-chevron">›</span>
          </div>
          <div class="home-card-value">Ready to invest?</div>
          <div class="home-card-sub">Enter an amount to get slice picks</div>
        </button>

      </div>
    </div>
  `
}
