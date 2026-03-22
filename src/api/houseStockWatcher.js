/**
 * Congressional trade data — loaded from pre-built static JSON.
 *
 * Source: public/congressional-trades.json
 * Generated at build time by scripts/generate-trades.js (Anthropic API, with seed fallback).
 * Refreshed every deploy. No S3/CORS issues — served as a static asset.
 *
 * Performance notes:
 *   - Data is pre-normalized at build time — no heavy parsing in the browser.
 *   - 1-hour localStorage cache avoids repeat fetches within a session.
 *   - A single in-flight promise is shared — concurrent callers get the same fetch.
 *   - 15s AbortController timeout prevents hung connections from blocking the UI.
 */

import { debug, info, warn, error } from '../services/logger.js'

const CAT           = 'HSW_API'
const DATA_URL      = `${import.meta.env.BASE_URL}congressional-trades.json`
const CACHE_KEY     = 'hsw_cache'
const CACHE_TTL     = 60 * 60 * 1000   // 1 hour
const FETCH_TIMEOUT = 15_000            // 15s — abort if no response

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
    debug(CAT, 'HSW fetch already in flight — joining existing request')
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
  info(CAT, `Fetching congressional trades from ${DATA_URL}`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const res = await fetch(DATA_URL, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const payload = await res.json()

    // Format: { generated_at: string, trades: Array }
    const raw = Array.isArray(payload) ? payload : (payload.trades ?? [])

    if (!Array.isArray(raw) || raw.length === 0) throw new Error('congressional-trades.json returned empty array')

    info(CAT, `Loaded ${raw.length} trades (generated ${payload.generated_at ?? 'unknown'})`)

    // Add transaction_ts (unix ms) from transaction_date string
    const normalized = raw.map(t => ({
      ...t,
      transaction_ts: _parseDate(t.transaction_date)
    })).filter(t => t.transaction_ts > 0)

    _writeCache(normalized)
    info(CAT, `Trades ready — ${normalized.length} transactions cached`)
    return normalized

  } catch (err) {
    clearTimeout(timer)
    const msg = err.name === 'AbortError'
      ? `Trades fetch timed out after ${FETCH_TIMEOUT / 1000}s`
      : err.message
    error(CAT, 'Trades fetch failed', msg)

    const stale = _readCache({ ignoreExpiry: true })
    if (stale) {
      warn(CAT, `Falling back to stale cache (${Math.round((Date.now() - stale.ts) / 3_600_000)}h old)`)
      return stale.data
    }
    throw new Error(msg)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
