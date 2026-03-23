/**
 * Feed view — drill-down screen showing recent politician trade disclosures.
 * 3-state cards: collapsed → expanded → followed/ignored
 * Loads live HSW congressional trades; falls back to MOCK_TRADES on error.
 */

import { fetchAllTransactions, filterByWatchlist } from '../../api/congressional.js'
import { readTab } from '../../api/googleSheets.js'
import { get as configGet } from '../../stores/config.js'
import { debug, warn } from '../../services/logger.js'
import { showToast } from '../components/toast.js'
import { WATCHLIST } from '../../data/watchlist.js'

const CAT = 'FEED_VIEW'

// Tracks when the user last manually clicked ↺ Refresh in this session.
// Null on fresh page load — gate never fires until at least one manual refresh.
let _manualRefreshTs = null

// ─── Pagination state ────────────────────────────────────────────────────────
// Reset on each fresh renderFeed() call. Shared with the "Show more" handler.
let _displayCount = 5
let _allVisibleTrades = []
let _showMorePending = false // guard against double-click duplication

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
  if (!dateStr) return 'unknown date'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'unknown date'
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
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

// ─── Persistence helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'sth_trade_decisions'

function _loadDecisions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function _saveDecision(tradeId, decision) {
  const decisions = _loadDecisions()
  decisions[tradeId] = decision
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions))
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function _renderSkeleton() {
  const shimmer = `background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-elevated) 50%, var(--bg-raised) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;`
  return `
    <div style="margin-bottom:var(--s5);">
      <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">Recent Trades</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">Loading congressional trades…</div>
    </div>
    ${Array(6).fill('').map(() => `
      <div class="card" style="padding:var(--s4);">
        <div style="height:18px;width:65%;border-radius:var(--r2);${shimmer}"></div>
        <div style="height:14px;width:45%;border-radius:var(--r2);margin-top:var(--s2);${shimmer}"></div>
        <div style="height:13px;width:55%;border-radius:var(--r2);margin-top:var(--s2);${shimmer}"></div>
      </div>
    `).join('')}
  `
}

// ─── Main render ─────────────────────────────────────────────────────────────

