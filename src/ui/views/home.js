/**
 * Home dashboard — 4 summary cards.
 * Pure mock data. No imports from stores or API.
 * Cards use onclick="window._navigate(...)" — no closure, no async.
 */

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

const MOCK_PORTFOLIO = {
  account_total:   12450,
  total_gl:        2.3,
  position_count:  8,
  last_updated:    'Mar 11',
  last_purchase:   'Mar 7',
  alignment_score: '2 of 3 aligned',
}

// ── Render ────────────────────────────────────────────────────────────────────

export function renderHome(container) {
  const { newCount, topTrade }                                       = MOCK_FEED
  const { ticker: sigTicker, tier, flags, stat }                     = MOCK_SIGNAL
  const { account_total, total_gl, position_count,
          last_updated, last_purchase, alignment_score }             = MOCK_PORTFOLIO

  const tierClass   = tier >= 3 ? 'tier-bright' : tier === 2 ? 'tier-accent' : 'tier-subtle'
  const glColor     = total_gl >= 0 ? 'var(--buy)' : 'var(--sell)'
  const glSign      = total_gl >= 0 ? '+' : ''

  const alignMatch  = alignment_score.match(/^(\d+) of (\d+)/)
  let   alignColor  = 'var(--sell)'
  if (alignMatch) {
    const n = +alignMatch[1], tot = +alignMatch[2]
    alignColor = n === tot ? 'var(--buy)' : n >= tot - 1 ? 'var(--accent)' : 'var(--sell)'
  }

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
          <div class="home-card-value">
            <span style="font-weight:700;">${_fmt$(account_total)}</span>
            <span style="color:${glColor};font-size:14px;">${glSign}${total_gl.toFixed(1)}</span>
          </div>
          <div class="home-card-sub">${position_count} positions</div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">
            Updated ${last_updated} · Last buy ${last_purchase}
          </div>
          <div style="font-size:12px;color:${alignColor};font-weight:500;margin-top:6px;">
            ● ${alignment_score}
          </div>
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
