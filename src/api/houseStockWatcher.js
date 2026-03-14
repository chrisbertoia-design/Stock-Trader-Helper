/**
 * House Stock Watcher API
 * Source: https://housestockwatcher.com
 * Data: https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json
 *
 * Returns same-day disclosures. Cached in localStorage for 1 hour.
 */

import { debug, info, warn, error } from '../services/logger.js'

const CAT    = 'HSW_API'
const URL    = 'https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json'
const CACHE_KEY  = 'hsw_cache'
const CACHE_TTL  = 60 * 60 * 1000  // 1 hour in ms

export async function fetchAllTransactions({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = _readCache()
    if (cached) {
      debug(CAT, `Cache hit — ${cached.data.length} transactions, age ${Math.round((Date.now() - cached.ts) / 60000)}m`)
      return cached.data
    }
  }

  info(CAT, 'Fetching from House Stock Watcher...')
  try {
    const res = await fetch(URL, { cache: forceRefresh ? 'reload' : 'default' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const raw = await res.json()
    const normalized = raw.map(_normalizeTransaction).filter(Boolean)

    _writeCache(normalized)
    info(CAT, `Fetched ${normalized.length} transactions`)
    return normalized
  } catch (err) {
    error(CAT, 'Fetch failed', err.message)
    // Return stale cache if available
    const stale = _readCache({ ignoreExpiry: true })
    if (stale) {
      warn(CAT, `Using stale cache (${Math.round((Date.now() - stale.ts) / 3600000)}h old)`)
      return stale.data
    }
    throw err
  }
}

/**
 * Filter transactions to watched politicians only.
 * @param {Array} transactions - from fetchAllTransactions
 * @param {string[]} watchedNames - politician names to include
 * @param {object} opts
 */
export function filterByWatchlist(transactions, watchedNames, { daysBack = 30 } = {}) {
  const names   = new Set(watchedNames.map(n => n.toLowerCase()))
  const cutoff  = Date.now() - daysBack * 86400000

  return transactions.filter(t => {
    if (!names.has(t.politician_name.toLowerCase())) return false
    if (t.transaction_ts < cutoff) return false
    return true
  })
}

/**
 * Find "new since last check" by comparing against a stored timestamp.
 */
export function getNewSinceLastVisit(transactions, watchedNames) {
  const lastVisit = parseInt(localStorage.getItem('last_visit_ts') || '0')
  localStorage.setItem('last_visit_ts', String(Date.now()))

  if (!lastVisit) return []  // first visit

  return filterByWatchlist(transactions, watchedNames).filter(
    t => t.transaction_ts > lastVisit
  )
}

/**
 * Compute party-wide consensus signals.
 * Returns signals that cross any configured threshold.
 * Thresholds come from config (not hardcoded).
 */
export function computeConsensusSignals(transactions, { config, partyRoster }) {
  const tier1 = parseFloat(config.consensus_tier1_pct || 0.15)
  const tier2 = parseFloat(config.consensus_tier2_pct || 0.25)
  const tier3 = parseFloat(config.consensus_tier3_pct || 0.40)
  const days  = parseInt(config.consensus_window_days || 14)
  const cutoff = Date.now() - days * 86400000

  debug(CAT, 'computeConsensusSignals', { tier1, tier2, tier3, days })

  // Group recent transactions by party + ticker
  const byPartyTicker = {}
  for (const t of transactions) {
    if (t.transaction_ts < cutoff) continue
    const key = `${t.party}::${t.ticker}`
    if (!byPartyTicker[key]) byPartyTicker[key] = { traders: new Set(), transactions: [] }
    byPartyTicker[key].traders.add(t.politician_name)
    byPartyTicker[key].transactions.push(t)
  }

  const signals = []
  for (const [key, data] of Object.entries(byPartyTicker)) {
    const [party, ticker] = key.split('::')
    const total = partyRoster[party] || 1
    const pct   = data.traders.size / total

    if (pct < tier1) continue

    const tier = pct >= tier3 ? 3 : pct >= tier2 ? 2 : 1
    signals.push({
      id:           `sig_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      signal_date:  new Date().toISOString().slice(0,10),
      party,
      tickers:      ticker,
      member_count: data.traders.size,
      party_total:  total,
      pct_of_party: pct,
      window_days:  days,
      tier,
      notified:     'N',
      ai_summary:   '',
      created_at:   new Date().toISOString()
    })
  }

  info(CAT, `Computed ${signals.length} consensus signals`)
  return signals.sort((a, b) => b.pct_of_party - a.pct_of_party)
}

// ─── Normalization ─────────────────────────────────────────────────────────

function _normalizeTransaction(raw) {
  try {
    const action = (raw.type || raw.transaction_type || '').toLowerCase()
    if (!raw.ticker || raw.ticker === '--') return null
    if (!action.includes('purchase') && !action.includes('sale')) return null

    return {
      id:               raw.transaction_id || `${raw.representative}_${raw.transaction_date}_${raw.ticker}`,
      politician_name:  raw.representative || raw.name || 'Unknown',
      party:            _inferParty(raw),
      ticker:           raw.ticker.toUpperCase().trim(),
      action:           action.includes('purchase') ? 'buy' : 'sell',
      amount_low:       _parseAmountLow(raw.amount),
      amount_high:      _parseAmountHigh(raw.amount),
      transaction_date: raw.transaction_date || '',
      disclosed_date:   raw.disclosure_date || raw.disclosure_year || '',
      transaction_ts:   _parseDate(raw.transaction_date),
      sp500:            'N',  // enriched separately
      raw_json:         JSON.stringify(raw)
    }
  } catch (e) {
    warn(CAT, 'Failed to normalize transaction', { raw, error: e.message })
    return null
  }
}

function _inferParty(raw) {
  const d = (raw.party || raw.representative || '').toLowerCase()
  if (d.includes('(d)') || d.includes('democrat')) return 'D'
  if (d.includes('(r)') || d.includes('republican')) return 'R'
  return 'U'
}

const AMOUNT_MAP = {
  '$1,001 - $15,000':    [1001,   15000],
  '$15,001 - $50,000':   [15001,  50000],
  '$50,001 - $100,000':  [50001, 100000],
  '$100,001 - $250,000': [100001,250000],
  '$250,001 - $500,000': [250001,500000],
  '$500,001 - $1,000,000':[500001,1000000],
  'Over $1,000,000':     [1000001, 5000000]
}

function _parseAmountLow(str)  { return AMOUNT_MAP[str]?.[0] ?? 1001 }
function _parseAmountHigh(str) { return AMOUNT_MAP[str]?.[1] ?? 15000 }
function _parseDate(str) {
  if (!str) return 0
  const d = new Date(str)
  return isNaN(d) ? 0 : d.getTime()
}

// ─── Cache ─────────────────────────────────────────────────────────────────

function _readCache({ ignoreExpiry = false } = {}) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!ignoreExpiry && Date.now() - cached.ts > CACHE_TTL) return null
    return cached
  } catch { return null }
}

function _writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
  } catch (e) {
    warn(CAT, 'Cache write failed (storage full?)', e.message)
  }
}
