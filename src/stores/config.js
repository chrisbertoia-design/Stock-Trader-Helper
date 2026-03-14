/**
 * Config store — reads from Google Sheets `config` tab.
 * Acts as the single source of truth for all settings.
 * Can be refreshed at runtime; changes persist back to Sheets.
 */

import { readConfig, writeConfigKey } from '../api/googleSheets.js'
import { debug, info }                from '../services/logger.js'

const CAT = 'CONFIG'

let _config = {}
let _loaded = false

export async function loadConfig() {
  debug(CAT, 'loadConfig()')
  _config = await readConfig()
  _loaded = true
  info(CAT, `Config loaded — ${Object.keys(_config).length} keys`)
  return _config
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
  const keys = Object.keys(updates)
  info(CAT, `saveEditableConfig — updating ${keys.length} keys`)
  for (const key of keys) {
    if (updates[key] !== _config[key]) {
      await set(key, updates[key])
    }
  }
}
