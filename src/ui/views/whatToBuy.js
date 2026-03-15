/**
 * What to Buy screen — investment slice recommendations.
 * Step 1: Dollar amount input with quick-select pills
 * Step 2: Ranked slice picks with rationale + summary table
 */

const MOCK_PICKS = [
  { ticker: 'NVDA', pct: 0.40, rationale: 'Pelosi + 14% of Congress buying. AI chip tailwind.', followed: true,  owned: 2800,  alignment: 'aligned'  },
  { ticker: 'MSFT', pct: 0.35, rationale: 'Crenshaw bought recently. Strong enterprise AI demand.', followed: false, owned: 0,     alignment: 'gap'      },
  { ticker: 'AAPL', pct: 0.25, rationale: 'Bipartisan buying pattern. Modest add recommended.', followed: false, owned: 4200,  alignment: 'aligned'  },
]

const DEFAULT_AMOUNT    = 150
const QUICK_AMOUNTS     = [150, 250, 500, 1000]
const MIN_AMOUNT        = 50
const MAX_AMOUNT        = 10000
const DEFAULT_PICK_COUNT = MOCK_PICKS.length  // defaults to available recommendations
const MAX_PICK_COUNT    = 30

export function renderWhatToBuy(container) {
  container.innerHTML = _renderStep1()

  // Pill buttons — set amount input value
  container.querySelector('#amount-pills').addEventListener('click', (e) => {
    const pill = e.target.closest('[data-amount]')
    if (!pill) return
    container.querySelector('#amount-input').value = pill.dataset.amount
    const error = container.querySelector('#amount-error')
    if (error) error.remove()
    _updatePicksBtn(container)
  })

  // Clear error on type; update button label dynamically
  container.querySelector('#amount-input').addEventListener('input', () => {
    const error = container.querySelector('#amount-error')
    if (error) error.remove()
    _updatePicksBtn(container)
  })

  // Stepper buttons
  container.querySelector('#pick-decrement').addEventListener('click', () => {
    const inp = container.querySelector('#pick-count-display')
    const val = Math.max(1, parseInt(inp.textContent, 10) - 1)
    inp.textContent = val
    _updatePicksBtn(container)
  })
  container.querySelector('#pick-increment').addEventListener('click', () => {
    const inp = container.querySelector('#pick-count-display')
    const val = Math.min(MOCK_PICKS.length, parseInt(inp.textContent, 10) + 1)
    inp.textContent = val
    _updatePicksBtn(container)
  })

  // Submit
  container.querySelector('#get-picks-btn').addEventListener('click', () => _submit(container))

  // Enter key
  container.querySelector('#amount-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') _submit(container)
  })
}

function _updatePicksBtn(container) {
  const count  = parseInt(container.querySelector('#pick-count-display')?.textContent, 10) || DEFAULT_PICK_COUNT
  const amount = parseInt(container.querySelector('#amount-input')?.value, 10) || 0
  const btn    = container.querySelector('#get-picks-btn')
  if (btn) btn.textContent = `Get ${count} Pick${count !== 1 ? 's' : ''} →`

  // Per-slice minimum warning
  const existing = container.querySelector('#slice-warning')
  if (existing) existing.remove()
  if (amount > 0 && count > 0 && amount / count < 5) {
    const warn = document.createElement('div')
    warn.id = 'slice-warning'
    warn.style.cssText = `color:var(--sell);font-size:12px;margin-top:var(--s2);`
    warn.textContent = `Minimum $5 per slice — reduce picks or increase amount.`
    container.querySelector('#get-picks-btn').after(warn)
  }
}

function _submit(container) {
  const input      = container.querySelector('#amount-input')
  const pickDisplay = container.querySelector('#pick-count-display')
  const amount      = parseInt(input.value, 10)
  const pickCount   = Math.min(Math.max(parseInt(pickDisplay?.textContent, 10) || DEFAULT_PICK_COUNT, 1), MOCK_PICKS.length)

  const existingError = container.querySelector('#amount-error')
  if (existingError) existingError.remove()

  if (!amount || amount === 0) {
    _showError(input, 'Enter an amount to continue')
    return
  }
  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    _showError(input, `Enter an amount between $${MIN_AMOUNT.toLocaleString()} and $${MAX_AMOUNT.toLocaleString()}`)
    return
  }

  container.innerHTML = _renderStep2(amount, pickCount)

  container.querySelector('#change-amount-link').addEventListener('click', (e) => {
    e.preventDefault()
    renderWhatToBuy(container)
  })
}

