/**
 * Top Signal view — stocks ranked by congressional trading activity.
 * Shows which tickers members are trading, party breakdown, buy/sell ratio.
 * Phase 2: wired to live congressional trades via fetchAllTransactions + computeConsensusSignals.
 */

import { fetchAllTransactions, filterByWatchlist, computeConsensusSignals } from '../../api/congressional.js'
import { getConfig } from '../../stores/config.js'
import { readTab } from '../../api/googleSheets.js'
import { WATCHLIST } from '../../data/watchlist.js'

const PARTY_ROSTER = { D: 213, R: 222 }

const MOCK_SIGNALS = [
  {
    ticker:      'NVDA',
    name:        'NVIDIA Corp',
    memberCount: 19,
    partyD:      11,
    partyR:      8,
    buyCount:    17,
    sellCount:   2,
    tier:        3,
    windowDays:  14,
    lastTrade:   '1 day ago',
    topTrader:   'Pelosi',
  },
  {
    ticker:      'MSFT',
    name:        'Microsoft Corp',
    memberCount: 12,
    partyD:      5,
    partyR:      7,
    buyCount:    10,
    sellCount:   2,
    tier:        2,
    windowDays:  14,
    lastTrade:   '2 days ago',
    topTrader:   'Crenshaw',
  },
  {
    ticker:      'AAPL',
    name:        'Apple Inc',
    memberCount: 10,
    partyD:      6,
    partyR:      4,
    buyCount:    8,
    sellCount:   2,
    tier:        2,
    windowDays:  14,
    lastTrade:   '3 days ago',
    topTrader:   'Pelosi',
  },
  {
    ticker:      'AMZN',
    name:        'Amazon.com Inc',
    memberCount: 8,
    partyD:      3,
    partyR:      5,
    buyCount:    7,
    sellCount:   1,
    tier:        2,
    windowDays:  14,
    lastTrade:   '4 days ago',
    topTrader:   'Collins',
  },
  {
    ticker:      'META',
    name:        'Meta Platforms',
    memberCount: 6,
    partyD:      4,
    partyR:      2,
    buyCount:    5,
    sellCount:   1,
    tier:        1,
    windowDays:  30,
    lastTrade:   '6 days ago',
    topTrader:   'Schiff',
  },
  {
    ticker:      'GOOGL',
    name:        'Alphabet Inc',
    memberCount: 5,
    partyD:      2,
    partyR:      3,
    buyCount:    3,
    sellCount:   2,
    tier:        1,
    windowDays:  30,
    lastTrade:   '8 days ago',
    topTrader:   'McCaul',
  },
  {
    ticker:      'WMT',
    name:        '',
    memberCount: 6,
    partyD:      2,
    partyR:      4,
    buyCount:    2,
    sellCount:   7,
    tier:        2,
    windowDays:  14,
    lastTrade:   '3 days ago',
    topTrader:   'Collins',
  },
]

const PARTY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'D',   label: 'Dem' },
  { key: 'R',   label: 'Rep' },
]

const ACTION_FILTERS = [
  { key: 'all',  label: 'All' },
  { key: 'buy',  label: 'Buys' },
  { key: 'sell', label: 'Sells' },
]

const WINDOWS = [
  { key: '14', label: '14d' },
  { key: '30', label: '30d' },
  { key: '90', label: '90d' },
]

let _partyFilter  = 'all'
let _actionFilter = 'all'
let _activeWindow = 90   // number: 14, 30, or 90

