/**
 * App shell renderer — home-first drill-down navigation.
 * Exposes window._navigate(viewName, params={}) globally.
 */

import { info }             from '../services/logger.js'
import { renderHome }       from './views/home.js'
import { renderFeed }       from './views/feed.js'
import { renderPositions }  from './views/positions.js'
import { renderSettings }   from './views/settings.js'
import { renderWhatToBuy }  from './views/whatToBuy.js'

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
      <main class="app-content" id="view-content">
        <div class="empty-state">
          <div class="loading-mark">···</div>
        </div>
      </main>
    </div>
    <div id="toast-container"></div>
  `

  const viewContent = document.getElementById('view-content')
  const backBtn     = document.getElementById('back-btn')
  const settingsBtn = document.getElementById('settings-btn')
  let   activeView  = null

  async function navigate(viewName, params = {}) {
    if (viewName === activeView && viewContent.children.length > 0) return
    activeView = viewName

    info(CAT, `Navigate to: ${viewName}`)

    // Show/hide back button
    if (viewName === 'home') {
      backBtn.classList.add('hidden')
    } else {
      backBtn.classList.remove('hidden')
    }

    // Hide settings gear when already on settings
    settingsBtn.classList.toggle('hidden', viewName === 'settings')

    viewContent.innerHTML = `<div class="empty-state"><div class="loading-sub">Loading...</div></div>`

    try {
      const ctx = { navigate }
      if      (viewName === 'home')       await renderHome(viewContent, ctx)
      else if (viewName === 'feed')       await renderFeed(viewContent, ctx)
      else if (viewName === 'positions')  await renderPositions(viewContent, ctx)
      else if (viewName === 'settings')   await renderSettings(viewContent, ctx)
      else if (viewName === 'whatToBuy')  await renderWhatToBuy(viewContent, ctx)
      else {
        viewContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-title">Unknown view</div>
            <div class="empty-state-sub">"${viewName}" is not registered.</div>
          </div>`
      }
    } catch (e) {
      // Surface the error clearly so it's visible during development
      console.error('[APP]', e)
      viewContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Something went wrong</div>
          <div class="empty-state-sub">${e.message}</div>
        </div>`
    }
  }

  // Expose globally so any view can call window._navigate(...)
  window._navigate = navigate

  backBtn.addEventListener('click', () => navigate('home'))
  settingsBtn.addEventListener('click', () => navigate('settings'))

  navigate('home')
}
