/**
 * Boot sequence — mirrors GoogleAuthService.getValidToken() logic from iOS.
 *
 *  1. Check localStorage for stored auth
 *  2. If token age > 50min → attempt silent refresh (no popup)
 *  3. If no stored auth → show sign-in screen
 *  4. Init Sheets → wire logger → load config → render app
 */

import { initSheets, writeLogEntries } from './api/googleSheets.js'
import { initLogger, info, error }     from './services/logger.js'
import { loadConfig }                  from './stores/config.js'
import { renderApp }                   from './ui/app.js'
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

  // Check if token needs refresh
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

  try {
    await initSheets(spreadsheetId, accessToken)

    initLogger({
      sheetsWriter: (entries) => writeLogEntries(entries),
      minLevel: 'DEBUG'
    })

    await loadConfig()
    info('BOOT', 'Boot complete')
    renderApp({ spreadsheetId })
  } catch (err) {
    error('BOOT', 'Boot failed', err.message)
    // Token may have expired mid-session — try sign-in
    if (err.message?.includes('401') || err.message?.includes('403')) {
      info('BOOT', 'Auth error — clearing and re-prompting')
      localStorage.removeItem('sth_auth')
      startOAuthFlow()
    } else {
      _showError(err.message)
    }
  }
}

function _showError(msg) {
  document.getElementById('app').innerHTML = `
    <div style="height:100vh; display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:var(--s3); padding:var(--s5);">
      <div style="font-size:14px; color:var(--text-secondary);">Something went wrong</div>
      <div style="font-size:12px; color:var(--text-tertiary); max-width:300px;
        text-align:center; line-height:1.6;">${msg}</div>
      <button class="btn btn-ghost" onclick="window.location.reload()">Retry</button>
    </div>
  `
}

boot()
