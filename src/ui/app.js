/**
 * App shell renderer.
 * Three views: Feed | Positions | Settings
 */

import { info }                        from '../services/logger.js'
import { renderFeed }                  from './views/feed.js'
import { renderPositions }             from './views/positions.js'
import { renderSettings }              from './views/settings.js'

const CAT = 'APP_SHELL'

export function renderApp({ spreadsheetId }) {
  info(CAT, 'Rendering app shell')

  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <span class="app-wordmark">STH</span>
        <nav class="app-nav">
          <button class="nav-btn active" data-view="feed">Feed</button>
          <button class="nav-btn" data-view="positions">Positions</button>
          <button class="nav-btn" data-view="settings">Settings</button>
        </nav>
        <div id="sync-status" class="sync-dot"></div>
      </header>
      <main class="app-content" id="view-content">
        <div class="empty-state">
          <div class="loading-mark">···</div>
        </div>
      </main>
    </div>
    <div id="toast-container"></div>
  `

  // Navigation
  const navBtns   = document.querySelectorAll('.nav-btn')
  const viewContent = document.getElementById('view-content')
  let   activeView = 'feed'

  async function switchView(view) {
    if (view === activeView && viewContent.children.length > 0) return
    activeView = view

    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === view))
    viewContent.innerHTML = `<div class="empty-state"><div class="loading-sub">Loading...</div></div>`

    info(CAT, `Switch to view: ${view}`)
    try {
      if      (view === 'feed')      await renderFeed(viewContent)
      else if (view === 'positions') await renderPositions(viewContent)
      else if (view === 'settings')  await renderSettings(viewContent)
    } catch (e) {
      viewContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Something went wrong</div>
          <div class="empty-state-sub">${e.message}</div>
        </div>`
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view))
  })

  switchView('feed')
}
