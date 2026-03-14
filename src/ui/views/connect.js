/**
 * Google OAuth flow for Sheets access.
 * Uses gapi (Google API client) loaded via CDN.
 * Scopes: spreadsheets (read/write), no Drive access needed.
 *
 * After auth:
 *   1. Stores { spreadsheetId, accessToken } in localStorage
 *   2. Calls initSheets() + boot sequence
 *
 * User provides their Spreadsheet ID (from URL).
 * The app never creates a spreadsheet — user creates one blank sheet.
 */

import { info, warn } from '../../services/logger.js'

const CAT = 'OAUTH'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

export async function startOAuthFlow() {
  // Show the setup dialog
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.7);
    display:flex; align-items:center; justify-content:center; z-index:999;
  `
  overlay.innerHTML = `
    <div style="background:var(--bg-raised); border:1px solid var(--border-soft);
      border-radius:var(--r4); padding:var(--s6); width:min(440px, calc(100vw - 48px));">
      <div style="font-size:15px; font-weight:500; margin-bottom:var(--s2);">Connect Google Sheets</div>
      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:var(--s5); line-height:1.6;">
        Create a blank Google Sheet, then paste its ID below.<br>
        The app will create all tabs automatically.
        <br><br>
        <span style="color:var(--text-tertiary); font-size:12px;">
          Sheet ID is in the URL:<br>
          docs.google.com/spreadsheets/d/<strong>THIS_PART</strong>/edit
        </span>
      </div>
      <div style="margin-bottom:var(--s3);">
        <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:var(--s2);">
          Google Client ID
        </label>
        <input id="client-id-input" type="text" placeholder="xxx.apps.googleusercontent.com"
          style="width:100%; padding:var(--s2) var(--s3); background:var(--bg-base);
            border:1px solid var(--border-soft); border-radius:var(--r2);
            color:var(--text-primary); font-size:13px; font-family:var(--font-sans); outline:none;" />
      </div>
      <div style="margin-bottom:var(--s5);">
        <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:var(--s2);">
          Spreadsheet ID
        </label>
        <input id="sheet-id-input" type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          style="width:100%; padding:var(--s2) var(--s3); background:var(--bg-base);
            border:1px solid var(--border-soft); border-radius:var(--r2);
            color:var(--text-primary); font-size:13px; font-family:var(--font-sans); outline:none;" />
      </div>
      <div style="display:flex; gap:var(--s2);">
        <button class="btn btn-primary" id="oauth-confirm" style="flex:1;">Sign in with Google</button>
        <button class="btn btn-ghost" id="oauth-cancel">Cancel</button>
      </div>
      <div id="oauth-error" style="margin-top:var(--s3); font-size:12px; color:var(--sell); display:none;"></div>
    </div>
  `
  document.body.appendChild(overlay)

  document.getElementById('oauth-cancel').onclick = () => overlay.remove()

  document.getElementById('oauth-confirm').onclick = async () => {
    const clientId     = document.getElementById('client-id-input').value.trim()
    const spreadsheetId = document.getElementById('sheet-id-input').value.trim()
    const errEl        = document.getElementById('oauth-error')

    if (!clientId || !spreadsheetId) {
      errEl.textContent = 'Both fields are required.'
      errEl.style.display = 'block'
      return
    }

    info(CAT, `Starting OAuth — clientId=${clientId.slice(0,20)}... sheetId=${spreadsheetId}`)

    try {
      const token = await _doOAuth(clientId)
      localStorage.setItem('gauth', JSON.stringify({ spreadsheetId, accessToken: token, clientId }))
      info(CAT, 'OAuth success — reloading')
      overlay.remove()
      window.location.reload()
    } catch (e) {
      warn(CAT, 'OAuth failed', e.message)
      errEl.textContent = `Auth failed: ${e.message}`
      errEl.style.display = 'block'
    }
  }
}

function _doOAuth(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      // Load GSI library if not present
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => _requestToken(clientId, resolve, reject)
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    } else {
      _requestToken(clientId, resolve, reject)
    }
  })
}

function _requestToken(clientId, resolve, reject) {
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope:     SCOPES,
    callback:  (response) => {
      if (response.error) reject(new Error(response.error))
      else resolve(response.access_token)
    }
  })
  client.requestAccessToken()
}
