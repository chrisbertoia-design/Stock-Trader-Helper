/**
 * S&P 500 ticker list.
 * Fetched once, cached in localStorage for 30 days.
 * Source: public Wikipedia list via a CORS-friendly proxy.
 */

import { debug, info, warn } from './logger.js'

const CAT      = 'SP500'
const CACHE_KEY = 'sp500_tickers'
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days

// Fallback static list of large-cap S&P 500 members (subset, updated periodically)
const FALLBACK_SP500 = new Set([
  'AAPL','MSFT','NVDA','AMZN','GOOGL','GOOG','META','TSLA','AVGO','BRK.B',
  'JPM','LLY','V','UNH','XOM','MA','JNJ','PG','HD','COST','MRK','ABBV',
  'CVX','ORCL','WMT','BAC','KO','NFLX','CRM','MCD','AMD','PEP','TMO',
  'LIN','ABT','CSCO','ACN','DHR','NKE','ADBE','PM','TXN','WFC','AMGN',
  'NEE','CAT','RTX','QCOM','SPGI','INTU','GE','ISRG','IBM','AMAT','BKNG',
  'SYK','NOW','PLD','GS','BLK','MS','UPS','ADP','ELV','VRTX','MDT',
  'MU','GILD','ADI','REGN','C','SCHW','LRCX','SO','DUK','CI','BSX',
  'ITW','ZTS','PGR','MMC','CME','APD','SHW','EOG','TJX','NOC','HUM',
  'MO','USB','TGT','EMR','MCK','ON','AXON','VST','MOH','IAU','DIS'
])

export async function getSP500Tickers() {
  const cached = _readCache()
  if (cached) {
    debug(CAT, `Cache hit — ${cached.size} tickers`)
    return cached
  }

  try {
    // Try fetching from a public API
    const res = await fetch('https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv', {
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const text   = await res.text()
    const lines  = text.split('\n').slice(1) // skip header
    const tickers = new Set(lines.map(l => l.split(',')[0]?.trim().toUpperCase()).filter(Boolean))

    _writeCache(tickers)
    info(CAT, `Fetched ${tickers.size} S&P 500 tickers`)
    return tickers
  } catch (e) {
    warn(CAT, `S&P 500 fetch failed, using fallback list`, e.message)
    return FALLBACK_SP500
  }
}

function _readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return new Set(data)
  } catch { return null }
}

function _writeCache(tickerSet) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: [...tickerSet] }))
  } catch (e) {
    warn(CAT, 'S&P 500 cache write failed', e.message)
  }
}