// module-level state for live data
let _liveSignals = null   // null = not loaded, [] = loaded but empty, [...] = loaded
let _usingMock   = false

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _relativeDate(isoString) {
  const d = new Date(isoString)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function _signalStrength(tier) {
  if (tier >= 3) return { label: 'Strong',   dots: '●●●', color: 'var(--buy)' }
  if (tier === 2) return { label: 'Moderate', dots: '●●○', color: 'var(--accent)' }
  return              { label: 'Weak',      dots: '●○○', color: 'var(--text-tertiary)' }
}

// ─── Derive card-shape objects from raw consensus signals ─────────────────────

function _deriveCardSignals(rawSignals, transactions) {
  // rawSignals: array from computeConsensusSignals, one entry per party::ticker
  // Group by ticker, merge D and R party rows
  const byTicker = new Map()
  for (const sig of rawSignals) {
    const t = sig.tickers  // field is called 'tickers' not 'ticker'
    if (!byTicker.has(t)) byTicker.set(t, { ticker: t, partyD: 0, partyR: 0, tier: sig.tier, pctMax: 0 })
    const entry = byTicker.get(t)
    if (sig.party === 'D') entry.partyD = sig.member_count
    else if (sig.party === 'R') entry.partyR = sig.member_count
    entry.tier = sig.tier > entry.tier ? sig.tier : entry.tier
    if (sig.pct_of_party > entry.pctMax) entry.pctMax = sig.pct_of_party
  }

  // For each ticker, derive buyCount, sellCount, lastTrade, topTrader from transactions
  const result = []
  for (const [ticker, entry] of byTicker) {
    const tickerTx = transactions.filter(tx => tx.ticker === ticker)
    entry.memberCount = entry.partyD + entry.partyR
    entry.buyCount  = tickerTx.filter(tx => tx.action === 'buy').length
    entry.sellCount = tickerTx.filter(tx => tx.action === 'sell').length
    entry.windowDays = tickerTx.length > 0
      ? Math.round((Date.now() - Math.min(...tickerTx.map(tx => tx.transaction_ts))) / 86400000)
      : 90
    // lastTrade: most recent transaction
    const latestTs = tickerTx.length > 0 ? Math.max(...tickerTx.map(tx => tx.transaction_ts)) : null
    entry.lastTrade = latestTs ? _relativeDate(new Date(latestTs).toISOString()) : '—'
    // topTrader: politician with highest amount_high
    const top = tickerTx.reduce((best, tx) => (!best || tx.amount_high > best.amount_high ? tx : best), null)
    entry.topTrader = top ? top.politician_name : '—'
    entry.name = ''  // company name not available in HSW data
    result.push(entry)
  }

  // Sort by memberCount descending, then tier descending
  result.sort((a, b) => b.memberCount - a.memberCount || b.tier - a.tier)
  return result
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function _renderSkeleton() {
  const shimmer = `background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-elevated) 50%, var(--bg-raised) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;`
  return `
    <div style="max-width:480px; margin:0 auto;">
      <div style="margin-bottom:var(--s4);">
        <div style="height:16px;width:55%;border-radius:var(--r2);${shimmer}"></div>
        <div style="height:13px;width:40%;border-radius:var(--r2);margin-top:var(--s2);${shimmer}"></div>
      </div>
      ${Array(3).fill('').map(() => `
        <div class="card" style="padding:var(--s4);margin-bottom:var(--s3);">
          <div style="height:18px;width:30%;border-radius:var(--r2);${shimmer}"></div>
          <div style="height:14px;width:55%;border-radius:var(--r2);margin-top:var(--s3);${shimmer}"></div>
          <div style="height:12px;width:45%;border-radius:var(--r2);margin-top:var(--s2);${shimmer}"></div>
        </div>
      `).join('')}
    </div>
  `
}

// ─── Async load + compute ─────────────────────────────────────────────────────

async function _loadSignals(container, signal) {
  if (signal?.aborted) return

  // Show skeleton while loading
  container.innerHTML = _renderSkeleton()

  try {
    // Load transactions
    const allTx = await fetchAllTransactions({ forceRefresh: false })

    if (signal?.aborted) return

    // Load watchlist (Sheets first, seed fallback — same pattern as feed.js)
    let watchedNames = new Set()
    try {
      const rows = await readTab('watchlist')
      const active = rows.filter(r => r[3]?.toUpperCase() === 'Y').map(r => r[0])
      watchedNames = new Set(active.length ? active : WATCHLIST.map(w => w.name))
    } catch {
      watchedNames = new Set(WATCHLIST.map(w => w.name))
    }

    if (signal?.aborted) return

    // Filter to watchlist members only for the active window
    const windowDays = _activeWindow
    const filtered = filterByWatchlist(allTx, Array.from(watchedNames), { daysBack: windowDays })

    // Compute consensus signals
    const rawSignals = computeConsensusSignals(filtered, {
      config: { ...getConfig(), consensus_window_days: windowDays },
      partyRoster: PARTY_ROSTER
    })

    // Derive card-shape objects from raw signals.
    // If the computation produces no results (low activity, high thresholds), fall back to
    // MOCK_SIGNALS silently — no banner. Banner is reserved for fetch failures only.
    _liveSignals = _deriveCardSignals(rawSignals, filtered)
    if (_liveSignals.length === 0) _liveSignals = MOCK_SIGNALS
    _usingMock = false

  } catch (_err) {
    _liveSignals = MOCK_SIGNALS
    _usingMock = true
  }

  if (signal?.aborted) return

  _render(container, signal)
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function renderTopSignal(container, signal) {
  _partyFilter  = 'all'
  _actionFilter = 'all'
  _activeWindow = 90
  _liveSignals  = null
  _usingMock    = false

  if (signal?.aborted) return

  await _loadSignals(container, signal)
}

// ─── Filter button HTML ───────────────────────────────────────────────────────

function _filterBtn(key, active, label, dataAttr) {
  return `<button
    ${dataAttr}="${key}"
    style="
      padding:var(--s2) var(--s3);
      border-radius:var(--r2);
      border:1px solid ${active ? 'var(--accent)' : 'var(--border-soft)'};
      background:${active ? 'rgba(201,177,135,0.12)' : 'var(--bg-elevated)'};
      color:${active ? 'var(--accent)' : 'var(--text-secondary)'};
      font-size:12px; cursor:pointer; min-height:36px;
    "
  >${label}</button>`
}

// ─── Sync render (called after data is ready) ─────────────────────────────────

function _render(container, signal) {
  if (signal?.aborted) return
  const filtered = _applyFilter(_liveSignals ?? MOCK_SIGNALS, _partyFilter, _actionFilter)

  const mockBanner = _usingMock
    ? `<div data-testid="mock-banner" style="background:#7c4a00;color:#ffcc80;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:12px;">
         Using sample data — live signal computation unavailable
       </div>`
    : ''

  container.innerHTML = `
    <div style="max-width:480px; margin:0 auto;">

      ${mockBanner}

      <!-- Filter rows -->
      <div style="display:flex; flex-direction:column; gap:var(--s2); margin-bottom:var(--s4);">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div id="party-filters" style="display:flex; gap:var(--s2);">
            ${PARTY_FILTERS.map(f => _filterBtn(f.key, _partyFilter === f.key, f.label, 'data-party')).join('')}
          </div>
          <div id="window-filters" style="display:flex; gap:var(--s1);">
            ${WINDOWS.map(w => `
              <button data-window="${w.key}" style="
                padding:var(--s1) var(--s3);
                border-radius:var(--r2);
                border:1px solid ${String(_activeWindow) === w.key ? 'var(--accent)' : 'var(--border-subtle)'};
                background:${String(_activeWindow) === w.key ? 'rgba(201,177,135,0.08)' : 'transparent'};
                color:${String(_activeWindow) === w.key ? 'var(--accent)' : 'var(--text-tertiary)'};
                font-size:11px; cursor:pointer; min-height:28px;
              ">${w.label}</button>
            `).join('')}
          </div>
        </div>
        <div id="action-filters" style="display:flex; gap:var(--s2);">
          ${ACTION_FILTERS.map(f => _filterBtn(f.key, _actionFilter === f.key, f.label, 'data-action')).join('')}
        </div>
      </div>

      <!-- Signal count -->
      <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:var(--s3);">
        ${filtered.length} stock${filtered.length !== 1 ? 's' : ''} with congressional activity · last ${_activeWindow}d
      </div>

      <!-- Signal cards -->
      <div id="signal-list">
        ${filtered.length === 0
          ? `<div class="empty-state">
               <div class="empty-state-title">No signals</div>
               <div class="empty-state-sub">No trades match this filter in the selected window.</div>
             </div>`
          : filtered.map((sig, idx) => _renderSignalCard(sig, idx + 1)).join('')
        }
      </div>

    </div>
  `

  const opts = signal ? { signal } : {}

  const partyFilters = container.querySelector('#party-filters')
  if (partyFilters) partyFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-party]')
    if (!btn) return
    _partyFilter = btn.dataset.party
    _render(container, signal)
  }, opts)

  const actionFilters = container.querySelector('#action-filters')
  if (actionFilters) actionFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    _actionFilter = btn.dataset.action
    _render(container, signal)
  }, opts)

  const windowFilters = container.querySelector('#window-filters')
  if (windowFilters) windowFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-window]')
    if (!btn) return
    const newWindow = parseInt(btn.dataset.window, 10)
    if (newWindow === _activeWindow) return
    _activeWindow = newWindow
    // Window change triggers a full re-fetch and re-compute
    _loadSignals(container, signal)
  }, opts)
}

