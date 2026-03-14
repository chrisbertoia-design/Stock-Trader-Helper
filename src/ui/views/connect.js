/**
 * Google OAuth — web equivalent of the iOS ASWebAuthenticationSession flow.
 *
 * UX: One button. Google popup. Done.
 *   - Client ID baked in via VITE_GOOGLE_CLIENT_ID env var (never user-entered)
 *   - Spreadsheet auto-created on first sign-in ("Stock Trader Helper")
 *   - Token stored with email hint for silent refresh on return visits
 *   - Mirrors GoogleAuthService.swift + GoogleSheetsService.createCompanionSheet()
 *
 * Scopes:
 *   spreadsheets — create + read/write (no Drive API needed)
 */

import { info, warn, debug, error } from '../../services/logger.js'

const CAT    = 'OAUTH'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'
const SHEET_NAME = 'Stock Trader Helper'
const LS_KEY = 'sth_auth'

// ─── Public API ───────────────────────────────────────────────────────────────

/** Called from main.js connect screen button click */
export async function startOAuthFlow() {
  info(CAT, 'startOAuthFlow()')
  const clientId = _getClientId()

  if (!clientId) {
    _showSetupRequired()
    return
  }

  _showSignInScreen(clientId)
}

/**
 * Attempt silent token refresh using stored email hint.
 * Returns token string on success, null if user must sign in again.
 */
export async function trySilentRefresh() {
  const stored = _loadAuth()
  if (!stored?.emailHint || !stored?.clientId) return null

  debug(CAT, `trySilentRefresh — hint: ${stored.emailHint}`)
  try {
    const token = await _requestToken(stored.clientId, {
      hint:   stored.emailHint,
      prompt: '',           // empty = silent, no popup
    })
    _saveAuth({ ...stored, accessToken: token, tokenTs: Date.now() })
    info(CAT, 'Silent token refresh succeeded')
    return token
  } catch (e) {
    warn(CAT, 'Silent refresh failed — user must sign in', e.message)
    return null
  }
}

/** Load stored auth. Returns null if not signed in. */
export function loadAuth() { return _loadAuth() }

/** Sign out — clear stored auth */
export function signOut() {
  localStorage.removeItem(LS_KEY)
  info(CAT, 'Signed out')
}

// ─── Sign-in screen ───────────────────────────────────────────────────────────

function _showSignInScreen(clientId) {
  const overlay = document.createElement('div')
  overlay.id = 'oauth-overlay'
  overlay.style.cssText = `
    position:fixed; inset:0;
    background: var(--bg-base);
    display:flex; align-items:center; justify-content:center;
    z-index:999; flex-direction:column; gap:var(--s4);
  `
  overlay.innerHTML = `
    <div style="max-width:320px; text-align:center; padding: var(--s5);">
      <div style="font-size:13px; font-weight:600; letter-spacing:0.14em;
        color:var(--accent); margin-bottom:var(--s6);">STH</div>

      <div style="font-size:22px; font-weight:600; letter-spacing:-0.02em;
        color:var(--text-primary); margin-bottom:var(--s2);">
        Stock Trader Helper
      </div>
      <div style="font-size:14px; color:var(--text-secondary); line-height:1.6;
        margin-bottom:var(--s7);">
        Mirror congressional trades.<br>Intelligently.
      </div>

      <button id="google-signin-btn" style="
        display:flex; align-items:center; justify-content:center; gap:var(--s3);
        width:100%; padding:var(--s3) var(--s5);
        background:var(--bg-raised); border:1px solid var(--border-soft);
        border-radius:var(--r3); color:var(--text-primary);
        font-size:14px; font-weight:500; font-family:var(--font-sans);
        cursor:pointer; transition:all var(--fast) var(--ease);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      <div id="signin-status" style="margin-top:var(--s4); font-size:12px;
        color:var(--text-tertiary); min-height:18px;"></div>
    </div>
  `
  document.body.appendChild(overlay)

  const btn    = document.getElementById('google-signin-btn')
  const status = document.getElementById('signin-status')

  btn.addEventListener('mouseenter', () => {
    btn.style.borderColor = 'var(--border-hard)'
    btn.style.background  = 'var(--bg-elevated)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.borderColor = 'var(--border-soft)'
    btn.style.background  = 'var(--bg-raised)'
  })

  btn.addEventListener('click', async () => {
    btn.disabled = true
    btn.style.opacity = '0.6'
    status.textContent = 'Opening Google sign-in…'

    try {
      const token = await _requestToken(clientId, { prompt: 'select_account' })
      status.textContent = 'Signed in. Setting up your sheet…'
      info(CAT, 'OAuth token received')

      // Get user email for future silent refresh
      const emailHint = await _fetchUserEmail(token)

      // Create or retrieve spreadsheet
      const spreadsheetId = await _ensureSpreadsheet(token, emailHint)

      _saveAuth({ clientId, accessToken: token, spreadsheetId, emailHint, tokenTs: Date.now() })
      info(CAT, `Auth complete — sheet: ${spreadsheetId}`)

      overlay.remove()
      window.location.reload()
    } catch (e) {
      error(CAT, 'Sign-in failed', e.message)
      status.style.color = 'var(--sell)'
      status.textContent = e.message === 'popup_closed_by_user'
        ? 'Sign-in cancelled.'
        : `Error: ${e.message}`
      btn.disabled = false
      btn.style.opacity = '1'
    }
  })
}

