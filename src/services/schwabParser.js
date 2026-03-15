/**
 * Schwab CSV Parser
 *
 * Handles the Schwab transactions export format:
 *   Date, Action, Symbol, Description, Quantity, Price, Fees & Comn, Amount
 *
 * Account naming: Joint_Tenant_XXX805_Transactions_YYYYMMDD-HHmmss.csv
 *
 * Relevant actions for position building:
 *   Buy, Sell, Reinvest Sha, Qual Div Reir
 *
 * Ignored actions (cash only, no position impact):
 *   MoneyLink Transfer, Bank Interest, Dividend, Wire Funds, ...
 *
 * Amount format: ($21.42) = -21.42, $21.42 = +21.42
 */

import { debug, info, warn } from './logger.js'

const CAT = 'SCHWAB_PARSER'

// CUSIP → ticker map: Schwab sometimes stores ETF fractional shares by CUSIP in transaction history
const CUSIP_TO_TICKER = {
  '33813J106': 'IAU',   // iShares Gold Trust
  '46435G103': 'IVV',   // iShares Core S&P 500
  '78462F103': 'SPY',   // SPDR S&P 500 ETF Trust
  '46090E103': 'QQQ',   // Invesco QQQ Trust
  '81369Y605': 'GLD',   // SPDR Gold Shares
  '36467W109': 'GDX',   // VanEck Gold Miners ETF
  '46137V357': 'IJR',   // iShares Core S&P Small-Cap
  '464287655': 'IWM',   // iShares Russell 2000
  '78468R103': 'QYLD',  // Global X NASDAQ 100 Covered Call
}

function _normalizeTicker(sym) {
  if (!sym) return sym
  // 9-char alphanumeric = likely a CUSIP
  if (/^[A-Z0-9]{9}$/.test(sym) && CUSIP_TO_TICKER[sym]) return CUSIP_TO_TICKER[sym]
  return sym
}

const POSITION_ACTIONS = new Set([
  'buy', 'sell',
  'reinvest sha', 'reinvest shares',
  'qual div reir', 'qualified dividend reinvestment',
  'reinvest dividend',
  'stock split'
])

/**
 * Parse raw CSV text → array of normalized transaction objects.
 */
