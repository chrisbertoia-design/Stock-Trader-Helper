/**
 * Decisions History view — shows trade follow/ignore decisions from localStorage.
 * Cross-references trade IDs against live congressional data to display details.
 */

import { fetchAllTransactions } from '../../api/congressional.js'
import { debug, warn } from '../../services/logger.js'

const CAT = 'DECISIONS_VIEW'

const STORAGE_KEY = 'sth_trade_decisions'

function _loadDecisions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function _fmtAmount(low, high) {
  const fmt = n => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(0)}M` : `$${(n / 1000).toFixed(0)}k`
  return `${fmt(low)}–${fmt(high)}`
}

function _relDate(dateStr) {
  if (!dateStr) return '—'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function _partyBadge(party) {
  const colorMap = {
    D: 'color:#6b9bd2;background:rgba(107,155,210,0.14);border-color:rgba(107,155,210,0.25)',
    R: 'color:#c47b6e;background:rgba(196,123,110,0.14);border-color:rgba(196,123,110,0.25)'
  }
  const style = colorMap[party] || 'color:var(--text-tertiary);background:var(--bg-elevated);border-color:var(--border-soft)'
  return `<span style="display:inline-flex;align-items:center;padding:1px 7px;border-radius:100px;font-size:11px;font-weight:600;letter-spacing:0.04em;border:1px solid;${style}">${party || 'U'}</span>`
}

function _renderSkeleton() {
  const shimmer = `background:linear-gradient(90deg,var(--bg-raised) 25%,var(--bg-elevated) 50%,var(--bg-raised) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;`
  return `
    <div style="margin-bottom:var(--s5);">
      <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">My Decisions</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">Loading…</div>
    </div>
    ${Array(3).fill('').map(() => `
      <div class="card" style="padding:var(--s4);">
        <div style="height:18px;width:65%;border-radius:var(--r2);${shimmer}"></div>
        <div style="height:14px;width:45%;border-radius:var(--r2);margin-top:var(--s2);${shimmer}"></div>
      </div>
    `).join('')}
  `
}

export async function renderDecisionsHistory(container, signal) {
  container.innerHTML = _renderSkeleton()

  const decisions = _loadDecisions()
  const followedIds  = Object.entries(decisions).filter(([, v]) => v === 'followed').map(([id]) => id)
  const ignoredIds   = Object.entries(decisions).filter(([, v]) => v === 'ignored').map(([id]) => id)

  let followedTrades = []

  if (followedIds.length > 0) {
    try {
      debug(CAT, `Loading ${followedIds.length} followed trades from congressional data`)
      const allTx = await fetchAllTransactions()
      if (signal?.aborted) return

      // Build a lookup map by trade ID
      const txById = new Map(allTx.map(t => [t.id, t]))

      for (const id of followedIds) {
        const trade = txById.get(id)
        if (trade) {
          followedTrades.push(trade)
        } else {
          // Trade not in 6-month window — show stub with ID only
          followedTrades.push({ id, _stub: true })
        }
      }

      // Sort by transaction date descending (most recent first)
      followedTrades.sort((a, b) => (b.transaction_ts || 0) - (a.transaction_ts || 0))
    } catch (err) {
      warn(CAT, `Failed to load congressional data: ${err.message}`)
    }
  }

  if (signal?.aborted || !container.isConnected) return

  const total   = followedIds.length + ignoredIds.length
  const subtitle = total === 0
    ? 'No decisions recorded yet'
    : `${followedIds.length} followed · ${ignoredIds.length} ignored`

  if (total === 0) {
    container.innerHTML = `
      <div style="margin-bottom:var(--s5);">
        <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">My Decisions</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${subtitle}</div>
      </div>
      <div style="padding:var(--s6) var(--s4);text-align:center;color:var(--text-tertiary);font-size:13px;line-height:1.6;">
        No decisions yet.<br>
        <span style="font-size:12px;">Follow or ignore trades in the Feed to build your history.</span>
      </div>
    `
    return
  }

  const cardsHtml = followedTrades.length === 0
    ? `<div style="padding:var(--s4);text-align:center;color:var(--text-tertiary);font-size:13px;">Followed trades are outside the 6-month data window.</div>`
    : followedTrades.map(t => {
        if (t._stub) {
          return `
            <div class="card" style="padding:var(--s4);border-left:3px solid var(--buy);">
              <div style="font-size:12px;color:var(--text-tertiary);">Trade ID: ${t.id}</div>
              <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">Details unavailable — trade is outside the 6-month window</div>
            </div>
          `
        }
        const actionColor = t.action === 'buy' ? 'var(--buy)' : 'var(--sell)'
        return `
          <div class="card" style="padding:var(--s4);border-left:3px solid var(--buy);">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);">
              <div style="display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;">
                ${_partyBadge(t.party)}
                <span style="font-size:14px;font-weight:500;color:var(--text-primary);">${t.politician_name}</span>
              </div>
              <span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0;">${_relDate(t.transaction_date)}</span>
            </div>
            <div style="display:flex;align-items:baseline;gap:var(--s3);margin-top:var(--s2);">
              <span style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--text-primary);">${t.ticker}</span>
              <span style="font-size:13px;font-weight:600;color:${actionColor};">${t.action.toUpperCase()}</span>
              <span style="font-size:13px;color:var(--text-secondary);">${_fmtAmount(t.amount_low, t.amount_high)}</span>
            </div>
            <div style="margin-top:var(--s2);font-size:11px;color:var(--buy);font-weight:500;">✓ Followed</div>
          </div>
        `
      }).join('')

  container.innerHTML = `
    <div style="margin-bottom:var(--s5);">
      <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">My Decisions</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${subtitle}</div>
    </div>
    <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:var(--s3);">Followed trades</div>
    ${cardsHtml}
    ${ignoredIds.length > 0 ? `
      <div style="margin-top:var(--s5);padding-top:var(--s4);border-top:1px solid var(--border-subtle);">
        <div style="font-size:13px;color:var(--text-tertiary);">${ignoredIds.length} trade${ignoredIds.length !== 1 ? 's' : ''} ignored (not shown)</div>
      </div>
    ` : ''}
  `
}