// ─── Setup required screen (no client ID configured) ─────────────────────────

function _showSetupRequired() {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position:fixed; inset:0; background:var(--bg-base);
    display:flex; align-items:center; justify-content:center; z-index:999;
  `
  overlay.innerHTML = `
    <div style="max-width:380px; padding:var(--s6); text-align:center;">
      <div style="font-size:13px; font-weight:600; letter-spacing:0.14em;
        color:var(--accent); margin-bottom:var(--s5);">STH</div>
      <div style="font-size:15px; font-weight:500; margin-bottom:var(--s3);">
        One-time setup required
      </div>
      <div style="font-size:13px; color:var(--text-secondary); line-height:1.7;
        margin-bottom:var(--s5); text-align:left;">
        Add your Google OAuth Client ID to <code style="font-family:var(--font-mono);
        font-size:11px; background:var(--bg-elevated); padding:1px 4px;
        border-radius:3px;">.env.local</code>:<br><br>
        <code style="font-family:var(--font-mono); font-size:11px;
          background:var(--bg-elevated); padding:var(--s3); border-radius:var(--r2);
          display:block; word-break:break-all; text-align:left; color:var(--accent);">
          VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
        </code><br>
        <span style="font-size:12px; color:var(--text-tertiary);">
          Create one at console.cloud.google.com → APIs &amp; Services → Credentials.<br>
          Type: Web application. Add <strong>http://localhost:5175</strong> as an authorized origin.
        </span>
      </div>
      <button class="btn btn-ghost" onclick="window.location.reload()">
        Reload after setup
      </button>
    </div>
  `
  document.body.appendChild(overlay)
}

// ─── Spreadsheet auto-create (mirrors createCompanionSheet in Swift) ──────────

async function _ensureSpreadsheet(token, emailHint) {
  // Check if we have a stored sheet ID already
  const stored = _loadAuth()
  if (stored?.spreadsheetId) {
    debug(CAT, `Using existing spreadsheet: ${stored.spreadsheetId}`)
    return stored.spreadsheetId
  }

  info(CAT, `Creating new spreadsheet: "${SHEET_NAME}"`)

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: SHEET_NAME },
      // Pre-create all tabs in correct order (mirrors writeHeaders in Swift)
      sheets: [
        { properties: { title: 'feed',            index: 0 } },
        { properties: { title: 'config',          index: 1 } },
        { properties: { title: 'log',             index: 2 } },
        { properties: { title: 'watchlist',       index: 3 } },
        { properties: { title: 'disclosures',     index: 4 } },
        { properties: { title: 'consensus',       index: 5 } },
        { properties: { title: 'recommendations', index: 6 } },
        { properties: { title: 'my_decisions',    index: 7 } },
        { properties: { title: 'my_allocations',  index: 8 } },
        { properties: { title: 'my_positions',    index: 9 } },
      ]
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sheet creation failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  const spreadsheetId = data.spreadsheetId
  info(CAT, `Spreadsheet created: ${spreadsheetId}`)
  return spreadsheetId
}

// ─── User email (for silent refresh hint) ─────────────────────────────────────

async function _fetchUserEmail(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return ''
    const data = await res.json()
    debug(CAT, `Signed in as: ${data.email}`)
    return data.email || ''
  } catch {
    return ''
  }
}

// ─── GIS token request ────────────────────────────────────────────────────────

function _requestToken(clientId, { hint = '', prompt = 'select_account' } = {}) {
  return new Promise((resolve, reject) => {
    _loadGIS().then(() => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:     SCOPES,
        hint,
        prompt,
        callback:  (response) => {
          if (response.error) reject(new Error(response.error))
          else resolve(response.access_token)
        }
      })
      client.requestAccessToken()
    }).catch(reject)
  })
}

function _loadGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src    = 'https://accounts.google.com/gsi/client'
    script.onload = resolve
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function _getClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

function _saveAuth(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj))
}

function _loadAuth() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
