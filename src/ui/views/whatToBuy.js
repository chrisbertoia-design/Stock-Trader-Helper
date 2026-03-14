/**
 * What to Buy screen — investment slice recommendations.
 * Step 1: Dollar amount input with quick-select pills
 * Step 2: Ranked slice picks with rationale and position gaps
 */

const MOCK_PICKS = [
  { ticker: 'NVDA', pct: 0.40, rationale: 'Pelosi + 14% of Congress buying. AI chip tailwind.', followed: true,  owned: 0 },
  { ticker: 'MSFT', pct: 0.35, rationale: 'Crenshaw bought recently. Strong enterprise AI demand.', followed: false, owned: 0 },
  { ticker: 'AAPL', pct: 0.25, rationale: 'Bipartisan buying pattern. You own $4,200 — small add.', followed: false, owned: 4200 },
]

const QUICK_AMOUNTS = [100, 250, 500, 1000]
const MIN_AMOUNT = 50
const MAX_AMOUNT = 10000

export async function renderWhatToBuy(container, { navigate } = {}) {
  container.innerHTML = _renderStep1()

  // Attach event listeners for step 1
  document.getElementById('amount-input').addEventListener('input', (e) => {
    const error = document.getElementById('amount-error')
    if (error) error.remove()
  })

  QUICK_AMOUNTS.forEach(amount => {
    document.getElementById(`pill-${amount}`).addEventListener('click', () => {
      document.getElementById('amount-input').value = amount
      const error = document.getElementById('amount-error')
      if (error) error.remove()
    })
  })

  document.getElementById('get-picks-btn').addEventListener('click', () => {
    const input = document.getElementById('amount-input')
    const amount = parseInt(input.value, 10)

    // Clear any previous errors
    const existingError = document.getElementById('amount-error')
    if (existingError) existingError.remove()

    // Validate
    if (!amount || amount === 0) {
      _showError(input, 'Enter an amount to continue')
      return
    }
    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      _showError(input, `Enter an amount between $${MIN_AMOUNT} and $${MAX_AMOUNT}`)
      return
    }

    // Show step 2
    container.innerHTML = _renderStep2(amount)

    // Attach event listeners for step 2
    document.getElementById('change-amount-link').addEventListener('click', (e) => {
      e.preventDefault()
      renderWhatToBuy(container, { navigate })
    })

    document.getElementById('schwab-link').addEventListener('click', (e) => {
      e.preventDefault()
      window.open('https://www.schwab.com/stock-slices', '_blank')
    })
  })

  // Allow Enter key to submit
  document.getElementById('amount-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('get-picks-btn').click()
    }
  })
}

function _renderStep1() {
  return `
    <div style="max-width:480px; margin:0 auto;">
      <div class="card" style="padding:var(--s5);">
        <div style="margin-bottom:var(--s5);">
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s4); color:var(--text-primary);">How much are you investing?</h2>

          <div style="display:flex; align-items:center; margin-bottom:var(--s4);">
            <span style="font-size:18px; color:var(--text-secondary); margin-right:var(--s2);">$</span>
            <input
              id="amount-input"
              type="number"
              placeholder="5000"
              style="
                flex:1;
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

          <div style="display:flex; gap:var(--s2); flex-wrap:wrap; margin-bottom:var(--s5);">
            ${QUICK_AMOUNTS.map(amount => `
              <button
                id="pill-${amount}"
                style="
                  padding:var(--s2) var(--s3);
                  background:var(--bg-elevated);
                  border:1px solid var(--border-soft);
                  border-radius:var(--r2);
                  color:var(--text-secondary);
                  font-size:13px;
                  cursor:pointer;
                  transition:all var(--fast) var(--ease);
                "
                onmouseover="this.style.borderColor='var(--border-hard)'; this.style.color='var(--text-primary)'"
                onmouseout="this.style.borderColor='var(--border-soft)'; this.style.color='var(--text-secondary)'"
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
            Get Picks →
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

function _renderStep2(totalAmount) {
  const picks = MOCK_PICKS.map((pick, idx) => ({
    ...pick,
    rank: idx + 1,
    allocAmount: Math.round(totalAmount * pick.pct / 25) * 25,
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
            transition:color var(--fast) var(--ease);
          " onmouseover="this.style.color='var(--text-primary)'" onmouseout="this.style.color='var(--text-secondary)'">
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
          <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:var(--s4);">
            ${picks.length} picks · based on recent signals
          </div>
        </div>

        ${picks.map(pick => _renderPickCard(pick)).join('')}

        <button
          id="schwab-link"
          class="btn btn-ghost"
          style="
            width:100%;
            padding:var(--s4);
            font-size:13px;
            margin-top:var(--s5);
            justify-content:center;
          "
        >
          Open in Schwab Stock Slices ↗
        </button>
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
              $${pick.allocAmount.toLocaleString()} (${(pick.pct * 100).toFixed(0)}%)
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
            <div style="
              font-size:11px;
              color:var(--buy);
              font-weight:500;
            ">
              ✓ You followed this trade
            </div>
          ` : ''}
          ${!pick.followed && pick.owned === 0 ? `
            <div style="
              font-size:11px;
              color:var(--text-tertiary);
            ">
              Gap: you own $0
            </div>
          ` : ''}
          ${!pick.followed && pick.owned > 0 ? `
            <div style="
              font-size:11px;
              color:var(--text-tertiary);
            ">
              You own $${pick.owned.toLocaleString()} — small add.
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `
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
