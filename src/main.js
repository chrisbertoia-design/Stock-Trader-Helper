/**
 * App entry point.
 * Boot sequence:
 *   1. Show loading screen
 *   2. Check for existing Google auth token
 *   3. Init Sheets (creates tabs + headers if needed)
 *   4. Wire up logger to Sheets
 *   5. Load config
 *   6. Fetch politician trades
 *   7. Render app shell
 */

import { initSheets, writeLogEntries } from './api/googleSheets.js'
import { initLogger, info, error }     from './services/logger.js'
import { loadConfig, get }             from './stores/config.js'
import { renderApp }                   from './ui/app.js'

async function boot() {
  // Logger starts writing to console immediately
  // Sheets writer injected after auth
  initLogger({ sheetsWriter: null, minLevel: 'DEBUG' })

  info('BOOT', 'App starting')

  // Check stored auth
  const stored = _getStoredAuth()
  if (!stored) {
    info('BOOT', 'No stored auth — showing connect screen')
    renderConnectScreen()
    return
  }

  try {
    const { spreadsheetId, accessToken } = stored
    await initSheets(spreadsheetId, accessToken)

    // Now wire logger to Sheets
    initLogger({
      sheetsWriter: (entries) => writeLogEntries(entries),
      minLevel: 'DEBUG'
    })

    await loadConfig()
    info('BOOT', 'Boot complete — rendering app')
    renderApp({ spreadsheetId })
  } catch (err) {
    error('BOOT', 'Boot failed', err.message)
    renderConnectScreen({ error: err.message })
  }
}

function _getStoredAuth() {
  try {
    const raw = localStorage.getItem('gauth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Tokens expire — check if we have at least a spreadsheet ID
    if (!parsed.spreadsheetId) return null
    return parsed
  } catch { return null }
}

function renderConnectScreen({ error: err } = {}) {
  document.getElementById('app').innerHTML = `
    <div class="connect-screen">
      <div class="connect-inner">
        <div class="connect-mark">STH</div>
        <div class="connect-title">Stock Trader Helper</div>
        <div class="connect-sub">Mirror congressional trades intelligently</div>
        ${err ? `<div class="connect-error">${err}</div>` : ''}
        <button class="btn btn-primary" id="connect-btn">Connect Google Sheets</button>
        <div class="connect-hint">
          You'll need a Google account and a Sheets spreadsheet ID.<br>
          The app creates all tabs automatically.
        </div>
      </div>
    </div>
  `

  document.getElementById('connect-btn').addEventListener('click', () => {
    import('./ui/views/connect.js').then(m => m.startOAuthFlow())
  })
}

boot()
