/**
 * Positions view — wired to real position data from stores/positions.
 * CSV upload parses Schwab exports and writes to Google Sheets my_positions tab.
 */

import { loadPositions, getPositions, getPositionsSummary, setPositions } from '../../stores/positions.js'
import { parsePositionsCsv, parseTransactionsCsv, derivePositions }      from '../../services/schwabParser.js'
import { clearTab, appendRows, getSpreadsheetId }                        from '../../api/googleSheets.js'
import { debug, info, warn, error }                                      from '../../services/logger.js'
import { showToast }                                                     from '../components/toast.js'
import { ACCOUNT_SUMMARY }                                               from '../../data/mockPositions.js'

const CAT = 'POSITIONS_VIEW'

// ─── Formatting helpers ──────────────────────────────────────────────────────

function _fmtDollars(n) {
  return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function _fmtQty(qty) {
  if (qty == null) return '0'
  if (qty < 1) return qty.toFixed(4)
  if (Number.isInteger(qty)) return String(qty)
  // Check if it's effectively a whole number (e.g. 5.0000)
  if (Math.abs(qty - Math.round(qty)) < 0.00005) return String(Math.round(qty))
  return qty.toFixed(4)
}

function _fmtGlPct(pct) {
  const sign = pct >= 0 ? '+' : ''
  return sign + pct.toFixed(2) + '%'
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function _renderSkeleton() {
  const shimmer = `background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-elevated) 50%, var(--bg-raised) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;`
  return `
    <style>
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    </style>
    <div style="margin-bottom:var(--s5);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--s4);">
        <div>
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1);">My Positions</h2>
          <div style="font-size:12px; color:var(--text-tertiary);">Loading positions...</div>
        </div>
      </div>
    </div>
    ${Array(5).fill('').map(() => `
      <div class="card" style="padding:var(--s4);">
        <div style="height:20px; width:60%; border-radius:var(--r2); ${shimmer}"></div>
        <div style="height:14px; width:40%; border-radius:var(--r2); margin-top:var(--s2); ${shimmer}"></div>
      </div>
    `).join('')}
  `
}

// ─── Position card ───────────────────────────────────────────────────────────

function _renderPositionCard(pos) {
  const isCash = pos.ticker === 'CASH' || pos.ticker === '$'
  const mktVal = pos.mkt_value ?? 0
  const qty    = pos.quantity ?? 0
  const glPct  = pos.gain_loss_pct ?? 0
  const glPos  = glPct >= 0

  if (isCash) {
    return `
      <div class="card" style="padding:var(--s4); border-left:3px solid var(--accent);">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <span style="font-family:var(--font-mono); font-size:15px; font-weight:600; color:var(--accent);">CASH</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px; font-weight:500;">${_fmtDollars(mktVal)}</div>
          </div>
        </div>
      </div>
    `
  }

  return `
    <div class="card" style="padding:var(--s4);">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <span style="font-family:var(--font-mono); font-size:15px; font-weight:600;">${pos.ticker}</span>
          <span style="font-size:12px; color:var(--text-tertiary); margin-left:var(--s2);">${_fmtQty(qty)} shares</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px; font-weight:500;">${mktVal ? _fmtDollars(mktVal) : '—'}</div>
          ${glPct !== 0 ? `<div style="font-size:11px; color:${glPos ? 'var(--buy)' : 'var(--sell)'}">
            ${_fmtGlPct(glPct)}
          </div>` : ''}
        </div>
      </div>
      ${pos.avg_cost ? `<div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">avg cost ${_fmtDollars(pos.avg_cost)}</div>` : ''}
    </div>
  `
}

// ─── CSV upload handler ──────────────────────────────────────────────────────

function _wireUpload(container) {
  const input = container.querySelector('#csv-upload')
  if (!input) return

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    debug(CAT, `CSV file selected: ${file.name} (${file.size} bytes)`)

    // Show parsing state
    const uploadLabel = container.querySelector('#csv-upload-label')
    const originalText = uploadLabel?.childNodes?.[0]?.textContent
    if (uploadLabel) {
      uploadLabel.childNodes[0].textContent = 'Parsing CSV...'
      uploadLabel.style.pointerEvents = 'none'
      uploadLabel.style.opacity = '0.5'
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const csvText = ev.target.result
      let parsed = null

      try {
        // Try positions export first
        try {
          parsed = parsePositionsCsv(csvText)
          if (!parsed || Object.keys(parsed).length === 0) {
            parsed = null
            throw new Error('No positions found in positions CSV')
          }
          info(CAT, `Parsed positions CSV — ${Object.keys(parsed).length} tickers`)
        } catch (posErr) {
          // Fall back to transactions export
          debug(CAT, `Positions parse failed (${posErr.message}), trying transactions format`)
          const transactions = parseTransactionsCsv(csvText)
          parsed = derivePositions(transactions)
          if (!parsed || Object.keys(parsed).length === 0) {
            throw new Error('No positions derived from transactions CSV')
          }
          info(CAT, `Derived ${Object.keys(parsed).length} positions from transactions CSV`)
        }

        // Update in-memory store
        setPositions(parsed)

        // Persist to Sheets if connected
        if (getSpreadsheetId()) {
          try {
            await clearTab('my_positions')
            const rows = Object.values(parsed).map(p => [
              p.ticker,
              p.quantity,
              p.avg_cost,
              p.mkt_value,
              p.gain_loss,
              p.gain_loss_pct,
              p.last_csv_upload,
              p.source
            ])
            await appendRows('my_positions', rows)
            info(CAT, `Wrote ${rows.length} positions to Sheets my_positions tab`)
          } catch (sheetsErr) {
            warn(CAT, `Sheets write failed (${sheetsErr.message}) — positions updated in-memory only`)
            showToast('Positions loaded but Sheets save failed — will retry next time')
          }
        } else {
          debug(CAT, 'No spreadsheetId — skipping Sheets write')
        }

        const count = Object.keys(parsed).length
        showToast(`Positions updated — ${count} tickers loaded`, 'success')

        // Re-render the view with new data
        await renderPositions(container)

      } catch (err) {
        error(CAT, `CSV parse failed: ${err.message}`, err)
        showToast('Could not parse CSV — try a Schwab positions export', 'error')

        // Restore upload button
        if (uploadLabel) {
          uploadLabel.childNodes[0].textContent = originalText || 'Upload CSV'
          uploadLabel.style.pointerEvents = ''
          uploadLabel.style.opacity = ''
        }
      }

      // Reset the input so the same file can be selected again
      input.value = ''
    }

    reader.onerror = () => {
      error(CAT, 'FileReader error reading CSV')
      showToast('Could not read file', 'error')
      if (uploadLabel) {
        uploadLabel.childNodes[0].textContent = originalText || 'Upload CSV'
        uploadLabel.style.pointerEvents = ''
        uploadLabel.style.opacity = ''
      }
      input.value = ''
    }

    reader.readAsText(file)
  })
}

// ─── Main render ─────────────────────────────────────────────────────────────

export async function renderPositions(container) {
  // Show loading skeleton immediately
  container.innerHTML = _renderSkeleton()

  // Load positions (from Sheets or mock fallback)
  try {
    await loadPositions()
  } catch (err) {
    warn(CAT, `loadPositions failed: ${err.message}`)
  }

  const positions = getPositions()
  const summary   = getPositionsSummary()

  // Check if we're using mock data
  const isMock = Object.values(positions).some(p => p.source === 'mock')

  // Sort by market value descending, but put cash at the end
  const sortedPositions = Object.values(positions).sort((a, b) => {
    const aCash = a.ticker === 'CASH' || a.ticker === '$'
    const bCash = b.ticker === 'CASH' || b.ticker === '$'
    if (aCash && !bCash) return 1
    if (!aCash && bCash) return -1
    return (b.mkt_value || 0) - (a.mkt_value || 0)
  })

  // Summary subtitle
  const subtitleParts = []
  if (isMock) {
    subtitleParts.push('Sample data')
  } else {
    subtitleParts.push(ACCOUNT_SUMMARY.account || 'Schwab Account')
  }
  if (summary.last_csv_upload) {
    subtitleParts.push(`Updated ${summary.last_csv_upload}`)
  }

  container.innerHTML = `
    <div class="positions-header" style="margin-bottom:var(--s5);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--s4);">
        <div>
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1);">My Positions</h2>
          <div style="font-size:12px; color:var(--text-tertiary);">
            ${subtitleParts.join(' · ')}
          </div>
          ${isMock ? `<div style="font-size:11px; color:var(--accent); margin-top:4px;">Using sample data — upload CSV to see your real positions</div>` : ''}
        </div>
        <label class="btn btn-ghost" style="cursor:pointer; font-size:12px; min-height:44px; display:inline-flex; align-items:center;" id="csv-upload-label">
          Upload CSV
          <input type="file" accept=".csv" id="csv-upload" style="display:none" />
        </label>
      </div>

      <div class="stat-row">
        <div class="stat">
          <span class="stat-value">${_fmtDollars(summary.account_total)}</span>
          <span class="stat-label">Account Total</span>
        </div>
        <div class="stat">
          <span class="stat-value" style="color:${summary.total_gl_pct >= 0 ? 'var(--buy)' : 'var(--sell)'}">
            ${_fmtGlPct(summary.total_gl_pct)}
          </span>
          <span class="stat-label">Total G/L</span>
        </div>
        <div class="stat">
          <span class="stat-value">${summary.position_count}</span>
          <span class="stat-label">Positions</span>
        </div>
        <div class="stat">
          <span class="stat-value">${_fmtDollars(summary.cash)}</span>
          <span class="stat-label">Cash</span>
        </div>
      </div>
    </div>

    <div id="positions-list">
      ${sortedPositions.map(pos => _renderPositionCard(pos)).join('')}
    </div>
  `

  // Wire CSV upload
  _wireUpload(container)

  info(CAT, `Rendered ${sortedPositions.length} positions (mock=${isMock})`)
}