function _renderStep1() {
  return `
    <div style="max-width:480px; margin:0 auto;">
      <div class="card" style="padding:var(--s5);">
        <div style="margin-bottom:var(--s5);">
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s4); color:var(--text-primary);">How much are you investing?</h2>

          <!-- Amount input row -->
          <div style="display:flex; align-items:center; gap:var(--s2); margin-bottom:var(--s3);">
            <span style="font-size:18px; color:var(--text-secondary);">$</span>
            <input
              id="amount-input"
              type="number"
              value="${DEFAULT_AMOUNT}"
              placeholder="${DEFAULT_AMOUNT}"
              style="
                flex:1;
                min-width:0;
                background:var(--bg-primary);
                border:1px solid var(--border-soft);
                border-radius:var(--r2);
                padding:var(--s3) var(--s4);
                font-size:18px;
                color:var(--text-primary);
                font-family:var(--font-mono);
                transition:border-color var(--fast) var(--ease);
              "
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='var(--border-soft)'"
            />
          </div>

          <!-- Pick count stepper row -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s4);">
            <span style="font-size:13px; color:var(--text-secondary);"># of picks</span>
            <div style="display:flex; align-items:center; gap:var(--s2);">
              <button id="pick-decrement" style="
                width:44px; height:44px;
                background:var(--bg-elevated);
                border:1px solid var(--border-soft);
                border-radius:var(--r2);
                color:var(--text-secondary);
                font-size:20px; cursor:pointer;
              ">−</button>
              <span id="pick-count-display" style="
                width:32px;
                text-align:center;
                font-size:18px;
                font-family:var(--font-mono);
                font-weight:600;
                color:var(--text-primary);
              ">${DEFAULT_PICK_COUNT}</span>
              <button id="pick-increment" style="
                width:44px; height:44px;
                background:var(--bg-elevated);
                border:1px solid var(--border-soft);
                border-radius:var(--r2);
                color:var(--text-secondary);
                font-size:20px; cursor:pointer;
              ">+</button>
              <span style="font-size:12px; color:var(--text-tertiary); margin-left:var(--s2);">${DEFAULT_PICK_COUNT} available</span>
            </div>
          </div>

          <div id="amount-pills" style="display:flex; gap:var(--s2); flex-wrap:wrap; margin-bottom:var(--s5);">
            ${QUICK_AMOUNTS.map(amount => `
              <button
                data-amount="${amount}"
                style="
                  padding:var(--s2) var(--s4);
                  background:var(--bg-elevated);
                  border:1px solid var(--border-soft);
                  border-radius:var(--r2);
                  color:var(--text-secondary);
                  font-size:13px;
                  cursor:pointer;
                  min-height:36px;
                "
              >
                $${amount.toLocaleString()}
              </button>
            `).join('')}
          </div>

          <button
            id="get-picks-btn"
            class="btn btn-primary"
            style="width:100%; padding:var(--s4); font-size:14px;"
          >
            Get ${DEFAULT_PICK_COUNT} Pick${DEFAULT_PICK_COUNT !== 1 ? 's' : ''} →
          </button>
        </div>

        <div style="
          padding-top:var(--s4);
          border-top:1px solid var(--border-subtle);
          font-size:12px;
          color:var(--text-tertiary);
          line-height:1.6;
        ">
          Based on congressional signals, your followed trades, and current positions.
        </div>
      </div>
    </div>
  `
}

