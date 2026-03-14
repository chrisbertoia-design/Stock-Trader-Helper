/**
 * Boot sequence — renders app immediately after auth check.
 * Sheets init runs in the background; app is never blocked by API calls.
 *
 *  1. Check localStorage for stored auth
 *  2. If token age > 50min → attempt silent refresh (no popup)
 *  3. If no stored auth → show sign-in screen
 *  4. Render app shell immediately
 *  5. Init Sheets + load config in background (non-blocking)
 */

import { initSheets, writeLogEntries } from './api/googleSheets.js'
import { initLogger, info, warn, error } from './services/logger.js'
import { loadConfig }                    from './stores/config.js'
import { renderApp }                     from './ui/app.js'
import { loadAuth, trySilentRefresh, startOAuthFlow } from './ui/views/connect.js'

const TOKEN_MAX_AGE_MS = 50 * 60 * 1000  // 50 min (tokens expire at 60min)

async function boot() {
  initLogger({ sheetsWriter: null, minLevel: 'DEBUG' })
  info('BOOT', 'App starting')

  const stored = loadAuth()

  if (!stored?.spreadsheetId) {
    info('BOOT', 'No auth stored — showing sign-in')
    startOAuthFlow()
    return
  }

  let { accessToken, spreadsheetId, tokenTs } = stored
  const age = Date.now() - (tokenTs || 0)

  if (age > TOKEN_MAX_AGE_MS) {
    info('BOOT', `Token age ${Math.round(age/60000)}min — attempting silent refresh`)
    const refreshed = await trySilentRefresh()
    if (refreshed) {
      accessToken = refreshed
    } else {
      info('BOOT', 'Silent refresh failed — showing sign-in')
      startOAuthFlow()
      return
    }
  }

  // ── Render immediately — never block on Sheets ──────────────────────────
  info('BOOT', 'Rendering app (Sheets connecting in background)')
  renderApp({ spreadsheetId })

  // ── Connect Sheets in background ────────────────────────────────────────
  _connectSheets(spreadsheetId, accessToken)
}

async function _connectSheets(spreadsheetId, accessToken) {
  try {
    await initSheets(spreadsheetId, accessToken)

    initLogger({
      sheetsWriter: (entries) => writeLogEntries(entries),
      minLevel: 'DEBUG'
    })

    await loadConfig()
    info('BOOT', 'Sheets connected + config loaded')
  } catch (err) {
    warn('BOOT', `Sheets unavailable (app continues with defaults): ${err.message}`)

    // Hard auth errors → re-prompt silently (no loading screen)
    if (err.message?.includes('401') || err.message?.includes('403')) {
      info('BOOT', 'Auth error — clearing stored credentials')
      localStorage.removeItem('sth_auth')
    }
  }
}

boot()
