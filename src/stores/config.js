/**
 * Config store — reads from Google Sheets `config` tab.
 * Acts as the single source of truth for all settings.
 * Can be refreshed at runtime; changes persist back to Sheets.
 */

import { readConfig, writeConfigKey, writeConfigBatch } from '../api/googleSheets.js'
import { debug, info }                                   from '../services/logger.js'

const CAT = 'CONFIG'

let _config     = {}
let _loaded     = false
let _loadInFlight = null

export async function loadConfig() {
  if (_loadInFlight) return _loadInFlight
  debug(CAT, 'loadConfig()')
  _loadInFlight = readConfig().then(cfg => {
    _config = cfg
    _loaded = true
    _loadInFlight = null
    info(CAT, `Config loaded — ${Object.keys(_config).length} keys`)
    return _config
  })
  return _loadInFlight
}

export function getConfig() {
  return _config   // returns {} before Sheets loads — callers use fallback defaults
}

export function get(key, fallback = '') {
  return _loaded ? (_config[key] ?? fallback) : fallback
}

export async function set(key, value) {
  debug(CAT, `set(${key}, ${value})`)
  _config[key] = value
  await writeConfigKey(key, value)
}

/** Expose config as a flat editable object for a settings UI */
export function getEditableConfig() {
  return { ..._config }
}

export async function saveEditableConfig(updates) {
  const changed = {}
  for (const [key, value] of Object.entries(updates)) {
    if (String(value) !== String(_config[key])) {
      _config[key] = value
      changed[key] = value
    }
  }
  if (!Object.keys(changed).length) {
    debug(CAT, 'saveEditableConfig — no changes detected')
    return
  }
  info(CAT, `saveEditableConfig — saving ${Object.keys(changed).length} changed keys in one batch call`)
  await writeConfigBatch(changed)
}