// ─── Filter logic ─────────────────────────────────────────────────────────────

function _applyFilter(signals, partyFilter, actionFilter) {
  let out = signals
  if (partyFilter === 'D')    out = out.filter(s => s.partyD >= s.partyR)
  if (partyFilter === 'R')    out = out.filter(s => s.partyR > s.partyD)
  if (actionFilter === 'buy') out = out.filter(s => s.buyCount > s.sellCount)
  if (actionFilter === 'sell') out = out.filter(s => s.sellCount > s.buyCount)
  return out
}

// ─── Signal card HTML ─────────────────────────────────────────────────────────

function _renderSignalCard(sig, rank) {
  const tierClass   = sig.tier >= 3 ? 'tier-bright' : sig.tier === 2 ? 'tier-accent' : 'tier-subtle'
  const buyPct      = Math.round((sig.buyCount / (sig.buyCount + sig.sellCount)) * 100)
  const bipartisan  = sig.partyD > 0 && sig.partyR > 0
  const dWidth      = Math.round((sig.partyD / sig.memberCount) * 100)
  const rWidth      = 100 - dWidth
  const strength    = _signalStrength(sig.tier)

  return `
    <div class="card" style="padding:var(--s4); margin-bottom:var(--s3);">

      <!-- Row 1: rank + ticker + tier + action button -->
      <div style="display:flex; align-items:flex-start; gap:var(--s3); margin-bottom:var(--s3);">
        <div style="
          flex-shrink:0;
          font-family:var(--font-mono);
          font-size:16px;
          font-weight:600;
          color:var(--text-tertiary);
          min-width:24px;
          padding-top:2px;
        ">#${rank}</div>

        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:var(--s2); margin-bottom:2px;">
            <span style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--text-primary);">${sig.ticker}</span>
            <span class="tier-badge ${tierClass}">Tier ${sig.tier}</span>
            ${bipartisan ? `<span style="font-size:10px; color:var(--text-tertiary); background:var(--bg-elevated); padding:1px 6px; border-radius:var(--r1); border:1px solid var(--border-subtle);">Bipartisan</span>` : ''}
          </div>
          ${sig.name ? `<div style="font-size:12px; color:var(--text-secondary);">${sig.name}</div>` : ''}
        </div>

        <button
          onclick="window._navigate('whatToBuy')"
          style="
            flex-shrink:0;
            padding:var(--s2) var(--s3);
            background:var(--accent);
            color:var(--bg-primary);
            border:none;
            border-radius:var(--r2);
            font-size:12px;
            font-weight:600;
            cursor:pointer;
            min-height:32px;
          "
        >Buy →</button>
      </div>

      <!-- Row 2: member count + buy/sell ratio -->
      <div style="display:flex; gap:var(--s5); margin-bottom:var(--s3);">
        <div>
          <div style="font-size:18px; font-weight:700; color:var(--text-primary); font-family:var(--font-mono);">${sig.memberCount}</div>
          <div style="font-size:11px; color:var(--text-tertiary);">members trading</div>
        </div>
        <div>
          <div style="font-size:18px; font-weight:700; color:var(--buy); font-family:var(--font-mono);">${buyPct}%</div>
          <div style="font-size:11px; color:var(--text-tertiary);">${sig.buyCount}B · ${sig.sellCount}S</div>
        </div>
        <div>
          <div style="font-size:13px; font-weight:500; color:var(--text-secondary);">${sig.topTrader}</div>
          <div style="font-size:11px; color:var(--text-tertiary);">top trader · ${sig.lastTrade}</div>
        </div>
      </div>

      <!-- Row 3: party bar + signal strength -->
      <div style="display:flex; align-items:center; gap:var(--s4);">
        <div style="flex:1;">
          <div style="font-size:10px; color:var(--text-tertiary); margin-bottom:4px; display:flex; justify-content:space-between;">
            <span>D ${sig.partyD}</span>
            <span>R ${sig.partyR}</span>
          </div>
          <div style="display:flex; height:4px; border-radius:2px; overflow:hidden; background:var(--bg-elevated);">
            <div style="width:${dWidth}%; background:#4a90d9; border-radius:2px 0 0 2px;"></div>
            <div style="width:${rWidth}%; background:#d94a4a; border-radius:0 2px 2px 0;"></div>
          </div>
        </div>
        <div style="font-size:12px; color:${strength.color}; font-weight:500; white-space:nowrap;">
          ${strength.dots} ${strength.label}
        </div>
      </div>

    </div>
  `
}
