/**
 * Follow modal — shown when user taps "Follow" on a trade card.
 * Collects: total invest amount, confirms slice allocation.
 * Stock Slice rules: 3–30 stocks, min $5/stock, S&P 500 eligible.
 */

import { ask, Prompts }     from '../../api/ai/index.js'
import { appendRows }       from '../../api/googleSheets.js'
import { getConfig }        from '../../stores/config.js'
import { getPositions, loadPositions, isLoaded } from '../../stores/positions.js'
import { getSP500Tickers }  from '../../services/sp500.js'
import { info, debug }      from '../../services/logger.js'
import { showToast }        from '../components/toast.js'

const CAT = 'FOLLOW_MODAL'

export async function showFollowModal({ trade, config }) {
  info(CAT, `showFollowModal for ${trade.ticker}`)
  config = config || getConfig()

  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.75);
    display:flex; align-items:flex-end; justify-content:center;
    z-index:998; padding-bottom:env(safe-area-inset-bottom);
  `
  overlay.innerHTML = `
    <div style="background:var(--bg-raised); border:1px solid var(--border-soft);
      border-radius:var(--r4) var(--r4) 0 0; padding:var(--s6);
      width:min(560px, 100%); max-height:85vh; overflow-y:auto;">

      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s5);">
        <div>
          <div style="display:flex; align-items:center; gap:var(--s2); margin-bottom:4px;">
            <span class="badge ${trade.action === 'buy' ? 'badge-buy' : 'badge-sell'}">${trade.action.toUpperCase()}</span>
            <span style="font-family:var(--font-mono); font-size:18px; font-weight:700;">${trade.ticker}</span>
          </div>
          <div style="font-size:12px; color:var(--text-tertiary);">${trade.politician_name}</div>
        </div>
        <button id="close-modal" class="btn btn-ghost" style="padding:var(--s2);">✕</button>
      </div>

      <div class="divider"></div>

      <div style="margin:var(--s4) 0;">
        <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:var(--s2);">
          How much do you want to invest?
        </label>
        <div style="display:flex; align-items:center; gap:var(--s2);">
          <span style="color:var(--text-secondary); font-size:18px;">$</span>
          <input id="invest-amount" type="number" min="15" step="5" value="100" placeholder="100"
            style="flex:1; font-size:22px; font-weight:600; letter-spacing:-0.02em;
              background:transparent; border:none; border-bottom:1px solid var(--border-soft);
              color:var(--text-primary); padding:var(--s2) 0; outline:none; font-family:var(--font-sans);" />
        </div>
        <div style="font-size:11px; color:var(--text-tertiary); margin-top:var(--s1);">Minimum $15 (3 stocks × $5)</div>
      </div>

      <div style="margin-bottom:var(--s4);">
        <label style="font-size:12px; color:var(--text-secondary); display:block; margin-bottom:var(--s2);">
          Stocks in slice
        </label>
        <div style="display:flex; gap:var(--s2);">
          ${[1, 3, 5, 10].map(n => `
            <button class="btn btn-ghost slice-preset ${n===1?'active':''}" data-count="${n}"
              style="${n===1 ? 'background:var(--accent-dim); border-color:var(--accent); color:var(--accent);' : ''} font-size:13px; flex:1;">
              ${n === 1 ? 'Single' : n}
            </button>`).join('')}
        </div>
      </div>

      <div id="slice-preview" style="min-height:60px; margin-bottom:var(--s4);"></div>

      <button class="btn btn-primary" id="confirm-follow" style="width:100%;">
        Build Slice Allocation
      </button>
    </div>
  `

  document.body.appendChild(overlay)

  let sliceCount = 1
  let allocation = []

  // Close
  document.getElementById('close-modal').onclick = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

  // Slice presets
  overlay.querySelectorAll('.slice-preset').forEach(btn => {
    btn.onclick = () => {
      overlay.querySelectorAll('.slice-preset').forEach(b => {
        b.style.background = ''
        b.style.borderColor = ''
        b.style.color = ''
      })
      btn.style.background = 'var(--accent-dim)'
      btn.style.borderColor = 'var(--accent)'
      btn.style.color = 'var(--accent)'
      sliceCount = parseInt(btn.dataset.count)
    }
  })

  // Confirm → run AI allocation
  document.getElementById('confirm-follow').onclick = async () => {
    const amount   = parseFloat(document.getElementById('invest-amount').value)
    const minTotal = sliceCount * 5

    if (isNaN(amount) || amount < minTotal) {
      showToast(`Minimum $${minTotal} for ${sliceCount} stock${sliceCount > 1 ? 's' : ''}`)
      return
    }

    if (!isLoaded()) {
      try { await loadPositions() } catch (e) { debug(CAT, 'Positions load skipped', e.message) }
    }

    const confirmBtn = document.getElementById('confirm-follow')
    if (!confirmBtn) return
    confirmBtn.textContent = 'Building allocation...'
    confirmBtn.disabled = true

    debug(CAT, 'Building slice allocation', { amount, sliceCount, ticker: trade.ticker })

    try {
      const sp500 = await getSP500Tickers()
      const tickers = [trade.ticker, ...Object.keys(getPositions())
        .filter(t => sp500.has(t) && t !== trade.ticker)
        .slice(0, sliceCount - 1)]

      const signalStrengths = Object.fromEntries(
        tickers.map((t, i) => [t, i === 0 ? 1.0 : 0.5 - i * 0.05])
      )

      let allocationResult
      try {
        const { system, prompt } = Prompts.sliceAllocation({
          totalAmount: amount, tickers, userPositions: getPositions(), signalStrengths
        })
        const raw = await ask(prompt, { system, config })
        const jsonMatch = raw.match(/\[[\s\S]*\]/)
        allocationResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch (e) {
        debug(CAT, 'AI allocation failed, using even split', e.message)
        allocationResult = null
      }

      // Fallback: even split
      if (!allocationResult) {
        const perStock = Math.floor(amount / tickers.length / 5) * 5
        allocationResult = tickers.map(t => ({ ticker: t, amount: perStock }))
      }

      allocation = allocationResult
      _renderAllocationPreview(overlay, allocation, amount, sp500)
      confirmBtn.textContent = 'Confirm & Save Decision'
      confirmBtn.disabled = false

      confirmBtn.onclick = async () => {
        await _saveDecision(trade, amount, allocation, sp500)
        showToast('Decision saved')
        overlay.remove()
      }
    } catch (e) {
      confirmBtn.textContent = 'Build Slice Allocation'
      confirmBtn.disabled = false
      showToast(`Error: ${e.message}`)
    }
  }
}

function _renderAllocationPreview(overlay, allocation, total, sp500) {
  const preview = overlay.querySelector('#slice-preview')
  const allTotal = allocation.reduce((s, a) => s + a.amount, 0)

  preview.innerHTML = `
    <div style="margin-bottom:var(--s3);">
      <div style="font-size:12px; color:var(--text-secondary); margin-bottom:var(--s2);">Allocation</div>
      ${allocation.map(a => `
        <div style="display:flex; align-items:center; justify-content:space-between;
          padding:var(--s2) 0; border-bottom:1px solid var(--border-subtle);">
          <div style="display:flex; align-items:center; gap:var(--s2);">
            <span style="font-family:var(--font-mono); font-size:13px; font-weight:600;">${a.ticker}</span>
            ${sp500?.has(a.ticker) ? `<span style="font-size:10px; color:var(--text-tertiary);">S&P</span>` : ''}
          </div>
          <span style="font-size:13px; font-weight:500;">$${a.amount.toFixed(2)}</span>
        </div>`).join('')}
      <div style="display:flex; justify-content:space-between; padding-top:var(--s2);
        font-size:13px; font-weight:600;">
        <span>Total</span>
        <span style="color:${Math.abs(allTotal - total) < 0.01 ? 'var(--buy)' : 'var(--sell)'}">
          $${allTotal.toFixed(2)}
        </span>
      </div>
    </div>
  `
}

async function _saveDecision(trade, amount, allocation, sp500) {
  const decId = `dec_${Date.now()}`
  info(CAT, `Saving decision ${decId}`, { ticker: trade.ticker, amount, slices: allocation.length })

  await appendRows('my_decisions', [[
    decId, trade.id, 'follow', amount, allocation.length,
    new Date().toISOString(), '', ''
  ]])

  await appendRows('my_allocations', allocation.map((a, i) => [
    `alloc_${Date.now()}_${i}_${a.ticker}`, decId,
    a.ticker, a.amount, sp500?.has(a.ticker) ? 'Y' : 'N', 'N', '', ''
  ]))
}
