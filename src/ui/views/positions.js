/**
 * Positions view — wired to real position data from stores/positions.
 * CSV upload parses Schwab exports and writes to Google Sheets my_positions tab.
 */

import { loadPositions, getPositions, getPositionsSummary, setPositions, invalidatePositionsCache } from '../../stores/positions.js'
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
  if (pct == null || isNaN(pct)) return '—'
  const sign = pct >= 0 ? '+' : ''
  return sign + pct.toFixed(2) + '%'
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function _renderSkeleton() {
  const shimmer = `background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-elevated) 50%, var(--bg-raised) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;`
  return `
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

function _wireUpload(container, signal) {
  const input = container.querySelector('#csv-upload')
  if (!input) return
  const opts = signal ? { signal } : {}

  // <label> doesn't reliably trigger file picker on iOS WebKit — use button + .click()
  const btn = container.querySelector('#csv-upload-label')
  if (btn) btn.addEventListener('click', () => input.click(), opts)

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    debug(CAT, `CSV file selected: ${file.name} (${file.size} bytes)`)

    const uploadBtn = container.querySelector('#csv-upload-label')

    const _setBtnState = (text, disabled) => {
      if (!uploadBtn) return
      uploadBtn.textContent = text
      uploadBtn.disabled = disabled
      uploadBtn.style.opacity = disabled ? '0.5' : ''
    }

    _setBtnState('Parsing…', true)

    const reader = new FileReader()

    const _readTimeout = setTimeout(() => {
      _setBtnState('Upload CSV', false)
      showToast('File read timed out — please try again', 'error')
    }, 15000)
    signal?.addEventListener('abort', () => clearTimeout(_readTimeout), { once: true })

    reader.onload = async (ev) => {
      if (signal?.aborted || !container.isConnected) return
      clearTimeout(_readTimeout)
      const csvText = ev.target.result
      let parsed = null

      try {
        // Yield to browser so "Parsing…" label renders before heavy parse
        await new Promise(r => setTimeout(r, 30))

        // Detect format by header: transactions CSV starts with Date,Action,Symbol
        const isTransactions = /date[",\s]+action[",\s]+symbol/i.test(csvText.slice(0, 500))

        let rawTxCount = 0
        if (isTransactions) {
          debug(CAT, 'Detected transactions CSV format')
          const transactions = parseTransactionsCsv(csvText)
          rawTxCount = transactions.length
          // Yield again after heavy parse
          await new Promise(r => setTimeout(r, 0))
          parsed = derivePositions(transactions)
          if (!parsed || Object.keys(parsed).length === 0) {
            throw new Error('No positions derived from transactions CSV')
          }
          info(CAT, `Derived ${Object.keys(parsed).length} positions from transactions CSV`)
        } else {
          debug(CAT, 'Detected positions CSV format')
          parsed = parsePositionsCsv(csvText)
          if (!parsed || Object.keys(parsed).length === 0) {
            throw new Error('No positions found in positions CSV')
          }
          info(CAT, `Parsed positions CSV — ${Object.keys(parsed).length} tickers`)
        }

        // ── Preview modal — show parsed results before committing ──────────────
        const count = Object.keys(parsed).length
        const totalMktVal = Object.values(parsed).reduce((sum, p) => sum + (p.mkt_value || 0), 0)
        const fmt$ = n => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(1)}k` : `$${n.toFixed(0)}`
        const topRows = Object.values(parsed)
          .sort((a, b) => (b.mkt_value || 0) - (a.mkt_value || 0))
          .slice(0, 8)

        const confirmed = await new Promise(resolve => {
          const modal = document.createElement('div')
          modal.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;padding:var(--s4);'
          modal.innerHTML = `
            <div style="background:var(--bg-raised);border:1px solid var(--border-soft);border-radius:var(--r3);padding:var(--s5);width:100%;max-width:480px;max-height:80vh;overflow-y:auto;">
              <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:var(--s1);">Preview: ${count} positions · ${fmt$(totalMktVal)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:var(--s4);">${isTransactions ? 'Derived from transactions CSV' : 'From positions export'}</div>
              <div style="margin-bottom:var(--s4);">
                ${topRows.map(p => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--s2) 0;border-bottom:1px solid var(--border-subtle);">
                    <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;">${p.ticker}</span>
                    <span style="font-size:13px;color:var(--text-secondary);">${p.mkt_value ? fmt$(p.mkt_value) : '—'}</span>
                  </div>
                `).join('')}
                ${count > 8 ? `<div style="font-size:12px;color:var(--text-tertiary);padding-top:var(--s2);">…and ${count - 8} more</div>` : ''}
              </div>
              <div style="display:flex;gap:var(--s3);">
                <button id="preview-cancel" class="btn btn-ghost" style="flex:1;">Cancel</button>
                <button id="preview-confirm" class="btn" style="flex:1;background:var(--accent);color:var(--bg-primary);border:none;">Upload ${count} positions</button>
              </div>
            </div>
          `
          document.body.appendChild(modal)

          const cleanup = (result) => { modal.remove(); resolve(result) }
          modal.addEventListener('click', e => { if (e.target === modal) cleanup(false) })
          modal.querySelector('#preview-cancel').addEventListener('click', () => cleanup(false))
          modal.querySelector('#preview-confirm').addEventListener('click', () => cleanup(true))

          // Auto-cancel if navigation signal fires
          signal?.addEventListener('abort', () => cleanup(false), { once: true })
        })

        if (!confirmed) {
          _setBtnState('Upload CSV', false)
          input.value = ''
          return
        }

        if (signal?.aborted || !container.isConnected) return

        // Update in-memory store
        setPositions(parsed)

        // Persist to Sheets if connected
        if (getSpreadsheetId()) {
          try {
            _setBtnState('Saving…', true)
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
            if (signal?.aborted || !container.isConnected) return
            info(CAT, `Wrote ${rows.length} positions to Sheets my_positions tab`)
          } catch (sheetsErr) {
            warn(CAT, `Sheets write failed (${sheetsErr.message}) — positions updated in-memory only`)
            showToast('Sheets save failed — positions shown but will reset on refresh', 'error')
          }
        }

        const toastMsg = isTransactions
          ? `${count} positions derived from ${rawTxCount} transactions`
          : `${count} positions loaded from positions export`
        showToast(toastMsg, 'success')
        // skipLoad:true — data is already fresh in memory from setPositions() above.
        // invalidatePositionsCache so the *next* navigation re-reads from Sheets.
        invalidatePositionsCache()
        if (!signal?.aborted && container.isConnected) await renderPositions(container, signal, { skipLoad: true })
        if (signal?.aborted || !container.isConnected) return

      } catch (err) {
        error(CAT, `CSV parse failed: ${err.message}`, err)
        const isAuthErr = /401|403|auth/i.test(err.message)
        showToast(isAuthErr ? 'Auth error — try reconnecting Google' : 'Could not parse CSV — use a Schwab transactions export', 'error')
        _setBtnState('Upload CSV', false)
      }

      input.value = ''
    }

    reader.onerror = () => {
      clearTimeout(_readTimeout)
      error(CAT, 'FileReader error reading CSV')
      showToast('Could not read file', 'error')
      _setBtnState('Upload CSV', false)
      input.value = ''
    }

    reader.readAsText(file)
  })
}

// ─── Main render ─────────────────────────────────────────────────────────────

export async function renderPositions(container, signal, { skipLoad = false } = {}) {
  // Show loading skeleton only when doing a fresh load (not a post-upload re-render)
  if (!skipLoad) container.innerHTML = _renderSkeleton()

  // Load positions (from Sheets or mock fallback) — skipped after CSV upload since data is fresh in memory
  if (!skipLoad) {
    try {
      await loadPositions()
    } catch (err) {
      warn(CAT, `loadPositions failed: ${err.message}`)
    }
  }

  // Guard: if navigated away during async load, don't overwrite the new view
  if (signal?.aborted || !container.isConnected) return

  const allPositions = getPositions()
  const summary      = getPositionsSummary()

  // Check if we're using mock data
  const isMock = Object.values(allPositions).some(p => p.source === 'mock')

  // Filter out zero-quantity positions (transactions CSV residuals, fully-sold positions)
  const validPositions = Object.values(allPositions).filter(p => p.ticker === 'CASH' || p.ticker === '$' || Math.abs(p.quantity || 0) >= 0.001)

  // Sort by market value descending, but put cash at the end
  const sortedPositions = validPositions.sort((a, b) => {
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

  // Calculate days since last upload
  const _daysStale = (() => {
    const lastUpload = summary.last_csv_upload
    if (!lastUpload) return 0
    const msPerDay = 86400000
    return Math.floor((Date.now() - new Date(lastUpload + 'T12:00:00').getTime()) / msPerDay)
  })()
  const _staleWarning = (!isMock && _daysStale > 7)
    ? `<div style="color:#f0a500; font-size:12px; margin-top:4px;">⚠ Data is ${_daysStale} days old — upload a fresh CSV</div>`
    : ''

  container.innerHTML = `
    <div class="positions-header" style="margin-bottom:var(--s5);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--s4);">
        <div>
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1);">My Positions</h2>
          <div style="font-size:12px; color:var(--text-tertiary);">
            ${subtitleParts.join(' · ')}
          </div>
          ${isMock ? `<div style="font-size:11px; color:var(--accent); margin-top:4px;">Using sample data — upload CSV to see your real positions</div>` : ''}
          ${_staleWarning}
        </div>
        <input type="file" accept=".csv" id="csv-upload" style="display:none" />
        <button class="btn btn-ghost" id="csv-upload-label" style="font-size:12px; min-height:44px;">
          Upload CSV
        </button>
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
          <span class="stat-value">${sortedPositions.length}</span>
          <span class="stat-label">Positions</span>
        </div>
        <div class="stat">
          <span class="stat-value">${_fmtDollars(summary.cash)}</span>
          <span class="stat-label">Cash</span>
        </div>
      </div>
    </div>

    <div id="positions-list">
      ${sortedPositions.length === 0
        ? `<div style="padding:var(--s6) var(--s4); text-align:center; color:var(--text-tertiary); font-size:13px; line-height:1.6;">
            No positions to display.<br>
            <span style="font-size:12px;">Upload a Schwab <strong>Positions</strong> CSV (not Transactions) to see your holdings.</span>
           </div>`
        : sortedPositions.map(pos => _renderPositionCard(pos)).join('')}
    </div>
  `

  // Wire CSV upload
  _wireUpload(container, signal)

  info(CAT, `Rendered ${sortedPositions.length} positions (mock=${isMock})`)
}