export async function renderFeed(container, signal, { forceRefresh = false } = {}) {
  // Show skeleton immediately
  container.innerHTML = _renderSkeleton()

  let trades = MOCK_TRADES
  let usingMock = false
  let fetchError = null

  try {
    debug(CAT, `Fetching congressional transactions (forceRefresh=${forceRefresh})`)
    const allTransactions = await fetchAllTransactions({ forceRefresh })
    debug(CAT, `Congressional API returned ${allTransactions.length} transactions`)

    // Load active watchlist names — Sheets first, seed fallback
    let watchlistNames = WATCHLIST.filter(w => w.active === 'Y').map(w => w.name)
    try {
      const rows = await readTab('watchlist')
      const sheetsNames = rows.filter(r => r[8]?.toUpperCase() === 'Y').map(r => r[1]).filter(Boolean)
      if (sheetsNames.length > 0) {
        watchlistNames = sheetsNames
        debug(CAT, `Watchlist from Sheets: ${watchlistNames.length} active members`)
      } else {
        debug(CAT, `Sheets watchlist empty — using seed (${watchlistNames.length} members)`)
      }
    } catch (wlErr) {
      warn(CAT, `Watchlist load failed: ${wlErr.message} — using seed watchlist`)
    }

    // Filter to watchlist members — use 180-day window to match cache.
    // Congressional disclosures lag 30–45 days after the trade, so a
    // narrow filter silently drops most recent disclosures.
    const filteredTrades = filterByWatchlist(allTransactions, watchlistNames, { daysBack: 180 })
    debug(CAT, `Filtered to ${filteredTrades.length} trades in last 180 days`)

    if (filteredTrades.length === 0) {
      warn(CAT, 'No trades found for watchlist in past 30 days — using mock')
      usingMock = true
    } else {
      trades = filteredTrades
    }
  } catch (err) {
    fetchError = err.message
    warn(CAT, `Congressional fetch failed: ${err.message} — using mock data`)
    console.error('[FEED_VIEW] fetch failed:', err.message)
    showToast('Could not load live trades — showing sample data', 'error')
    usingMock = true
  }

  // Guard: navigated away during async load
  if (signal?.aborted || !container.isConnected) return

  const decisions = _loadDecisions()
  const visibleTrades = trades.filter(t => decisions[t.id] !== 'ignored')

  // Reset pagination state for this fresh render
  _displayCount = 5
  _allVisibleTrades = visibleTrades
  _showMorePending = false

  const tradeCount = visibleTrades.length
  const lastFetchStr = configGet('congressional_last_fetch', '')
  const lastUpdatedLabel = lastFetchStr
    ? ` · updated ${_formatAge(Date.now() - new Date(lastFetchStr).getTime())} ago`
    : ''
  const subtitle = usingMock
    ? 'Sample data — connect Google to load live trades'
    : `${tradeCount} disclosure${tradeCount !== 1 ? 's' : ''} · last 6 months${lastUpdatedLabel}`

  const refreshBtn = `<button id="feed-refresh-btn" class="btn btn-ghost" style="font-size:11px;padding:2px 10px;margin-top:var(--s2);">↺ Refresh</button>`

  if (visibleTrades.length === 0) {
    container.innerHTML = `
      <div style="margin-bottom:var(--s5);">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">Recent Trades</div>
          ${refreshBtn}
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${subtitle}</div>
      </div>
      <div style="padding:var(--s6) var(--s4);text-align:center;color:var(--text-tertiary);font-size:13px;line-height:1.6;">
        No recent disclosures found for your watchlist.<br>
        <span style="font-size:12px;">All trades may have been dismissed, or your watchlist may be empty.</span>
      </div>
    `
    _attachRefreshHandler(container, signal)
    return
  }

  const initialBatch = visibleTrades.slice(0, _displayCount)

  container.innerHTML = `
    <div style="margin-bottom:var(--s5);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">Recent Trades</div>
        ${refreshBtn}
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${subtitle}</div>
      ${usingMock ? `<div style="font-size:11px;color:var(--accent);margin-top:4px;">Using sample data${fetchError ? ` · ${fetchError.slice(0, 80)}` : ''}</div>` : ''}
    </div>
    <div id="feed-cards">${initialBatch.map(_tradeCardHTML).join('')}</div>
    ${_buildShowMoreBtn(visibleTrades.length)}
  `

  // Restore followed state for the initially visible cards
  initialBatch.forEach(trade => {
    if (decisions[trade.id] === 'followed') {
      _applyFollowedUI(container, trade.id)
    }
  })

  _attachHandlers(container, visibleTrades, decisions, signal)
  _attachRefreshHandler(container, signal)
  _attachShowMoreHandler(container, decisions, signal)
}

// ─── Pagination helpers ───────────────────────────────────────────────────────

function _buildShowMoreBtn(totalCount) {
  const remaining = totalCount - _displayCount
  if (remaining <= 0) return ''
  return `<button id="feed-show-more" class="btn btn-ghost"
    style="width:100%;margin-top:var(--s3);font-size:13px;">
    Show more (${remaining} remaining)
  </button>`
}

function _attachShowMoreHandler(container, decisions, signal) {
  const btn = container.querySelector('#feed-show-more')
  if (!btn) return

  btn.addEventListener('click', () => {
    // Double-click guard: ignore while a batch is being appended
    if (_showMorePending) return
    _showMorePending = true

    const cardsEl = container.querySelector('#feed-cards')
    if (!cardsEl) { _showMorePending = false; return }

    const nextBatch = _allVisibleTrades.slice(_displayCount, _displayCount + 5)
    _displayCount += nextBatch.length

    // Append new cards without touching existing ones (preserves expand/collapse state)
    const fragment = document.createDocumentFragment()
    nextBatch.forEach(trade => {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = _tradeCardHTML(trade)
      const card = wrapper.firstElementChild
      fragment.appendChild(card)
    })
    cardsEl.appendChild(fragment)

    // Restore followed state for newly appended cards
    nextBatch.forEach(trade => {
      if (decisions[trade.id] === 'followed') {
        _applyFollowedUI(container, trade.id)
      }
    })

    // Wire follow/ignore buttons on the newly added cards
    _attachHandlersForBatch(container, nextBatch, decisions, signal)

    // Update or remove the "Show more" button
    const remaining = _allVisibleTrades.length - _displayCount
    if (remaining <= 0) {
      btn.remove()
    } else {
      btn.textContent = `Show more (${remaining} remaining)`
    }

    _showMorePending = false
  }, signal ? { signal } : {})
}

