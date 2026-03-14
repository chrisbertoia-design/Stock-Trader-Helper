/**
 * Feed view — the primary screen.
 * Shows:
 *   - Consensus signal banner (if any active)
 *   - "New since last visit" count
 *   - Trade cards for watched politicians
 *   - Decision buttons: Follow | Pass | Not Now
 */

import { fetchAllTransactions, filterByWatchlist, getNewSinceLastVisit, computeConsensusSignals }
  from '../../api/houseStockWatcher.js'
import { ask, Prompts }                from '../../api/ai/index.js'
import { appendRows }                  from '../../api/googleSheets.js'
import { getConfig }                   from '../../stores/config.js'
import { debug, info, warn }           from '../../services/logger.js'
import { showToast }                   from '../components/toast.js'
import { WATCHLIST }                   from '../../data/watchlist.js'
import { MOCK_POSITIONS }              from '../../data/mockPositions.js'

const CAT = 'FEED'

// Party roster sizes for consensus calc (approximate, updated via config)
const PARTY_ROSTER = { D: 213, R: 220 }

export async function renderFeed(container) {
  info(CAT, 'renderFeed()')
  container.innerHTML = `<div class="feed-loading empty-state"><div class="loading-sub">Fetching trades...</div></div>`

  let transactions
  try {
    transactions = await fetchAllTransactions()
  } catch (e) {
    warn(CAT, 'Failed to load transactions', e.message)
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Could not load trade data</div>
        <div class="empty-state-sub">${e.message}</div>
        <button class="btn btn-ghost" onclick="window.location.reload()">Retry</button>
      </div>`
    return
  }

  const config         = getConfig()
  const watchedNames   = WATCHLIST.map(p => p.name)
  const newTrades      = getNewSinceLastVisit(transactions, watchedNames)
  const recentTrades   = filterByWatchlist(transactions, watchedNames, { daysBack: 30 })
  const consensusSignals = computeConsensusSignals(transactions, { config, partyRoster: PARTY_ROSTER })

  info(CAT, `Feed loaded`, {
    total_transactions: transactions.length,
    new_since_visit: newTrades.length,
    recent_watched: recentTrades.length,
    consensus_signals: consensusSignals.length
  })

  const html = `
    ${consensusSignals.length > 0 ? _renderConsensusBanner(consensusSignals) : ''}
    ${newTrades.length > 0 ? `
      <div class="feed-new-badge">
        <span class="signal-pill">
          <span class="signal-dot"></span>
          ${newTrades.length} new since your last visit
        </span>
      </div>` : ''}
    <div class="feed-header">
      <h2 class="feed-title">Recent Disclosures</h2>
      <span class="text-tertiary" style="font-size:12px">${recentTrades.length} trades · past 30 days</span>
    </div>
    <div id="trade-cards">
      ${recentTrades.length === 0
        ? `<div class="empty-state">
             <div class="empty-state-title">No recent trades</div>
             <div class="empty-state-sub">Watched politicians haven't filed disclosures in the past 30 days.</div>
           </div>`
        : recentTrades.slice(0, 20).map(_renderTradeCard).join('')
      }
    </div>
  `

  container.innerHTML = html
  _attachDecisionHandlers(container, recentTrades)
}

function _renderConsensusBanner(signals) {
  const top = signals[0]
  const pct = Math.round(top.pct_of_party * 100)
  const tierLabels = { 1: 'Elevated', 2: 'Strong Consensus', 3: 'Near-Unanimous' }
  return `
    <div class="consensus-banner card" style="border-color: rgba(232,213,176,0.3); background: var(--accent-glow); margin-bottom: var(--s4);">
      <div class="card-header" style="margin-bottom: var(--s2);">
        <div>
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent); font-weight:600; margin-bottom:4px;">
            ${tierLabels[top.tier] || 'Signal'} · ${top.party === 'D' ? 'Democrats' : 'Republicans'}
          </div>
          <div class="card-title">${top.tickers} — ${pct}% of party traded</div>
        </div>
        <span class="badge ${top.tier === 3 ? 'badge-sell' : 'badge-neutral'}">${top.member_count} members</span>
      </div>
      <div class="card-meta">${top.window_days}-day window · ${top.member_count} of ${top.party_total} members</div>
      <button class="btn btn-ghost" style="margin-top:var(--s3); font-size:12px;" data-action="explain-consensus" data-signal-idx="0">
        Ask AI to explain this signal
      </button>
    </div>
  `
}

function _renderTradeCard(trade) {
  const politician = WATCHLIST.find(p => p.name.toLowerCase() === trade.politician_name.toLowerCase())
  const amountStr  = `$${(trade.amount_low/1000).toFixed(0)}K–$${(trade.amount_high/1000).toFixed(0)}K`

  return `
    <div class="card trade-card" data-trade-id="${trade.id}">
      <div class="card-header">
        <div>
          <div style="display:flex; align-items:center; gap:var(--s2); margin-bottom:var(--s1);">
            <span class="badge ${trade.action === 'buy' ? 'badge-buy' : 'badge-sell'}">
              ${trade.action.toUpperCase()}
            </span>
            <span style="font-size:18px; font-weight:700; letter-spacing:-0.02em; font-family:var(--font-mono)">
              ${trade.ticker}
            </span>
          </div>
          <div class="card-title">${trade.politician_name}</div>
          <div class="card-meta">
            ${politician ? `${politician.party} · ${politician.chamber}` : ''}
            ${politician?.category === 'gang8' ? ' · Gang of 8' : ''}
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:13px; font-weight:500; color:var(--text-primary)">${amountStr}</div>
          <div class="card-meta">${trade.transaction_date}</div>
          <div class="card-meta" style="font-size:10px;">filed ${trade.disclosed_date}</div>
        </div>
      </div>
      <div class="ai-context" id="ai-${trade.id}" style="
        font-size:13px; color:var(--text-secondary); line-height:1.6;
        padding: var(--s3); background: var(--bg-elevated);
        border-radius: var(--r2); margin-bottom: var(--s3); display:none;">
      </div>
      <div class="decision-row">
        <button class="btn btn-follow"  data-decision="follow"   data-trade-id="${trade.id}">Follow</button>
        <button class="btn btn-pass"    data-decision="pass"     data-trade-id="${trade.id}">Pass</button>
        <button class="btn btn-later"   data-decision="not_now"  data-trade-id="${trade.id}">Not Now</button>
        <button class="btn btn-ghost"   data-decision="explain"  data-trade-id="${trade.id}"
          style="margin-left:auto; font-size:12px;">Ask AI</button>
      </div>
    </div>
  `
}

function _attachDecisionHandlers(container, trades) {
  const config = getConfig()

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-decision]')
    if (!btn) return

    const decision = btn.dataset.decision
    const tradeId  = btn.dataset.tradeId
    const trade    = trades.find(t => t.id === tradeId)
    if (!trade) return

    if (decision === 'explain') {
      const aiBox = document.getElementById(`ai-${tradeId}`)
      if (!aiBox) return
      aiBox.style.display = 'block'
      aiBox.textContent = 'Thinking...'
      try {
        const { system, prompt } = Prompts.tradeContext({
          disclosure:    trade,
          userPositions: MOCK_POSITIONS,
          watchedPolitician: WATCHLIST.find(p => p.name.toLowerCase() === trade.politician_name.toLowerCase())
        })
        const text = await ask(prompt, { system, config })
        aiBox.textContent = text
        info(CAT, `AI explain completed for ${tradeId}`)
      } catch (e) {
        warn(CAT, 'AI explain failed', e.message)
        aiBox.textContent = `AI unavailable: ${e.message}`
      }
      return
    }

    // Follow / Pass / Not Now → save to Sheets
    debug(CAT, `Decision: ${decision} on ${tradeId}`)
    const row = [
      `dec_${Date.now()}`,
      tradeId,
      decision,
      '',   // invest_amount filled in follow modal
      '',   // slice_count
      new Date().toISOString(),
      '',   // revisit_date
      ''
    ]

    if (decision === 'follow') {
      // Open investment amount modal
      import('./followModal.js').then(m => m.showFollowModal({ trade, config }))
    } else {
      await appendRows('my_decisions', [row])
      showToast(decision === 'pass' ? 'Passed on this trade' : 'Saved for later')
      // Dim the card
      const card = container.querySelector(`.trade-card[data-trade-id="${tradeId}"]`)
      if (card) card.style.opacity = '0.4'
    }
  })
}
