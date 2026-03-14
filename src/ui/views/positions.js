/**
 * Positions view.
 * Shows current Schwab holdings + last update date.
 * CSV upload button → parses and saves to Sheets.
 */

import { parseTransactionsCsv, derivePositions, parsePositionsCsv }
  from '../../services/schwabParser.js'
import { readTab, appendRows }    from '../../api/googleSheets.js'
import { info, warn }             from '../../services/logger.js'
import { showToast }              from '../components/toast.js'
import { MOCK_POSITIONS, MOCK_LAST_UPDATE, MOCK_ACCOUNT } from '../../data/mockPositions.js'

const CAT = 'POSITIONS_VIEW'

export async function renderPositions(container) {
  info(CAT, 'renderPositions()')

  // Try loading from Sheets first
  let positions = {}
  let lastUpdate = null
  let account    = null
  let fromSheets = false

  try {
    const rows = await readTab('my_positions')
    if (rows.length > 0) {
      fromSheets = true
      for (const row of rows) {
        const ticker = row[0]
        if (!ticker) continue
        positions[ticker] = {
          ticker,
          quantity:       parseFloat(row[1]) || 0,
          avg_cost:       parseFloat(row[2]) || 0,
          mkt_value:      parseFloat(row[3]) || 0,
          gain_loss:      parseFloat(row[4]) || 0,
          gain_loss_pct:  parseFloat(row[5]) || 0,
          last_csv_upload: row[6] || '',
          source:          row[7] || 'schwab_csv'
        }
      }
      lastUpdate = Object.values(positions)[0]?.last_csv_upload || null
      info(CAT, `Loaded ${Object.keys(positions).length} positions from Sheets`)
    }
  } catch (e) {
    warn(CAT, 'Could not load positions from Sheets', e.message)
  }

  // Fall back to mock data
  if (!fromSheets || Object.keys(positions).length === 0) {
    positions  = MOCK_POSITIONS
    lastUpdate = MOCK_LAST_UPDATE
    account    = MOCK_ACCOUNT
    info(CAT, 'Using mock positions data')
  }

  const sortedTickers = Object.keys(positions).sort((a, b) => {
    return (positions[b].mkt_value || 0) - (positions[a].mkt_value || 0)
  })

  const totalValue = sortedTickers.reduce((sum, t) => sum + (positions[t].mkt_value || 0), 0)

  container.innerHTML = `
    <div class="positions-header" style="margin-bottom:var(--s5);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--s4);">
        <div>
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1);">My Positions</h2>
          <div style="font-size:12px; color:var(--text-tertiary);">
            ${account || 'Schwab Account'} ·
            ${lastUpdate ? `updated ${lastUpdate}` : 'no data yet'}
          </div>
          ${!fromSheets ? `<div style="font-size:11px; color:var(--accent); margin-top:4px;">Using sample data — upload CSV to see real positions</div>` : ''}
        </div>
        <label class="btn btn-ghost" style="cursor:pointer; font-size:12px;">
          Upload CSV
          <input type="file" accept=".csv" id="csv-upload" style="display:none" />
        </label>
      </div>

      <div class="stat-row">
        <div class="stat">
          <span class="stat-value">$${totalValue.toFixed(2)}</span>
          <span class="stat-label">Total Value</span>
        </div>
        <div class="stat">
          <span class="stat-value">${sortedTickers.length}</span>
          <span class="stat-label">Positions</span>
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
  const gl    = pos.gain_loss || 0
  const glPct = pos.gain_loss_pct || 0
  const glPos = gl >= 0

  return `
    <div class="card" style="padding:var(--s4);">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <span style="font-family:var(--font-mono); font-size:15px; font-weight:600;">${pos.ticker}</span>
          <span style="font-size:12px; color:var(--text-tertiary); margin-left:var(--s2);">${pos.quantity} shares</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px; font-weight:500;">${pos.mkt_value ? '$' + pos.mkt_value.toFixed(2) : '—'}</div>
          ${gl !== 0 ? `<div style="font-size:11px; color:${glPos ? 'var(--buy)' : 'var(--sell)'}">
            ${glPos ? '+' : ''}$${gl.toFixed(2)} (${glPos ? '+' : ''}${glPct.toFixed(1)}%)
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

    // Write to Sheets my_positions tab
    const rows = Object.values(positions).map(p => [
      p.ticker, p.quantity, p.avg_cost, p.mkt_value,
      p.gain_loss, p.gain_loss_pct, p.last_csv_upload, p.source
    ])
    await appendRows('my_positions', rows)

    showToast(`Imported ${rows.length} positions from ${file.name}`)
    await renderPositions(container)
  } catch (e) {
    warn(CAT, 'CSV parse failed', e.message)
    showToast(`Parse error: ${e.message}`)
  }
}