function _attachHandlersForBatch(container, trades, decisions, signal) {
  const cardState = new Map(Object.entries(decisions))
  const opts = signal ? { signal } : {}

  trades.forEach(trade => {
    const followBtn = container.querySelector(`.trade-follow-btn[data-trade-id="${trade.id}"]`)
    if (followBtn) {
      followBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const tradeId = followBtn.dataset.tradeId
        if (cardState.get(tradeId) === 'followed') return
        cardState.set(tradeId, 'followed')
        _saveDecision(tradeId, 'followed')
        _applyFollowedUI(container, tradeId)
      }, opts)
    }

    const ignoreBtn = container.querySelector(`.trade-ignore-btn[data-trade-id="${trade.id}"]`)
    if (ignoreBtn) {
      ignoreBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const tradeId = ignoreBtn.dataset.tradeId
        if (cardState.get(tradeId) === 'ignored') return
        cardState.set(tradeId, 'ignored')
        _saveDecision(tradeId, 'ignored')

        const card = container.querySelector(`.trade-card[data-trade-id="${tradeId}"]`)
        if (!card) return

        card.style.transition = 'opacity 300ms ease, max-height 300ms ease, margin-top 300ms ease, padding 300ms ease'
        card.style.opacity    = '0'
        card.style.maxHeight  = card.getBoundingClientRect().height + 'px'
        void card.offsetHeight

        const rafId   = requestAnimationFrame(() => {
          card.style.maxHeight     = '0'
          card.style.marginTop     = '0'
          card.style.paddingTop    = '0'
          card.style.paddingBottom = '0'
          card.style.overflow      = 'hidden'
        })
        const timerId = setTimeout(() => {
          if (card.parentElement) card.remove()
        }, 320)

        signal?.addEventListener('abort', () => {
          cancelAnimationFrame(rafId)
          clearTimeout(timerId)
        }, { once: true })
      }, opts)
    }
  })
}

function _formatAge(ms) {
  const h = ms / 3_600_000
  if (h < 1) return '< 1h'
  if (h < 24) return `${Math.floor(h)}h`
  const d = Math.floor(h / 24)
  return `${d} day${d !== 1 ? 's' : ''}`
}

function _showRefreshModal(container, signal, age) {
  const existing = document.getElementById('feed-refresh-modal')
  if (existing) existing.remove()

  const modal = document.createElement('div')
  modal.id = 'feed-refresh-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;padding:var(--s4);'
  modal.innerHTML = `
    <div style="background:var(--bg-raised);border:1px solid var(--border-soft);border-radius:var(--r3);padding:var(--s5);width:100%;max-width:420px;">
      <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:var(--s2);">Data refreshed ${age} ago</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--s5);line-height:1.5;">Fetching again uses your network quota. Refresh anyway?</div>
      <div style="display:flex;gap:var(--s3);">
        <button id="feed-modal-cancel" class="btn btn-ghost" style="flex:1;">Cancel</button>
        <button id="feed-modal-confirm" class="btn" style="flex:1;background:var(--accent);color:#fff;border:none;">Yes, Refresh</button>
      </div>
    </div>
  `
  document.body.appendChild(modal)

  const opts = signal ? { signal } : {}
  const dismiss = () => modal.remove()

  modal.addEventListener('click', (e) => { if (e.target === modal) dismiss() }, opts)
  modal.querySelector('#feed-modal-cancel').addEventListener('click', dismiss, opts)
  modal.querySelector('#feed-modal-confirm').addEventListener('click', () => {
    dismiss()
    _manualRefreshTs = Date.now()
    const btn = container.querySelector('#feed-refresh-btn')
    if (btn) { btn.textContent = '↺ Refreshing…'; btn.disabled = true }
    renderFeed(container, signal, { forceRefresh: true })
  }, opts)
  signal?.addEventListener('abort', dismiss, { once: true })
}

