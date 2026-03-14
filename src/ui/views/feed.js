/**
 * Feed view — drill-down screen showing recent politician trade disclosures.
 * 3-state cards: collapsed → expanded → followed/ignored
 * Uses hardcoded mock data (Phase 3 will wire real HSW API).
 */

const MOCK_TRADES = [
  { id: '1', politician_name: 'Nancy Pelosi',    party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 250001,  amount_high: 500000,   transaction_date: '2026-03-11', disclosed_date: '2026-03-13' },
  { id: '2', politician_name: 'Dan Crenshaw',    party: 'R', ticker: 'MSFT', action: 'buy',  amount_low: 15001,   amount_high: 50000,    transaction_date: '2026-03-10', disclosed_date: '2026-03-12' },
  { id: '3', politician_name: 'Ro Khanna',       party: 'D', ticker: 'AAPL', action: 'sell', amount_low: 50001,   amount_high: 100000,   transaction_date: '2026-03-08', disclosed_date: '2026-03-11' },
  { id: '4', politician_name: 'Tommy Tuberville', party: 'R', ticker: 'AMD', action: 'buy',  amount_low: 100001,  amount_high: 250000,   transaction_date: '2026-03-07', disclosed_date: '2026-03-10' },
  { id: '5', politician_name: 'Nancy Pelosi',    party: 'D', ticker: 'TSM',  action: 'buy',  amount_low: 500001,  amount_high: 1000000,  transaction_date: '2026-03-05', disclosed_date: '2026-03-09' },
]

