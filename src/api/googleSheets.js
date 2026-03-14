/**
 * Google Sheets API wrapper.
 *
 * Tabs (by name):
 *   config          — key/value settings
 *   log             — debug/info/warn/error entries
 *   watchlist       — politician tracking list
 *   disclosures     — raw House Stock Watcher data
 *   consensus       — computed party-wide signals
 *   recommendations — AI-generated trade suggestions
 *   my_decisions    — user follow/pass/not_now choices
 *   my_allocations  — slice-level dollar amounts
 *   my_positions    — imported from Schwab CSV
 *
 * Auth: Google OAuth 2.0 via gapi (loaded from CDN in index.html).
 * All public methods log verbosely via logger.js.
 */

import { debug, info, warn, error } from '../services/logger.js'

const CAT = 'GSHEETS'

// ─── Schema: column order per tab ───────────────────────────────────────────

export const SCHEMA = {
  config: ['key', 'value', 'description', 'last_modified'],

  log: ['timestamp', 'level', 'category', 'message', 'details', 'session_id'],

  watchlist: [
    'id', 'name', 'party', 'chamber', 'state',
    'mirror',          // Y/N — actively mirror their trades
    'tier',            // 1=mirror+consensus, 2=consensus-only
    'category',        // named | gang8 | auto
    'active',          // Y/N
    'notes',
    'date_added'
  ],

  disclosures: [
    'id', 'politician_id', 'politician_name', 'party',
    'ticker', 'action',             // buy | sell
    'amount_low', 'amount_high',    // USD
    'transaction_date', 'disclosed_date', 'fetched_at',
    'sp500',                        // Y/N
    'raw_json'                      // full source object stringified
  ],

  consensus: [
    'id', 'signal_date', 'party',
    'tickers',                      // comma-separated
    'member_count', 'party_total', 'pct_of_party',
    'window_days',
    'tier',                         // 1|2|3
    'notified',                     // Y/N
    'ai_summary',
    'created_at'
  ],

  recommendations: [
    'id', 'source_disclosure_ids',  // comma-separated
    'tickers',
    'action',
    'signal_type',                  // mirror | consensus | both
    'ai_reasoning',
    'positions_context',            // snapshot of relevant holdings at time
    'sp500_eligible',               // Y/N
    'created_at',
    'status'                        // pending | acted | expired
  ],

  my_decisions: [
    'id', 'recommendation_id',
    'decision',                     // follow | pass | not_now
    'invest_amount',                // total USD to allocate
    'slice_count',                  // number of stocks in slice
    'decided_at',
    'revisit_date',                 // for not_now
    'notes'
  ],

  my_allocations: [
    'id', 'decision_id',
    'ticker', 'allocation_amount',
    'is_sp500',                     // Y/N
    'executed',                     // Y/N
    'executed_date',
    'notes'
  ],

  my_positions: [
    'ticker', 'quantity', 'avg_cost',
    'mkt_value', 'gain_loss', 'gain_loss_pct',
    'last_csv_upload',
    'source'                        // schwab_csv | manual
  ]
}

// ─── Default config values ───────────────────────────────────────────────────

export const DEFAULT_CONFIG = [
  // Consensus thresholds — CONFIGURABLE, validated against 3 years of HSW data.
  // Research finding: max ever observed ~5% of a party on one ticker.
  // 50%/65%/80% thresholds would NEVER trigger. Realistic levels:
  ['consensus_tier1_pct',   '0.08', 'Elevated: 8%+ of party traded same ticker (seen 1-3x/yr)', ''],
  ['consensus_tier2_pct',   '0.12', 'Strong: 12%+ of party (rare, <5x/yr)', ''],
  ['consensus_tier3_pct',   '0.18', 'Near-unanimous: 18%+ (almost never — would be major signal)', ''],
  ['consensus_window_days', '14',   'Days to cluster trades for consensus detection', ''],

  // AI provider — swap without code changes
  ['ai_provider',           'ollama',                'Primary AI provider: ollama | gemini', ''],
  ['ai_model',              '',                      'Model name. Empty = provider default', ''],
  ['ollama_base_url',       'http://localhost:11434', 'Ollama API base URL', ''],
  ['ollama_fallback_model', 'llama3.2',              'Model if ai_model is blank and provider=ollama', ''],
  ['gemini_api_key',        '',                      'Gemini API key (leave blank if not using)', ''],
  ['gemini_fallback_model', 'gemini-2.0-flash',      'Model if ai_model is blank and provider=gemini', ''],

  // Notifications
  ['ntfy_topic',            '',  'ntfy.sh topic slug for push notifications', ''],
  ['ntfy_base_url',         'https://ntfy.sh', 'ntfy.sh server URL', ''],
  ['notify_on_tier',        '1', 'Minimum consensus tier to trigger notification (1|2|3)', ''],

  // S&P 500
  ['sp500_last_update',     '', 'ISO date of last S&P 500 list refresh', ''],

  // Logging
  ['log_level',             'DEBUG', 'Minimum log level: DEBUG | INFO | WARN | ERROR', ''],
  ['log_max_rows',          '2000',  'Max rows to keep in log tab before trimming', ''],
]