export function parseTransactionsCsv(csvText) {
  csvText = csvText.replace(/^\uFEFF/, '')
  debug(CAT, 'parseTransactionsCsv — parsing CSV')

  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV appears empty or has no data rows')

  // Find the header row (may not be line 0 — Schwab sometimes prepends account info)
  const headerIdx = lines.findIndex(l => /^date,action,symbol/i.test(l.replace(/"/g, '')))
  if (headerIdx === -1) throw new Error('Could not find header row (Date,Action,Symbol,...)')

  const dataLines = lines.slice(headerIdx + 1)
  debug(CAT, `Found ${dataLines.length} data rows`)

  const transactions = []
  for (const line of dataLines) {
    try {
      const parsed = _parseLine(line)
      if (parsed) transactions.push(parsed)
    } catch (e) {
      warn(CAT, `Skipped unparseable line: ${line.slice(0, 60)}`, e.message)
    }
  }

  info(CAT, `Parsed ${transactions.length} transactions from CSV`)
  transactions._txCount = transactions.length
  return transactions
}

/**
 * Derive current positions by aggregating transaction history.
 * Returns object keyed by ticker.
 */
export function derivePositions(transactions) {
  debug(CAT, `derivePositions from ${transactions.length} transactions`)

  const positions = {}

  for (const tx of transactions) {
    if (!POSITION_ACTIONS.has(tx.action_normalized)) continue
    if (!tx.symbol) continue

    const sym = tx.symbol.toUpperCase()
    if (!positions[sym]) {
      positions[sym] = { ticker: sym, quantity: 0, cost_basis: 0, tx_count: 0 }
    }

    const isSplit = tx.action_normalized === 'stock split'
    const qty = tx.action_normalized === 'sell' ? -tx.quantity : tx.quantity
    positions[sym].quantity   += qty
    if (!isSplit) positions[sym].cost_basis += tx.amount_abs  // splits add shares at $0 cost
    positions[sym].tx_count   += 1
  }

  // Remove positions with zero or near-zero quantity (sold out)
  const result = {}
  for (const [sym, pos] of Object.entries(positions)) {
    if (Math.abs(pos.quantity) < 0.001) continue
    result[sym] = {
      ticker:       sym,
      quantity:     Math.round(pos.quantity * 10000) / 10000,
      avg_cost:     pos.quantity > 0 ? Math.round(pos.cost_basis / pos.quantity * 100) / 100 : 0,
      mkt_value:    0,     // filled in from a live price or positions export
      gain_loss:    0,
      gain_loss_pct:0,
      last_csv_upload: new Date().toISOString().slice(0, 10),
      source:       'schwab_csv'
    }
  }

  info(CAT, `Derived ${Object.keys(result).length} positions`)
  return result
}

/**
 * Parse a Schwab positions export (separate from transactions).
 * Schwab positions CSV columns (approximate):
 *   Symbol, Description, Quantity, Price, Price Change $, Price Change %,
 *   Market Value, Day Change $, Day Change %, Cost Basis, Gain/Loss $, Gain/Loss %, ...
 */
export function parsePositionsCsv(csvText) {
  csvText = csvText.replace(/^\uFEFF/, '')
  debug(CAT, 'parsePositionsCsv')
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const headerIdx = lines.findIndex(l => /symbol/i.test(l) && /quantity/i.test(l))
  if (headerIdx === -1) throw new Error('Could not find positions header row')

  const headers = _splitCsvLine(lines[headerIdx]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))

  // Build flexible column index map — Schwab renames columns across export versions
  const colIdx = {
    symbol:    headers.findIndex(h => h === 'symbol'),
    quantity:  headers.findIndex(h => h.includes('qty') || h.includes('quantity')),
    price:     headers.findIndex(h => h === 'price'),
    mkt_value: headers.findIndex(h => h.includes('market_value') || h.includes('mkt_value') || (h.includes('value') && !h.includes('day'))),
    avg_cost:  headers.findIndex(h => h.includes('average_cost') || h.includes('cost_basis_per_share') || h.includes('avg_cost')),
    gain_loss: headers.findIndex(h => (h.includes('gain') || h.includes('unrealized')) && !h.includes('pct') && !h.includes('percent') && !h.includes('_1') && !h.endsWith('__')),
    gl_pct:    headers.findIndex(h => (h.includes('gain') || h.includes('unrealized')) && (h.includes('pct') || h.includes('percent') || h.endsWith('_1') || h.endsWith('__'))),
  }
  debug(CAT, 'colIdx map', JSON.stringify(colIdx))

  const dataLines = lines.slice(headerIdx + 1)
  const positions = {}

  for (const line of dataLines) {
    try {
      const cols = _splitCsvLine(line)
      if (cols.length < 3) continue

      const sym = _normalizeTicker((colIdx.symbol >= 0 ? cols[colIdx.symbol] : '').replace(/"/g, '').trim().toUpperCase())
      if (!sym || sym === 'ACCOUNT') continue

      positions[sym] = {
        ticker:          sym,
        quantity:        _parseNum(colIdx.quantity  >= 0 ? cols[colIdx.quantity]  : '0'),
        avg_cost:        _parseNum(colIdx.avg_cost  >= 0 ? cols[colIdx.avg_cost]  : '0'),
        mkt_value:       _parseNum(colIdx.mkt_value >= 0 ? cols[colIdx.mkt_value] : '0'),
        gain_loss:       _parseNum(colIdx.gain_loss >= 0 ? cols[colIdx.gain_loss] : '0'),
        gain_loss_pct:   _parseNum(colIdx.gl_pct    >= 0 ? cols[colIdx.gl_pct]    : '0'),
        last_csv_upload: new Date().toISOString().slice(0, 10),
        source:          'schwab_csv'
      }
    } catch (e) {
      warn(CAT, `Positions parse error on line: ${line.slice(0,60)}`, e.message)
    }
  }

  info(CAT, `Parsed ${Object.keys(positions).length} positions from positions CSV`)
  return positions
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _parseLine(line) {
  const cols = _splitCsvLine(line)
  if (cols.length < 4) return null

  const date        = cols[0]?.trim()
  const action      = cols[1]?.trim()
  const symbol      = _normalizeTicker(cols[2]?.trim().toUpperCase() || '')
  const description = cols[3]?.trim()
  const quantity    = _parseNum(cols[4] || '0')
  const price       = _parseNum(cols[5] || '0')
  const fees        = _parseNum(cols[6] || '0')
  const amount      = _parseAmount(cols[7] || '0')

  if (!date || !action) return null

  return {
    date,
    action_raw:        action,
    action_normalized: action.toLowerCase().trim(),
    symbol,
    description,
    quantity:  Math.abs(quantity),
    price,
    fees:      Math.abs(fees),
    amount,
    amount_abs: Math.abs(amount)
  }
}

function _splitCsvLine(line) {
  // Handle quoted fields with commas inside
  const result = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue }
    if (char === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += char
  }
  result.push(current)
  return result
}

/** Parse Schwab amount: ($21.42) → -21.42, $21.42 → 21.42 */
function _parseAmount(str) {
  if (!str) return 0
  const clean = str.replace(/[$,\s]/g, '')
  const neg   = clean.startsWith('(') && clean.endsWith(')')
  const num   = parseFloat(clean.replace(/[()]/g, ''))
  return isNaN(num) ? 0 : (neg ? -num : num)
}

function _parseNum(str) {
  if (!str) return 0
  const n = parseFloat(str.replace(/[$,%\s,]/g, ''))
  return isNaN(n) ? 0 : n
}
