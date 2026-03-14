/**
 * House Stock Watcher API
 * Source: https://housestockwatcher.com
 * Data: https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json
 *
 * Performance notes:
 *   - all_transactions.json is 30-50MB / 10,000+ records going back to 2012.
 *   - We trim to the last DATA_WINDOW_DAYS before normalizing to avoid
 *     blocking the main thread with a massive synchronous loop.
 *   - raw_json is NOT stored in normalized records (expensive & unnecessary in RAM).
 *   - A single in-flight promise is shared — concurrent callers get the same fetch.
 *   - 15s AbortController timeout prevents hung connections from blocking the UI.
 *   - localStorage cache stores only normalized fields; stays well under 5MB limit.
 */

import { debug, info, warn, error } from '../services/logger.js'

const CAT             = 'HSW_API'
const URL             = 'https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json'
const CACHE_KEY       = 'hsw_cache'
const CACHE_TTL       = 60 * 60 * 1000   // 1 hour
const FETCH_TIMEOUT   = 15_000            // 15s — abort if no response
const DATA_WINDOW_DAYS = 90               // only keep last 90 days (14d consensus + 30d feed + margin)

let _fetchInFlight = null   // dedup: concurrent callers share one request

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchAllTransactions({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = _readCache()
    if (cached) {
      debug(CAT, `Cache hit — ${cached.data.length} transactions, age ${Math.round((Date.now() - cached.ts) / 60000)}m`)
      return cached.data
    }
  }

  // Dedup: if a fetch is already in progress, return the same promise
  // Prevents two 50MB downloads + JSON parses running simultaneously
  if (_fetchInFlight) {
    debug(CAT, 'HSW fetch already in flight — joining existing request')
    return _fetchInFlight
  }

  _fetchInFlight = _fetchFromNetwork(forceRefresh).finally(() => { _fetchInFlight = null })
  return _fetchInFlight
}

export function filterByWatchlist(transactions, watchedNames, { daysBack = 30 } = {}) {
  const names  = new Set(watchedNames.map(n => n.toLowerCase()))
  const cutoff = Date.now() - daysBack * 86_400_000

  return transactions.filter(t => {
    if (!names.has(t.politician_name.toLowerCase())) return false
    if (t.transaction_ts < cutoff) return false
    return true
  })
}

export function getNewSinceLastVisit(transactions, watchedNames) {
  const lastVisit = parseInt(localStorage.getItem('last_visit_ts') || '0')
  localStorage.setItem('last_visit_ts', String(Date.now()))

  if (!lastVisit) return []

  return filterByWatchlist(transactions, watchedNames).filter(
    t => t.transaction_ts > lastVisit
  )
}

/**
 * Compute party-wide consensus signals.
 * Thresholds always read from config — fallbacks MATCH DEFAULT_CONFIG values.
 */
export function computeConsensusSignals(transactions, { config, partyRoster }) {
  // Fallbacks must match DEFAULT_CONFIG in googleSheets.js
  const tier1 = parseFloat(config.consensus_tier1_pct  || 0.08)
  const tier2 = parseFloat(config.consensus_tier2_pct  || 0.12)
  const tier3 = parseFloat(config.consensus_tier3_pct  || 0.18)
  const days  = parseInt(config.consensus_window_days  || 14)
  const cutoff = Date.now() - days * 86_400_000

  debug(CAT, 'computeConsensusSignals', { tier1, tier2, tier3, days })

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
      signal_date:  new Date().toISOString().slice(0, 10),
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

// ─── Network fetch ────────────────────────────────────────────────────────────

async function _fetchFromNetwork(forceRefresh) {
  info(CAT, `Fetching HSW (last ${DATA_WINDOW_DAYS} days only)`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const res = await fetch(URL, {
      cache:  forceRefresh ? 'reload' : 'default',
      signal: controller.signal
    })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // Parse the full JSON — unavoidably synchronous, but we immediately
    // discard records older than DATA_WINDOW_DAYS to minimize work
    const raw = await res.json()

    if (!Array.isArray(raw)) throw new Error('HSW response is not an array')

    info(CAT, `HSW raw: ${raw.length} records — trimming to ${DATA_WINDOW_DAYS} days`)
    const cutoffMs = Date.now() - DATA_WINDOW_DAYS * 86_400_000
    const recent   = raw.filter(t => _parseDate(t.transaction_date) > cutoffMs)

    info(CAT, `Trimmed to ${recent.length} recent records, normalizing...`)
    const normalized = recent.map(_normalizeTransaction).filter(Boolean)

    _writeCache(normalized)
    info(CAT, `HSW ready — ${normalized.length} transactions cached`)
    return normalized

  } catch (err) {
    clearTimeout(timer)
    const msg = err.name === 'AbortError'
      ? `HSW fetch timed out after ${FETCH_TIMEOUT / 1000}s — check network`
      : err.message
    error(CAT, 'HSW fetch failed', msg)

    const stale = _readCache({ ignoreExpiry: true })
    if (stale) {
      warn(CAT, `Falling back to stale cache (${Math.round((Date.now() - stale.ts) / 3_600_000)}h old)`)
      return stale.data
    }
    throw new Error(msg)
  }
}

// ─── Normalization ────────────────────────────────────────────────────────────
// NOTE: raw_json intentionally omitted — storing JSON.stringify of 1000+ records
// in RAM and localStorage is expensive and unnecessary for feed rendering.

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
      disclosed_date:   raw.disclosure_date  || raw.disclosure_year || '',
      transaction_ts:   _parseDate(raw.transaction_date),
      sp500:            'N'
    }
  } catch (e) {
    warn(CAT, 'Failed to normalize transaction', e.message)
    return null
  }
}

function _inferParty(raw) {
  const d = (raw.party || raw.representative || '').toLowerCase()
  if (d.includes('(d)') || d.includes('democrat'))   return 'D'
  if (d.includes('(r)') || d.includes('republican')) return 'R'
  return 'U'
}

const AMOUNT_MAP = {
  '$1,001 - $15,000':     [1001,    15000],
  '$15,001 - $50,000':    [15001,   50000],
  '$50,001 - $100,000':   [50001,  100000],
  '$100,001 - $250,000':  [100001, 250000],
  '$250,001 - $500,000':  [250001, 500000],
  '$500,001 - $1,000,000':[500001, 1000000],
  'Over $1,000,000':      [1000001, 5000000]
}

function _parseAmountLow(str)  { return AMOUNT_MAP[str]?.[0] ?? 1001 }
function _parseAmountHigh(str) { return AMOUNT_MAP[str]?.[1] ?? 15000 }

function _parseDate(str) {
  if (!str) return 0
  const d = new Date(str)
  return isNaN(d) ? 0 : d.getTime()
}

// ─── Cache ────────────────────────────────────────────────────────────────────

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
    warn(CAT, 'Cache write failed (quota exceeded?) — data not cached', e.message)
  }
}