// ─── State ───────────────────────────────────────────────────────────────────

let _spreadsheetId = null
let _accessToken   = null

// ─── Init ────────────────────────────────────────────────────────────────────

/**
 * Call after Google OAuth succeeds.
 * spreadsheetId: from URL or stored in localStorage.
 */
export async function initSheets(spreadsheetId, accessToken) {
  debug(CAT, 'initSheets called', { spreadsheetId })
  _spreadsheetId = spreadsheetId
  _accessToken   = accessToken

  // Tab provisioning is maintenance-only — non-fatal.
  // If quota is exhausted (429) or network is slow, the app still loads.
  // Tabs are already created after first boot; we just skip header re-writes.
  try {
    await _ensureAllTabs()
  } catch (e) {
    warn(CAT, `_ensureAllTabs failed (non-fatal): ${e.message}`)
  }
  try {
    await _ensureDefaultConfig()
  } catch (e) {
    warn(CAT, `_ensureDefaultConfig failed (non-fatal): ${e.message}`)
  }

  info(CAT, 'Google Sheets initialized', { spreadsheetId })
}

export function getSpreadsheetId() { return _spreadsheetId }
export function setAccessToken(t)  { _accessToken = t }

// ─── Config read/write ────────────────────────────────────────────────────────

/** Returns config as a flat object: { key: value } */
export async function readConfig() {
  debug(CAT, 'readConfig — reading config tab')
  const rows = await readTab('config')
  const cfg = {}
  for (const row of rows) {
    if (row[0]) cfg[row[0]] = row[1] ?? ''
  }
  info(CAT, `Config loaded — ${Object.keys(cfg).length} keys`, cfg)
  return cfg
}

export async function writeConfigKey(key, value) {
  debug(CAT, 'writeConfigKey', { key, value })
  const rows = await readTab('config')
  const idx  = rows.findIndex(r => r[0] === key)
  const ts   = new Date().toISOString()

  if (idx === -1) {
    warn(CAT, `writeConfigKey — key not found, appending: ${key}`)
    await appendRows('config', [[key, value, '', ts]])
  } else {
    const sheetRow = idx + 2 // 1-indexed + header row
    await updateCell(`config!B${sheetRow}`, value)
    await updateCell(`config!D${sheetRow}`, ts)
  }
  info(CAT, `Config key updated: ${key} = ${value}`)
}

// ─── Generic tab operations ───────────────────────────────────────────────────

export async function readTab(tabName, range = null) {
  const r = range ?? `${tabName}!A:ZZ`
  debug(CAT, `readTab: ${r}`)
  const res = await _apiGet(`values/${encodeURIComponent(r)}`)
  const rows = (res.values ?? []).slice(1) // skip header
  debug(CAT, `readTab ${tabName} — ${rows.length} data rows`)
  return rows
}