// Hardcoded AI summary mock text, keyed by trade id
const MOCK_AI_SUMMARIES = {
  '1': 'Pelosi has traded NVDA 3x in the past 6 months. This buy follows recent AI chip export policy discussions. The timing aligns closely with committee briefings on semiconductor regulation. Insider timing pattern.',
  '2': 'Crenshaw added MSFT ahead of a defense cloud contract renewal cycle. Microsoft holds several Pentagon contracts. Relatively modest position — could be routine portfolio rebalancing.',
  '3': 'Khanna trimmed AAPL after publicly raising antitrust concerns about Big Tech. The sell reduces potential conflict-of-interest optics ahead of upcoming tech hearings.',
  '4': 'Tuberville entered AMD during a period of increased GPU demand discourse in Congress. AMD has benefited from NVDA export restrictions. Agriculture committee member, limited direct oversight.',
  '5': 'Pelosi made her largest TSM position in over a year. Taiwan Semiconductor is a focal point in US chip supply chain legislation. This trade preceded key CHIPS Act implementation discussions.',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _relativeDate(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function _fmtAmount(low, high) {
  const fmt = n => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(0)}M` : `$${(n / 1000).toFixed(0)}k`
  return `${fmt(low)}–${fmt(high)}`
}

function _fmtDateShort(dateStr) {
  // e.g. "2026-03-13" → "Mar 13"
  const d = new Date(dateStr + 'T12:00:00') // noon avoids TZ edge cases
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Card HTML builders ──────────────────────────────────────────────────────

function _partyBadge(party) {
  const colorMap = { D: 'color:#6b9bd2;background:rgba(107,155,210,0.14);border-color:rgba(107,155,210,0.25)', R: 'color:#c47b6e;background:rgba(196,123,110,0.14);border-color:rgba(196,123,110,0.25)' }
  const style = colorMap[party] || 'color:var(--text-tertiary);background:var(--bg-elevated);border-color:var(--border-soft)'
  return `<span style="display:inline-flex;align-items:center;padding:1px 7px;border-radius:100px;font-size:11px;font-weight:600;letter-spacing:0.04em;border:1px solid;${style}">${party || 'U'}</span>`
}

function _tradeCardHTML(trade) {
  const actionColor = trade.action === 'buy' ? 'var(--buy)' : 'var(--sell)'
  const actionLabel = trade.action.toUpperCase()
  const amount      = _fmtAmount(trade.amount_low, trade.amount_high)
  const relDate     = _relativeDate(trade.transaction_date)
  const disclosedFmt = _fmtDateShort(trade.disclosed_date)
  const tradedFmt    = _fmtDateShort(trade.transaction_date)
  const summary     = MOCK_AI_SUMMARIES[trade.id] || 'No summary available.'

  return `
<div class="card trade-card"
     data-trade-id="${trade.id}"
     style="cursor:pointer;transition:opacity 300ms ease,max-height 300ms ease,margin 300ms ease,padding 300ms ease;overflow:hidden;">

  <!-- Collapsed body — always visible -->
  <div class="trade-card-body" data-expand-target="${trade.id}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);">
      <div style="display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;min-width:0;">
        ${_partyBadge(trade.party)}
        <span style="font-size:14px;font-weight:500;color:var(--text-primary);white-space:nowrap;">${trade.politician_name}</span>
      </div>
      <span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0;">${relDate}</span>
    </div>

    <div style="display:flex;align-items:baseline;gap:var(--s3);margin-top:var(--s2);">
      <span style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--text-primary);letter-spacing:-0.01em;">${trade.ticker}</span>
      <span style="font-size:13px;font-weight:600;color:${actionColor};">${actionLabel}</span>
      <span style="font-size:13px;color:var(--text-secondary);">${amount}</span>
    </div>
  </div>

  <!-- Expanded section — hidden by default -->
  <div class="trade-card-expanded" data-expanded-id="${trade.id}"
       style="display:none;margin-top:var(--s4);">
    <div style="
      background:var(--bg-elevated);
      border:1px solid var(--border-subtle);
      border-radius:var(--r2);
      padding:var(--s3) var(--s4);
      font-size:13px;
      color:var(--text-secondary);
      line-height:1.65;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.09em;color:var(--text-tertiary);margin-bottom:var(--s2);font-weight:600;">AI Summary</div>
      ${summary}
    </div>
    <div style="margin-top:var(--s3);font-size:12px;color:var(--text-tertiary);">
      Disclosed: ${disclosedFmt} &nbsp;·&nbsp; Traded: ${tradedFmt}
    </div>
  </div>

  <!-- Action buttons -->
  <div class="decision-row" style="margin-top:var(--s4);">
    <button class="btn trade-follow-btn"
            data-action="follow"
            data-trade-id="${trade.id}"
            style="background:rgba(127,184,131,0.12);color:var(--buy);border:1px solid rgba(127,184,131,0.2);">
      Follow
    </button>
    <button class="btn btn-ghost trade-ignore-btn"
            data-action="ignore"
            data-trade-id="${trade.id}">
      Ignore
    </button>
  </div>
</div>
`
}

// ─── Main render ─────────────────────────────────────────────────────────────

export function renderFeed(container) {
  const trades = MOCK_TRADES

  // Page header
  const headerHTML = `
<div style="margin-bottom:var(--s5);">
  <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">Recent Trades</div>
  <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${trades.length} trades &nbsp;·&nbsp; last 90 days</div>
</div>
`

  if (trades.length === 0) {
    container.innerHTML = headerHTML + `
<div class="empty-state">
  <div class="empty-state-title">No trades to show</div>
  <div class="empty-state-sub">No recent politician disclosures found.</div>
</div>`
    return
  }

  container.innerHTML = headerHTML + `<div id="feed-cards">${trades.map(_tradeCardHTML).join('')}</div>`

  _attachHandlers(container, trades)
}

// ─── Interaction logic ────────────────────────────────────────────────────────

function _attachHandlers(container, trades) {
  // In-memory state: Map<tradeId, 'followed' | 'ignored'>
  const cardState = new Map()

  container.addEventListener('click', (e) => {
    // ── Follow button ────────────────────────────────────────────────────────
    const followBtn = e.target.closest('[data-action="follow"]')
    if (followBtn) {
      e.stopPropagation()
      const tradeId = followBtn.dataset.tradeId
      const trade   = trades.find(t => t.id === tradeId)
      if (!trade) return

      const alreadyFollowed = cardState.get(tradeId) === 'followed'
      if (alreadyFollowed) return // idempotent

      cardState.set(tradeId, 'followed')
      console.log('[Feed] follow', trade)

      // Update button to checkmark state
      followBtn.textContent = '✓ Follow'
      followBtn.style.background  = 'rgba(127,184,131,0.22)'
      followBtn.style.color       = 'var(--buy)'
      followBtn.style.borderColor = 'rgba(127,184,131,0.4)'

      // Add left border accent to card
      const card = container.querySelector(`.trade-card[data-trade-id="${tradeId}"]`)
      if (card) {
        card.style.borderLeftWidth = '3px'
        card.style.borderLeftColor = 'var(--buy)'
      }
      return
    }

    // ── Ignore button ────────────────────────────────────────────────────────
    const ignoreBtn = e.target.closest('[data-action="ignore"]')
    if (ignoreBtn) {
      e.stopPropagation()
      const tradeId = ignoreBtn.dataset.tradeId
      const trade   = trades.find(t => t.id === tradeId)
      if (!trade) return
      if (cardState.get(tradeId) === 'ignored') return

      cardState.set(tradeId, 'ignored')
      console.log('[Feed] ignore', trade)

      const card = container.querySelector(`.trade-card[data-trade-id="${tradeId}"]`)
      if (!card) return

      // Animate out
      card.style.transition = 'opacity 300ms ease, max-height 300ms ease, margin-top 300ms ease, padding 300ms ease'
      card.style.opacity    = '0'
      card.style.maxHeight  = card.getBoundingClientRect().height + 'px'

      // Force reflow so transition fires
      void card.offsetHeight

      requestAnimationFrame(() => {
        card.style.maxHeight  = '0'
        card.style.marginTop  = '0'
        card.style.paddingTop = '0'
        card.style.paddingBottom = '0'
        card.style.overflow   = 'hidden'
      })

      setTimeout(() => card.remove(), 320)
      return
    }

    // ── Expand / collapse card body ──────────────────────────────────────────
    const cardBody = e.target.closest('[data-expand-target]')
    if (cardBody) {
      const tradeId    = cardBody.dataset.expandTarget
      const card       = container.querySelector(`.trade-card[data-trade-id="${tradeId}"]`)
      const expandedEl = container.querySelector(`[data-expanded-id="${tradeId}"]`)
      if (!card || !expandedEl) return

      const isExpanded = card.dataset.expanded === 'true'
      if (isExpanded) {
        // Collapse
        expandedEl.style.display   = 'none'
        card.dataset.expanded      = 'false'
      } else {
        // Expand
        expandedEl.style.display   = 'block'
        card.dataset.expanded      = 'true'
      }
      return
    }
  })
}
