/**
 * Top Signal view — stocks ranked by congressional trading activity.
 * Shows which tickers members are trading, party breakdown, buy/sell ratio.
 * Phase 1: mock data.
 */

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
]

const FILTERS = [
  { key: 'all',  label: 'All' },
  { key: 'D',    label: 'Democrat' },
  { key: 'R',    label: 'Republican' },
  { key: 'buy',  label: 'Buys only' },
]

const WINDOWS = [
  { key: '14', label: '14d' },
  { key: '30', label: '30d' },
  { key: '90', label: '90d' },
]

let _activeFilter = 'all'
let _activeWindow = '14'

export function renderTopSignal(container) {
  _render(container)
}

function _render(container) {
  const filtered = _applyFilter(MOCK_SIGNALS, _activeFilter)

  container.innerHTML = `
    <div style="max-width:480px; margin:0 auto;">

      <!-- Filter bar -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s4);">
        <div id="party-filters" style="display:flex; gap:var(--s2); flex-wrap:wrap;">
          ${FILTERS.map(f => `
            <button
              data-filter="${f.key}"
              style="
                padding:var(--s2) var(--s3);
                border-radius:var(--r2);
                border:1px solid ${_activeFilter === f.key ? 'var(--accent)' : 'var(--border-soft)'};
                background:${_activeFilter === f.key ? 'rgba(201,177,135,0.12)' : 'var(--bg-elevated)'};
                color:${_activeFilter === f.key ? 'var(--accent)' : 'var(--text-secondary)'};
                font-size:12px;
                cursor:pointer;
                min-height:32px;
              "
            >${f.label}</button>
          `).join('')}
        </div>
        <div id="window-filters" style="display:flex; gap:var(--s1);">
          ${WINDOWS.map(w => `
            <button
              data-window="${w.key}"
              style="
                padding:var(--s1) var(--s3);
                border-radius:var(--r2);
                border:1px solid ${_activeWindow === w.key ? 'var(--accent)' : 'var(--border-subtle)'};
                background:${_activeWindow === w.key ? 'rgba(201,177,135,0.08)' : 'transparent'};
                color:${_activeWindow === w.key ? 'var(--accent)' : 'var(--text-tertiary)'};
                font-size:11px;
                cursor:pointer;
                min-height:28px;
              "
            >${w.label}</button>
          `).join('')}
        </div>
      </div>

      <!-- Signal count -->
      <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:var(--s3);">
        ${filtered.length} stock${filtered.length !== 1 ? 's' : ''} with congressional activity · last ${_activeWindow} days
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

  container.querySelector('#party-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]')
    if (!btn) return
    _activeFilter = btn.dataset.filter
    _render(container)
  })

  container.querySelector('#window-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-window]')
    if (!btn) return
    _activeWindow = btn.dataset.window
    _render(container)
  })
}

function _applyFilter(signals, filter) {
  if (filter === 'all')  return signals
  if (filter === 'buy')  return signals.filter(s => s.buyCount > s.sellCount)
  if (filter === 'D')    return signals.filter(s => s.partyD >= s.partyR)
  if (filter === 'R')    return signals.filter(s => s.partyR > s.partyD)
  return signals
}

function _renderSignalCard(sig, rank) {
  const tierClass   = sig.tier >= 3 ? 'tier-bright' : sig.tier === 2 ? 'tier-accent' : 'tier-subtle'
  const buyPct      = Math.round((sig.buyCount / (sig.buyCount + sig.sellCount)) * 100)
  const bipartisan  = sig.partyD > 0 && sig.partyR > 0
  const dWidth      = Math.round((sig.partyD / sig.memberCount) * 100)
  const rWidth      = 100 - dWidth

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
          <div style="font-size:12px; color:var(--text-secondary);">${sig.name}</div>
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

      <!-- Row 3: party bar -->
      <div>
        <div style="font-size:10px; color:var(--text-tertiary); margin-bottom:4px; display:flex; justify-content:space-between;">
          <span>D ${sig.partyD}</span>
          <span>R ${sig.partyR}</span>
        </div>
        <div style="display:flex; height:4px; border-radius:2px; overflow:hidden; background:var(--bg-elevated);">
          <div style="width:${dWidth}%; background:#4a90d9; border-radius:2px 0 0 2px;"></div>
          <div style="width:${rWidth}%; background:#d94a4a; border-radius:0 2px 2px 0;"></div>
        </div>
      </div>

    </div>
  `
}
