/**
 * Congressional Trades API
 * Fetches congressional stock trades from a pre-generated static JSON file.
 * The JSON is built at deploy time by `scripts/generate-trades.js` (GitHub Actions)
 * and served as a same-origin asset — no CORS issues on any browser.
 *
 * Performance notes:
 *   - Static file fetch completes in < 1s (same origin, CDN-cached).
 *   - 10s AbortController timeout as a safety net.
 *   - 1-hour localStorage cache to avoid repeated fetches.
 *   - In-flight dedup: concurrent callers share one promise.
 *   - Normalized output shape is identical to houseStockWatcher.js so feed.js needs no changes.
 */

import { debug, info, warn, error } from '../services/logger.js'

const CAT              = 'CONGRESSIONAL_API'
const CACHE_KEY        = 'congressional_cache'
const CACHE_TTL        = 60 * 60 * 1000   // 1 hour
const FETCH_TIMEOUT    = 10_000            // 10s — static file fetch
const DATA_WINDOW_DAYS = 90               // trim to last 90 days

const TRADES_URL = import.meta.env.BASE_URL + 'congressional-trades.json'

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
  if (_fetchInFlight) {
    debug(CAT, 'Congressional fetch already in flight — joining existing request')
    return _fetchInFlight
  }

  _fetchInFlight = _fetchFromNetwork().finally(() => { _fetchInFlight = null })
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

async function _fetchFromNetwork() {
  info(CAT, `Fetching congressional trades from ${TRADES_URL}`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const res = await fetch(TRADES_URL, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) {
      throw new Error(`congressional-trades.json HTTP ${res.status}`)
    }

    const json = await res.json()
    const rawTrades = json.trades

    if (!Array.isArray(rawTrades)) {
      throw new Error('congressional-trades.json: "trades" field is not an array')
    }

    info(CAT, 'Raw API response received', {
      generated_at:   json.generated_at,
      trade_count:    json.trades?.length ?? 0,
      sample_tickers: json.trades?.slice(0, 3).map(t => t.ticker)
    })

    info(CAT, `Static file returned ${rawTrades.length} raw trade records — normalizing...`)

    const cutoffMs = Date.now() - DATA_WINDOW_DAYS * 86_400_000
    const normalized = rawTrades
      .map(_normalizeRecord)
      .filter(Boolean)
      .filter(t => t.transaction_ts >= cutoffMs)

    info(CAT, `Congressional trades ready — ${normalized.length} records cached`)
    _writeCache(normalized)
    return normalized

  } catch (err) {
    clearTimeout(timer)
    const msg = err.name === 'AbortError'
      ? `Congressional trades fetch timed out after ${FETCH_TIMEOUT / 1000}s`
      : err.message
    // console.error ensures visibility even when Sheets logger hasn't flushed
    console.error('[CONGRESSIONAL_API] fetch failed:', msg)
    error(CAT, 'Congressional fetch failed', msg)

    const stale = _readCache({ ignoreExpiry: true })
    if (stale) {
      warn(CAT, `Falling back to stale cache (${Math.round((Date.now() - stale.ts) / 3_600_000)}h old)`)
      return stale.data
    }
    throw new Error(msg)
  }
}

// ─── Normalization ────────────────────────────────────────────────────────────

function _normalizeRecord(raw) {
  try {
    if (!raw || typeof raw !== 'object') return null

    // Ticker is required
    const ticker = (raw.ticker || '').toUpperCase().trim()
    if (!ticker || ticker === '--') return null

    // Normalize action
    const rawAction = (raw.action || '').toLowerCase().trim()
    let action
    if (rawAction === 'buy' || rawAction === 'purchase') {
      action = 'buy'
    } else if (rawAction === 'sell' || rawAction === 'sale') {
      action = 'sell'
    } else {
      return null  // invalid action
    }

    // Normalize party
    const rawParty = (raw.party || '').toLowerCase().trim()
    let party
    if (rawParty === 'd' || rawParty === 'democrat' || rawParty === 'democratic') {
      party = 'D'
    } else if (rawParty === 'r' || rawParty === 'republican') {
      party = 'R'
    } else {
      party = 'U'
    }

    // Validate dates
    const transaction_date = (raw.transaction_date || '').trim()
    const transaction_ts   = new Date(transaction_date).getTime()
    if (!transaction_date || isNaN(transaction_ts)) return null

    const disclosed_date = (raw.disclosed_date || '').trim()

    // Validate numeric amount fields
    const amount_low  = typeof raw.amount_low  === 'number' ? raw.amount_low  : 1001
    const amount_high = typeof raw.amount_high === 'number' ? raw.amount_high : 15000

    // sp500 default 'N' if missing or invalid
    const sp500Raw = (raw.sp500 || '').toUpperCase().trim()
    const sp500    = sp500Raw === 'Y' ? 'Y' : 'N'

    return {
      id:               String(raw.id || `${ticker}_${transaction_date}_${(raw.politician_name || '').split(' ').pop()}`),
      politician_name:  (raw.politician_name || 'Unknown').trim(),
      party,
      ticker,
      action,
      amount_low,
      amount_high,
      transaction_date,
      disclosed_date,
      transaction_ts,
      sp500
    }
  } catch (e) {
    warn(CAT, 'Failed to normalize congressional record', e.message)
    return null
  }
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
