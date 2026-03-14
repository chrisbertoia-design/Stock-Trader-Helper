/**
 * Positions view.
 * Shows current Schwab holdings + last update date.
 * CSV upload button → parses and saves to Sheets.
 */

import { parseTransactionsCsv, derivePositions, parsePositionsCsv }
  from '../../services/schwabParser.js'
import { appendRows, getSpreadsheetId, clearTab } from '../../api/googleSheets.js'
import { info, warn }             from '../../services/logger.js'
import { showToast }              from '../components/toast.js'
import { getPositions, setPositions, loadPositions, isLoaded, getPositionsSummary }
  from '../../stores/positions.js'

const CAT = 'POSITIONS_VIEW'

export async function renderPositions(container) {
  info(CAT, 'renderPositions()')

  // Load positions if not already loaded
  if (!isLoaded()) {
    try {
      await loadPositions()
    } catch (e) {
      warn(CAT, 'loadPositions failed', e.message)
    }
  }

  // Get positions from store
  const positions = getPositions()
  const summary = getPositionsSummary()
  const usingMock = !isLoaded() || Object.keys(positions).length === 0

  const lastUpdate = Object.values(positions)[0]?.last_csv_upload || null

  const sortedTickers = Object.keys(positions).sort((a, b) => {
    return (positions[b].mkt_val || positions[b].mkt_value || 0) - (positions[a].mkt_val || positions[a].mkt_value || 0)
  })

  container.innerHTML = `
    <div class="positions-header" style="margin-bottom:var(--s5);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--s4);">
        <div>
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1);">My Positions</h2>
          <div style="font-size:12px; color:var(--text-tertiary);">
            Schwab Account ·
            ${lastUpdate ? `updated ${lastUpdate}` : 'no data yet'}
          </div>
          ${usingMock || Object.keys(positions).length === 0 ? `<div style="font-size:11px; color:var(--accent); margin-top:4px;">Using sample data — upload CSV to see real positions</div>` : ''}
        </div>
        <label class="btn btn-ghost" style="cursor:pointer; font-size:12px;">
          Upload CSV
          <input type="file" accept=".csv" id="csv-upload" style="display:none" />
        </label>
      </div>

      <div class="stat-row">
        <div class="stat">
          <span class="stat-value">$${(summary?.account_total || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
          <span class="stat-label">Account Total</span>
        </div>
        <div class="stat">
          <span class="stat-value" style="color:${(summary?.total_gl_pct||0) >= 0 ? 'var(--buy)' : 'var(--sell)'}">
            ${(summary?.total_gl_pct||0) >= 0 ? '+' : ''}${(summary?.total_gl_pct||0).toFixed(2)}%
          </span>
          <span class="stat-label">Total G/L</span>
        </div>
        <div class="stat">
          <span class="stat-value">${summary?.position_count || sortedTickers.length}</span>
          <span class="stat-label">Positions</span>
        </div>
        <div class="stat">
          <span class="stat-value">$${(summary?.cash||0).toFixed(2)}</span>
          <span class="stat-label">Cash</span>
        </div>
      </div>
    </div>

    <div id="positions-list">
      ${sortedTickers.map(ticker => _renderPositionRow(positions[ticker])).join('')}
    </div>
  `

  // CSV upload handler
  document.getElementById('csv-upload').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await _handleCsvUpload(file, container)
  })
}

function _renderPositionRow(pos) {
  const mktVal = pos.mkt_val ?? pos.mkt_value ?? 0
  const qty    = pos.qty ?? pos.quantity ?? 0
  const glPct  = pos.gl_pct ?? pos.gain_loss_pct ?? 0
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
            ${glPos ? '+' : ''}${glPct.toFixed(2)}%
          </div>` : ''}
        </div>
      </div>
      ${pos.avg_cost ? `<div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">avg cost $${pos.avg_cost.toFixed(2)}</div>` : ''}
    </div>
  `
}

async function _handleCsvUpload(file, container) {
  info(CAT, `CSV upload: ${file.name} (${(file.size/1024).toFixed(1)}KB)`)
  const text = await file.text()

  try {
    let positions

    // Detect if it's a transactions or positions export by filename/content
    if (file.name.toLowerCase().includes('transaction') || text.toLowerCase().includes('action')) {
      const txs = parseTransactionsCsv(text)
      positions  = derivePositions(txs)
      info(CAT, `Parsed transactions → derived ${Object.keys(positions).length} positions`)
    } else {
      positions = parsePositionsCsv(text)
      info(CAT, `Parsed positions export: ${Object.keys(positions).length} positions`)
    }

    // Replace not append — clear existing data rows first
    try {
      await clearTab('my_positions')
    } catch (e) {
      warn(CAT, 'clearTab failed', e.message)
    }

    // Write to Sheets my_positions tab
    const rows = Object.values(positions).map(p => [
      p.ticker, p.quantity, p.avg_cost, p.mkt_value,
      p.gain_loss, p.gain_loss_pct, p.last_csv_upload, p.source
    ])
    await appendRows('my_positions', rows)

    // Update store immediately after successful upload
    setPositions(positions)

    showToast(`Imported ${rows.length} positions from ${file.name}`)
    await renderPositions(container)
  } catch (e) {
    warn(CAT, 'CSV parse failed', e.message)
    showToast(`Parse error: ${e.message}`)
  }
}
