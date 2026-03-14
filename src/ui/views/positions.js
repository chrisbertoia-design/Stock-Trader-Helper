/**
 * Positions view — mock-only for Phase 1.
 * Shows hardcoded position data. No API or store imports.
 * CSV upload button shows a toast — real upload available in Phase 2.
 */

import { showToast } from '../components/toast.js'

const CAT = 'POSITIONS_VIEW'

const MOCK_POSITIONS = {
  NVDA: { ticker: 'NVDA', quantity: 15,  avg_cost: 186.50, mkt_value: 2800.00, gain_loss: 2.50,   gain_loss_pct: 0.09 },
  AAPL: { ticker: 'AAPL', quantity: 25,  avg_cost: 168.00, mkt_value: 4200.00, gain_loss: 0.00,   gain_loss_pct: 0.00 },
  MSFT: { ticker: 'MSFT', quantity: 10,  avg_cost: 380.00, mkt_value: 4150.00, gain_loss: 350.00, gain_loss_pct: 9.21 },
  AMD:  { ticker: 'AMD',  quantity: 20,  avg_cost: 120.00, mkt_value: 2600.00, gain_loss: 200.00, gain_loss_pct: 8.33 },
  TSM:  { ticker: 'TSM',  quantity: 12,  avg_cost: 140.00, mkt_value: 1860.00, gain_loss: 180.00, gain_loss_pct: 10.71 },
  GOOGL:{ ticker: 'GOOGL', quantity: 8,  avg_cost: 155.00, mkt_value: 1320.00, gain_loss: 80.00,  gain_loss_pct: 6.45 },
}

function _getMockSummary() {
  const entries = Object.values(MOCK_POSITIONS)
  let account_total = 0
  let total_gl      = 0

  for (const p of entries) {
    account_total += p.mkt_value
    total_gl      += p.gain_loss
  }

  const cost_basis   = account_total - total_gl
  const total_gl_pct = cost_basis !== 0 ? (total_gl / cost_basis) * 100 : 0

  return {
    account_total: +account_total.toFixed(2),
    total_gl_pct:  +total_gl_pct.toFixed(2),
    position_count: entries.length,
    cash: 0,
  }
}

export async function renderPositions(container) {
  const positions = MOCK_POSITIONS
  const summary   = _getMockSummary()

  const sortedTickers = Object.keys(positions).sort((a, b) => {
    return (positions[b].mkt_value || 0) - (positions[a].mkt_value || 0)
  })

  container.innerHTML = `
    <div class="positions-header" style="margin-bottom:var(--s5);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--s4);">
        <div>
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1);">My Positions</h2>
          <div style="font-size:12px; color:var(--text-tertiary);">
            Schwab Account · sample data
          </div>
          <div style="font-size:11px; color:var(--accent); margin-top:4px;">Using sample data — upload CSV to see real positions</div>
        </div>
        <label class="btn btn-ghost" style="cursor:pointer; font-size:12px;" id="csv-upload-label">
          Upload CSV
          <input type="file" accept=".csv" id="csv-upload" style="display:none" />
        </label>
      </div>

      <div class="stat-row">
        <div class="stat">
          <span class="stat-value">$${summary.account_total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
          <span class="stat-label">Account Total</span>
        </div>
        <div class="stat">
          <span class="stat-value" style="color:${summary.total_gl_pct >= 0 ? 'var(--buy)' : 'var(--sell)'}">
            ${summary.total_gl_pct >= 0 ? '+' : ''}${summary.total_gl_pct.toFixed(2)}
          </span>
          <span class="stat-label">Total G/L</span>
        </div>
        <div class="stat">
          <span class="stat-value">${summary.position_count}</span>
          <span class="stat-label">Positions</span>
        </div>
        <div class="stat">
          <span class="stat-value">$${summary.cash.toFixed(2)}</span>
          <span class="stat-label">Cash</span>
        </div>
      </div>
    </div>

    <div id="positions-list">
      ${sortedTickers.map(ticker => _renderPositionRow(positions[ticker])).join('')}
    </div>
  `

  // CSV upload — show Phase 2 toast instead of actual upload
  document.getElementById('csv-upload').addEventListener('change', () => {
    showToast('CSV upload available in Phase 2')
    // Reset the input so the same file can be selected again
    document.getElementById('csv-upload').value = ''
  })
}

function _renderPositionRow(pos) {
  const mktVal = pos.mkt_value ?? 0
  const qty    = pos.quantity ?? 0
  const glPct  = pos.gain_loss_pct ?? 0
  const glPos  = glPct >= 0

  return `
    <div class="card" style="padding:var(--s4);">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <span style="font-family:var(--font-mono); font-size:15px; font-weight:600;">${pos.ticker}</span>
          <span style="font-size:12px; color:var(--text-tertiary); margin-left:var(--s2);">${qty} shares</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px; font-weight:500;">${mktVal ? '$' + mktVal.toFixed(2) : '—'}</div>
          ${glPct !== 0 ? `<div style="font-size:11px; color:${glPos ? 'var(--buy)' : 'var(--sell)'}">
            ${glPos ? '+' : ''}${glPct.toFixed(2)}
          </div>` : ''}
        </div>
      </div>
      ${pos.avg_cost ? `<div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">avg cost $${pos.avg_cost.toFixed(2)}</div>` : ''}
    </div>
  `
}
