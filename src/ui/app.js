/**
 * App shell — home-first drill-down navigation.
 * navigate() is intentionally SYNCHRONOUS — all Phase 1 views are mock data.
 * window._navigate exposed globally for inline onclick handlers.
 */

import { info }            from '../services/logger.js'
import { renderHome }      from './views/home.js'
import { renderFeed }      from './views/feed.js'
import { renderPositions } from './views/positions.js'
import { renderSettings }  from './views/settings.js'
import { renderWhatToBuy } from './views/whatToBuy.js'
import { renderTopSignal }  from './views/topSignal.js'
import { renderDecisionsHistory } from './views/decisionsHistory.js'

const CAT = 'APP_SHELL'

export function renderApp({ spreadsheetId }) {
  info(CAT, 'Rendering app shell')

  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <header class="app-header" id="app-header">
        <div class="header-left">
          <button class="back-btn hidden" id="back-btn" aria-label="Back">←</button>
          <span class="app-wordmark">STH</span>
          <span style="font-size:10px; color:var(--text-tertiary); font-family:var(--font-mono); margin-left:var(--s2); letter-spacing:0.03em;">${__APP_BUILD__}</span>
        </div>
        <div class="header-right">
          <div id="sync-status" class="sync-dot"></div>
          <button class="settings-btn btn btn-ghost" id="settings-btn" aria-label="Settings">⚙</button>
        </div>
      </header>
      <main class="app-content" id="view-content"></main>
    </div>
    <div id="toast-container"></div>
  `

  const viewContent = document.getElementById('view-content')
  const backBtn     = document.getElementById('back-btn')
  const settingsBtn = document.getElementById('settings-btn')
  let   activeView  = null
  let   _navAbort   = null  // AbortController for current navigation

  async function navigate(viewName) {
    if (viewName === activeView) return
    activeView = viewName

    // Cancel any in-flight render + its event listeners from the previous view
    if (_navAbort) _navAbort.abort()
    _navAbort = new AbortController()
    const { signal } = _navAbort

    info(CAT, `Navigate: ${viewName}`)
    _persistView(viewName)

    // Push URL state so browser back/forward work and views are deep-linkable
    const hashPath = viewName === 'home' ? '#/' : `#/${viewName}`
    try { history.pushState({ view: viewName }, '', hashPath) } catch (_) { /* sandboxed iframe */ }

    backBtn.classList.toggle('hidden', viewName === 'home')
    settingsBtn.classList.toggle('hidden', viewName === 'settings')

    viewContent.innerHTML = ''

    try {
      if      (viewName === 'home')      await renderHome(viewContent, signal)
      else if (viewName === 'feed')      await renderFeed(viewContent, signal)
      else if (viewName === 'positions') await renderPositions(viewContent, signal)
      else if (viewName === 'settings')  await renderSettings(viewContent, signal)
      else if (viewName === 'whatToBuy') await renderWhatToBuy(viewContent, signal)
      else if (viewName === 'topSignal') await renderTopSignal(viewContent, signal)
      else if (viewName === 'decisionsHistory') await renderDecisionsHistory(viewContent, signal)
    } catch (e) {
      if (e.name === 'AbortError') return  // navigation cancelled — ignore
      console.error('[APP] render error:', e)
      viewContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Something went wrong</div>
          <div class="empty-state-sub">${e.message}</div>
        </div>`
    }
  }

  // Expose globally — all views use window._navigate('viewName') in onclick
  window._navigate = navigate

  // Browser back/forward — restore view from history state
  window.addEventListener('popstate', (e) => {
    const view = (e.state?.view) || 'home'
    navigate(view)
  })

  backBtn.addEventListener('click',    () => navigate('home'))
  settingsBtn.addEventListener('click', () => navigate('settings'))

  // URL hash takes priority over sessionStorage for deep links and page reloads
  const hashView = window.location.hash.replace(/^#\/?/, '') || ''
  const lastView  = hashView || sessionStorage.getItem('sth_last_view') || 'home'
  navigate(lastView)
}

function _persistView(viewName) {
  try { sessionStorage.setItem('sth_last_view', viewName) } catch (_) { /* quota full */ }
}
