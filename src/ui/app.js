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

const CAT = 'APP_SHELL'

export function renderApp({ spreadsheetId }) {
  info(CAT, 'Rendering app shell')

  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <header class="app-header" id="app-header">
        <div class="header-left">
          <button class="back-btn hidden" id="back-btn" aria-label="Back">←</button>
          <span class="app-wordmark">STH</span>
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

  function navigate(viewName) {
    if (viewName === activeView) return
    activeView = viewName

    info(CAT, `Navigate: ${viewName}`)

    backBtn.classList.toggle('hidden', viewName === 'home')
    settingsBtn.classList.toggle('hidden', viewName === 'settings')

    viewContent.innerHTML = ''

    try {
      if      (viewName === 'home')      renderHome(viewContent)
      else if (viewName === 'feed')      renderFeed(viewContent)
      else if (viewName === 'positions') renderPositions(viewContent)
      else if (viewName === 'settings')  renderSettings(viewContent)
      else if (viewName === 'whatToBuy') renderWhatToBuy(viewContent)
    } catch (e) {
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

  backBtn.addEventListener('click',    () => navigate('home'))
  settingsBtn.addEventListener('click', () => navigate('settings'))

  navigate('home')
}
