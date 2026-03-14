/**
 * Positions store — reads from Google Sheets `my_positions` tab.
 * Acts as the single source of truth for portfolio positions.
 * Falls back to MOCK_POSITIONS if Sheets is not ready or tab is empty.
 */

import { readTab, getSpreadsheetId } from '../api/googleSheets.js'
import { MOCK_POSITIONS }            from '../data/mockPositions.js'
import { debug, info, warn }         from '../services/logger.js'

const CAT = 'POSITIONS_STORE'

// Canonical shape: { [ticker]: { ticker, quantity, avg_cost, mkt_value, gain_loss, gain_loss_pct, last_csv_upload, source } }
let _positions = null
let _loaded    = false

// ─── Normalize MOCK_POSITIONS to the store's canonical shape ─────────────────
// MOCK_POSITIONS uses: qty, price, mkt_val, cost_basis, gl_pct
// Store canonical:     quantity, avg_cost, mkt_value, gain_loss, gain_loss_pct

function _normalizeMock() {
  const out = {}
  for (const [ticker, p] of Object.entries(MOCK_POSITIONS)) {
    const mkt_value  = p.mkt_val  ?? 0
    const cost_basis = p.cost_basis ?? 0
    const gain_loss  = +(mkt_value - cost_basis).toFixed(2)
    out[ticker] = {
      ticker,
      quantity:       p.qty       ?? 0,
      avg_cost:       p.avg_cost  ?? 0,
      mkt_value,
      gain_loss,
      gain_loss_pct:  p.gl_pct    ?? 0,
      last_csv_upload: '',
      source:         'mock'
    }
  }
  return out
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load positions from Sheets my_positions tab.
 * Falls back to MOCK_POSITIONS if Sheets not ready or tab is empty.
 * Safe to call multiple times — re-reads on each call.
 */
export async function loadPositions() {
  debug(CAT, 'loadPositions()')

  if (!getSpreadsheetId()) {
    warn(CAT, 'No spreadsheetId — using MOCK_POSITIONS')
    _positions = _normalizeMock()
    _loaded    = true
    return _positions
  }

  try {
    const rows = await readTab('my_positions')

    if (!rows.length) {
      warn(CAT, 'my_positions tab is empty — using MOCK_POSITIONS')
      _positions = _normalizeMock()
      _loaded    = true
      return _positions
    }

    // Schema: ['ticker', 'quantity', 'avg_cost', 'mkt_value', 'gain_loss', 'gain_loss_pct', 'last_csv_upload', 'source']
    const out = {}
    for (const row of rows) {
      const ticker = row[0]
      if (!ticker) continue
      out[ticker] = {
        ticker,
        quantity:        parseFloat(row[1]) || 0,
        avg_cost:        parseFloat(row[2]) || 0,
        mkt_value:       parseFloat(row[3]) || 0,
        gain_loss:       parseFloat(row[4]) || 0,
        gain_loss_pct:   parseFloat(row[5]) || 0,
        last_csv_upload: row[6] ?? '',
        source:          row[7] ?? ''
      }
    }

    _positions = out
    _loaded    = true
    info(CAT, `Positions loaded — ${Object.keys(_positions).length} tickers`)
    return _positions

  } catch (e) {
    warn(CAT, `loadPositions failed (${e.message}) — using MOCK_POSITIONS`)
    _positions = _normalizeMock()
    _loaded    = true
    return _positions
  }
}

/**
 * Get current in-memory positions. Never returns null.
 * Returns MOCK_POSITIONS if loadPositions() has not been called yet.
 */
export function getPositions() {
  if (_positions === null) {
    debug(CAT, 'getPositions() called before loadPositions() — returning normalized MOCK_POSITIONS')
    return _normalizeMock()
  }
  return _positions
}

/**
 * Replace the in-memory positions (called after successful CSV upload).
 * @param {Object} obj - { [ticker]: { ticker, quantity, avg_cost, mkt_value, gain_loss, gain_loss_pct, last_csv_upload, source } }
 */
export function setPositions(obj) {
  debug(CAT, `setPositions() — ${Object.keys(obj).length} tickers`)
  _positions = obj
  _loaded    = true
}

/**
 * Returns derived account summary from current positions.
 * { account_total, total_gl, total_gl_pct, cash, position_count, last_csv_upload }
 */
export function getPositionsSummary() {
  const positions = getPositions()
  const entries   = Object.values(positions)

  let account_total = 0
  let total_gl      = 0
  let cash          = 0
  let last_csv_upload = ''

  for (const p of entries) {
    account_total += p.mkt_value  ?? 0
    total_gl      += p.gain_loss  ?? 0

    // Cash position — ticker is CASH or $
    if (p.ticker === 'CASH' || p.ticker === '$') {
      cash = p.mkt_value ?? 0
    }

    // Use the first non-empty last_csv_upload found
    if (!last_csv_upload && p.last_csv_upload) {
      last_csv_upload = p.last_csv_upload
    }
  }

  // avoid divide-by-zero: cost_basis = account_total - total_gl
  const cost_basis   = account_total - total_gl
  const total_gl_pct = cost_basis !== 0
    ? (total_gl / cost_basis) * 100
    : 0

  return {
    account_total:   +account_total.toFixed(2),
    total_gl:        +total_gl.toFixed(2),
    total_gl_pct:    +total_gl_pct.toFixed(2),
    cash:            +cash.toFixed(2),
    position_count:  entries.length,
    last_csv_upload
  }
}

/** True if loadPositions() has been called at least once */
export function isLoaded() {
  return _loaded
}