function _renderStep2(totalAmount, pickCount) {
  // Slice to requested count (capped by available mock data)
  const available = MOCK_PICKS.slice(0, pickCount)
  const perPick   = Math.round(totalAmount / available.length / 25) * 25
  const picks = available.map((pick, idx) => ({
    ...pick,
    rank: idx + 1,
    allocAmount: perPick,
  }))

  return `
    <div style="max-width:480px; margin:0 auto;">
      <div class="card" style="padding:var(--s5);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s5);">
          <a id="change-amount-link" href="#" style="
            color:var(--text-secondary);
            text-decoration:none;
            font-size:13px;
            cursor:pointer;
          ">
            ← Change amount
          </a>
          <span style="
            font-size:18px;
            font-weight:600;
            color:var(--text-primary);
            font-family:var(--font-mono);
          ">
            $${totalAmount.toLocaleString()}
          </span>
        </div>

        <div style="margin-bottom:var(--s5);">
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1); color:var(--text-primary);">Recommended Slices</h2>
          <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:var(--s2);">
            ${picks.length} pick${picks.length !== 1 ? 's' : ''} · based on recent signals
            ${pickCount > MOCK_PICKS.length ? ` <span style="color:var(--accent);">(${MOCK_PICKS.length} available today)</span>` : ''}
          </div>
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:var(--s4);">
            Portfolio match: ${_alignmentSummary(picks)}
          </div>
        </div>

        ${picks.map(pick => _renderPickCard(pick)).join('')}

        <!-- Summary table -->
        <div style="margin-top:var(--s5); border-top:1px solid var(--border-subtle); padding-top:var(--s5);">
          <div style="font-size:12px; font-weight:600; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:var(--s3);">Order Summary</div>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="color:var(--text-tertiary); font-size:11px; text-transform:uppercase; letter-spacing:0.06em;">
                <th style="text-align:left; padding:var(--s2) 0; font-weight:500;">Symbol</th>
                <th style="text-align:center; padding:var(--s2) 0; font-weight:500;">Action</th>
                <th style="text-align:right; padding:var(--s2) 0; font-weight:500;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${picks.map(pick => `
                <tr style="border-top:1px solid var(--border-subtle);">
                  <td style="padding:var(--s3) 0; font-family:var(--font-mono); font-weight:600; color:var(--text-primary);">${pick.ticker}</td>
                  <td style="padding:var(--s3) 0; text-align:center; color:var(--buy); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">BUY</td>
                  <td style="padding:var(--s3) 0; text-align:right; font-family:var(--font-mono); color:var(--text-primary); font-weight:500;">$${pick.allocAmount.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr style="border-top:1px solid var(--border-soft);">
                <td colspan="2" style="padding:var(--s3) 0; color:var(--text-tertiary); font-size:12px;">Total</td>
                <td style="padding:var(--s3) 0; text-align:right; font-family:var(--font-mono); font-weight:600; color:var(--text-primary);">$${picks.reduce((s, p) => s + p.allocAmount, 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

function _renderPickCard(pick) {
  return `
    <div class="card" style="
      padding:var(--s4);
      margin-bottom:var(--s3);
      background:var(--bg-secondary);
      border-color:var(--border-subtle);
    ">
      <div style="display:flex; gap:var(--s4); margin-bottom:var(--s3);">
        <div style="
          flex-shrink:0;
          font-family:var(--font-mono);
          font-size:20px;
          font-weight:600;
          color:var(--text-secondary);
        ">
          #${pick.rank}
        </div>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s1);">
            <span style="
              font-family:var(--font-mono);
              font-size:15px;
              font-weight:600;
              color:var(--text-primary);
            ">
              ${pick.ticker}
            </span>
            <span style="
              font-size:14px;
              font-weight:500;
              color:var(--text-primary);
            ">
              $${pick.allocAmount.toLocaleString()} <span style="color:var(--text-tertiary);font-size:12px;">(${(pick.pct * 100).toFixed(0)}%)</span>
            </span>
          </div>
          <div style="
            font-size:12px;
            color:var(--text-secondary);
            line-height:1.5;
            margin-bottom:var(--s2);
          ">
            ${pick.rationale}
          </div>
          ${pick.followed ? `
            <div style="font-size:11px; color:var(--buy); font-weight:500;">✓ You followed this trade</div>
          ` : ''}
          ${!pick.followed && pick.owned === 0 ? `
            <div style="font-size:11px; color:var(--text-tertiary);">Gap: you own $0</div>
          ` : ''}
          ${!pick.followed && pick.owned > 0 ? `
            <div style="font-size:11px; color:var(--text-tertiary);">You own $${pick.owned.toLocaleString()} — small add.</div>
          ` : ''}
          ${_alignmentBadge(pick.alignment)}
        </div>
      </div>
    </div>
  `
}

function _alignmentBadge(alignment) {
  const map = {
    aligned:  { icon: '✅', label: 'Aligned with your portfolio',  color: 'var(--buy)'  },
    gap:      { icon: '🔵', label: 'You don\'t own this yet — gap opportunity', color: 'var(--accent)' },
    diverged: { icon: '⚠️', label: 'Signal conflicts with your holdings', color: 'var(--sell)' },
  }
  const { icon, label, color } = map[alignment] || map.gap
  return `<div style="margin-top:8px; font-size:11px; color:${color}; font-weight:500;">${icon} ${label}</div>`
}

function _alignmentSummary(picks) {
  const aligned  = picks.filter(p => p.alignment === 'aligned').length
  const gaps     = picks.filter(p => p.alignment === 'gap').length
  const diverged = picks.filter(p => p.alignment === 'diverged').length
  const parts = []
  if (aligned)  parts.push(`<span style="color:var(--buy)">${aligned} aligned</span>`)
  if (gaps)     parts.push(`<span style="color:var(--accent)">${gaps} gap${gaps>1?'s':''}</span>`)
  if (diverged) parts.push(`<span style="color:var(--sell)">${diverged} conflict${diverged>1?'s':''}</span>`)
  return parts.join(' · ')
}

function _showError(inputElement, message) {
  const error = document.createElement('div')
  error.id = 'amount-error'
  error.style.cssText = `
    color:var(--sell);
    font-size:12px;
    margin-top:var(--s2);
    padding:var(--s2) var(--s3);
    background:rgba(196,123,110,0.12);
    border:1px solid rgba(196,123,110,0.2);
    border-radius:var(--r2);
  `
  error.textContent = message
  inputElement.parentElement.appendChild(error)
}