function _attachRefreshHandler(container, signal) {
  const btn = container.querySelector('#feed-refresh-btn')
  if (!btn) return
  btn.addEventListener('click', () => {
    const ageMs = _manualRefreshTs ? Date.now() - _manualRefreshTs : Infinity
    if (ageMs < 86_400_000) {
      _showRefreshModal(container, signal, _formatAge(ageMs))
    } else {
      _manualRefreshTs = Date.now()
      btn.textContent = '↺ Refreshing…'
      btn.disabled = true
      renderFeed(container, signal, { forceRefresh: true })
    }
  }, signal ? { signal } : {})
}

function _applyFollowedUI(container, tradeId) {
  const btn = container.querySelector(`.trade-follow-btn[data-trade-id="${tradeId}"]`)
  if (btn) {
    btn.textContent = '✓ Follow'
    btn.style.background  = 'rgba(127,184,131,0.22)'
    btn.style.color       = 'var(--buy)'
    btn.style.borderColor = 'rgba(127,184,131,0.4)'
  }
  const card = container.querySelector(`.trade-card[data-trade-id="${tradeId}"]`)
  if (card) {
    card.style.borderLeftWidth = '3px'
    card.style.borderLeftColor = 'var(--buy)'
  }
}

// ─── Interaction logic ────────────────────────────────────────────────────────

function _attachHandlers(container, trades, decisions, signal) {
  // Mirror localStorage into a live Map for this session
  const cardState = new Map(Object.entries(decisions))
  const opts = signal ? { signal } : {}

  // ── Direct listeners on follow/ignore buttons ─────────────────────────────
  // iOS WebKit sometimes fires click on the flex container (.decision-row)
  // instead of the button child. e.target.closest() from the container would
  // miss the button. Direct listeners on each button are reliable on all platforms.

  container.querySelectorAll('.trade-follow-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const tradeId = btn.dataset.tradeId
      const trade   = trades.find(t => t.id === tradeId)
      if (!trade) return
      if (cardState.get(tradeId) === 'followed') return

      cardState.set(tradeId, 'followed')
      _saveDecision(tradeId, 'followed')
      _applyFollowedUI(container, tradeId)
    }, opts)
  })

  container.querySelectorAll('.trade-ignore-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const tradeId = btn.dataset.tradeId
      const trade   = trades.find(t => t.id === tradeId)
      if (!trade) return
      if (cardState.get(tradeId) === 'ignored') return

      cardState.set(tradeId, 'ignored')
      _saveDecision(tradeId, 'ignored')

      const card = container.querySelector(`.trade-card[data-trade-id="${tradeId}"]`)
      if (!card) return

      // Animate out
      card.style.transition = 'opacity 300ms ease, max-height 300ms ease, margin-top 300ms ease, padding 300ms ease'
      card.style.opacity    = '0'
      card.style.maxHeight  = card.getBoundingClientRect().height + 'px'

      // Force reflow so transition fires
      void card.offsetHeight

      const rafId     = requestAnimationFrame(() => {
        card.style.maxHeight     = '0'
        card.style.marginTop     = '0'
        card.style.paddingTop    = '0'
        card.style.paddingBottom = '0'
        card.style.overflow      = 'hidden'
      })
      const timerId = setTimeout(() => {
        // Guard: navigation may have cleared the DOM before the 320ms fired.
        // Calling .remove() on a detached node crashes iOS WebKit layout.
        if (card.parentElement) card.remove()
      }, 320)

      // Cancel in-flight animation if user navigates away
      signal?.addEventListener('abort', () => {
        cancelAnimationFrame(rafId)
        clearTimeout(timerId)
      }, { once: true })
    }, opts)
  })

  // ── Delegated expand / collapse (clicking anywhere in card body) ──────────
  container.addEventListener('click', (e) => {
    const cardBody = e.target.closest('[data-expand-target]')
    if (!cardBody) return
    const tradeId    = cardBody.dataset.expandTarget
    const card       = container.querySelector(`.trade-card[data-trade-id="${tradeId}"]`)
    const expandedEl = container.querySelector(`[data-expanded-id="${tradeId}"]`)
    if (!card || !expandedEl) return

    const isExpanded = card.dataset.expanded === 'true'
    if (isExpanded) {
      expandedEl.style.display = 'none'
      card.dataset.expanded    = 'false'
    } else {
      expandedEl.style.display = 'block'
      card.dataset.expanded    = 'true'
    }
  }, opts)
}