export async function appendRows(tabName, rows) {
  if (!rows.length) return
  debug(CAT, `appendRows to ${tabName}`, { count: rows.length })
  await _withRetry(() =>
    _apiPost(
      `values/${encodeURIComponent(tabName + '!A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { values: rows }
    )
  )
}

export async function updateCell(a1, value) {
  debug(CAT, `updateCell ${a1} = ${value}`)
  await _apiPut(
    `values/${encodeURIComponent(a1)}?valueInputOption=USER_ENTERED`,
    { values: [[value]] }
  )
}

// ─── Log writer (used by logger.js) ──────────────────────────────────────────

export async function writeLogEntries(entries) {
  if (!_spreadsheetId || !entries.length) return
  const rows = entries.map(e => [
    e.timestamp, e.level, e.category, e.message, e.details, e.session_id
  ])
  await appendRows('log', rows)
}

// ─── Tab provisioning ─────────────────────────────────────────────────────────

async function _ensureAllTabs() {
  debug(CAT, 'Checking all tabs exist...')
  const existing = await _getExistingTabs()
  const needed   = Object.keys(SCHEMA)
  const missing  = needed.filter(t => !existing.includes(t))

  // Create any missing tabs first
  if (missing.length > 0) {
    info(CAT, `Creating missing tabs: ${missing.join(', ')}`)
    const requests = missing.map(tab => ({
      addSheet: { properties: { title: tab } }
    }))
    await _apiBatchUpdate({ requests })
  }

  // Check which tabs already have a header row via a single batchGet.
  // On subsequent boots (after initial setup) this will be 0 writes — no 429 risk.
  const schemaTabs = needed.filter(tab => SCHEMA[tab])
  const ranges     = schemaTabs.map(tab => `${tab}!A1`)
  debug(CAT, `batchGet to check existing headers for ${schemaTabs.length} tabs`)
  const batchRes   = await _withRetry(() =>
    _apiGet(`values:batchGet?${ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')}`),
    2  // max 2 attempts on startup — fail fast, non-fatal caller handles it
  )
  const valueRanges = batchRes.valueRanges ?? []

  const data = schemaTabs
    .map((tab, i) => {
      const existing = valueRanges[i]?.values?.[0]
      if (existing && existing.length > 0) return null   // header already present
      return {
        range:          `${tab}!A1`,
        majorDimension: 'ROWS',
        values:         [SCHEMA[tab]]
      }
    })
    .filter(Boolean)

  if (data.length > 0) {
    info(CAT, `Writing headers for ${data.length} tab(s) (skipped ${schemaTabs.length - data.length} already-populated)`)
    await _withRetry(() =>
      _apiPost(
        `values:batchUpdate`,
        { valueInputOption: 'USER_ENTERED', data }
      ),
      2  // max 2 attempts on startup
    )
    info(CAT, 'Tab headers written')
  } else {
    debug(CAT, 'All tab headers already present — skipping write')
  }
}

async function _getExistingTabs() {
  const res = await _apiGetMeta()
  return (res.sheets ?? []).map(s => s.properties.title)
}

async function _ensureDefaultConfig() {
  const rows = await readTab('config')
  const existingKeys = new Set(rows.map(r => r[0]))
  const missing = DEFAULT_CONFIG.filter(([key]) => !existingKeys.has(key))

  if (missing.length === 0) {
    debug(CAT, 'Config defaults already present')
    return
  }

  info(CAT, `Seeding ${missing.length} default config keys`)
  await appendRows('config', missing)
}

// ─── Raw API calls ────────────────────────────────────────────────────────────

const BASE            = 'https://sheets.googleapis.com/v4/spreadsheets'
const SHEETS_TIMEOUT  = 10_000   // 10s — any hung Sheets call aborts and throws

function _headers() {
  return {
    'Authorization': `Bearer ${_accessToken}`,
    'Content-Type':  'application/json'
  }
}

/** Fetch wrapper with AbortController timeout — prevents hung requests freezing the UI */
async function _timedFetch(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SHEETS_TIMEOUT)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Sheets request timed out (${SHEETS_TIMEOUT / 1000}s)`)
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function _apiGet(path) {
  const url = `${BASE}/${_spreadsheetId}/${path}`
  debug(CAT, `GET ${path}`)
  const res = await _timedFetch(url, { headers: _headers() })
  if (!res.ok) {
    const body = await res.text()
    error(CAT, `GET ${path} failed ${res.status}`, body)
    throw new Error(`Sheets GET ${path}: ${res.status} ${body}`)
  }
  return res.json()
}

async function _apiGetMeta() {
  const url = `${BASE}/${_spreadsheetId}?fields=sheets.properties.title`
  const res = await _timedFetch(url, { headers: _headers() })
  if (!res.ok) throw new Error(`Sheets meta GET: ${res.status}`)
  return res.json()
}

async function _apiPost(path, body) {
  const url = `${BASE}/${_spreadsheetId}/${path}`
  debug(CAT, `POST ${path}`)
  const res = await _timedFetch(url, {
    method:  'POST',
    headers: _headers(),
    body:    JSON.stringify(body)
  })
  if (!res.ok) {
    const b = await res.text()
    error(CAT, `POST ${path} failed ${res.status}`, b)
    throw new Error(`Sheets POST ${path}: ${res.status} ${b}`)
  }
  return res.json()
}

async function _apiPut(path, body) {
  const url = `${BASE}/${_spreadsheetId}/${path}`
  debug(CAT, `PUT ${path}`)
  const res = await _timedFetch(url, {
    method:  'PUT',
    headers: _headers(),
    body:    JSON.stringify(body)
  })
  if (!res.ok) {
    const b = await res.text()
    error(CAT, `PUT ${path} failed ${res.status}`, b)
    throw new Error(`Sheets PUT ${path}: ${res.status} ${b}`)
  }
  return res.json()
}

/** Retry wrapper for 429 rate-limit errors — exponential backoff */
async function _withRetry(fn, maxAttempts = 5) {
  let delay = 2000
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      const is429 = e.message?.includes('429') || e.message?.includes('RATE_LIMIT')
      if (!is429 || attempt === maxAttempts) throw e
      warn(CAT, `429 rate limit — retry ${attempt}/${maxAttempts} in ${delay}ms`)
      await new Promise(r => setTimeout(r, delay))
      delay = Math.min(delay * 2, 30000)
    }
  }
}

async function _apiBatchUpdate(body) {
  const url = `${BASE}/${_spreadsheetId}:batchUpdate`
  debug(CAT, 'batchUpdate', body)
  const res = await fetch(url, {
    method: 'POST',
    headers: _headers(),
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const b = await res.text()
    error(CAT, `batchUpdate failed ${res.status}`, b)
    throw new Error(`Sheets batchUpdate: ${res.status} ${b}`)
  }
  return res.json()
}
