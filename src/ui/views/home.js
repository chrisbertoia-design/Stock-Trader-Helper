/**
 * Home dashboard view.
 * 4 summary cards: What's New, Top Signal, My Portfolio, What to Buy.
 * Uses mock data except Portfolio which pulls from positions store.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })
}

function fmt$(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtPct(n) {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

function fmtUploadAge(dateStr) {
  if (!dateStr) return 'unknown'
  const d = new Date(dateStr)
  if (isNaN(d)) return 'unknown'
  const diffMs   = Date.now() - d.getTime()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_FEED = {
  newCount: 4,
  topTrade: { politician: 'Pelosi', ticker: 'NVDA', action: 'buy', when: '2 days ago' },
}

const MOCK_SIGNAL = {
  ticker: 'NVDA',
  tier:   2,
  flags:  'R + D',
  stat:   '14% of Congress buying · last 14 days',
}

const MOCK_PORTFOLIO = {
  account_total:    12450,
  total_gl_pct:     2.3,
  position_count:   8,
  last_updated:     'Mar 11, 2026',
  last_purchase:    'Mar 7, 2026',
  alignment_score:  '2 of 3 aligned',
}

// ── Card builders ─────────────────────────────────────────────────────────────

function buildWhatsNewCard(navigate) {
  const { newCount, topTrade } = MOCK_FEED
  const hasNew = newCount > 0

  const card = document.createElement('div')
  card.className = 'home-card'
  card.setAttribute('role', 'button')
  card.setAttribute('tabindex', '0')
  card.innerHTML = `
    <div class="home-card-header">
      <span class="home-card-title">
        What's New
        ${hasNew ? '<span class="new-badge" aria-label="New activity"></span>' : ''}
      </span>
      <span class="home-card-chevron">›</span>
    </div>
    <div class="home-card-value">${newCount} trade${newCount !== 1 ? 's' : ''} since your last visit</div>
    <div class="home-card-sub">${topTrade.politician} · ${topTrade.ticker} · ${topTrade.action} · ${topTrade.when}</div>
  `
  card.addEventListener('click', () => navigate('feed'))
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') navigate('feed') })
  return card
}

function buildTopSignalCard(navigate) {
  const { ticker, tier, flags, stat } = MOCK_SIGNAL

  let tierClass = 'tier-subtle'
  if (tier === 2) tierClass = 'tier-accent'
  if (tier === 3) tierClass = 'tier-bright'

  const card = document.createElement('div')
  card.className = 'home-card'
  card.setAttribute('role', 'button')
  card.setAttribute('tabindex', '0')
  card.innerHTML = `
    <div class="home-card-header">
      <span class="home-card-title">Top Signal</span>
      <span class="home-card-chevron">›</span>
    </div>
    <div class="home-card-value">
      <span class="signal-ticker">${ticker}</span>
      <span class="tier-badge ${tierClass}">Tier ${tier}</span>
      <span class="signal-flags">· ${flags}</span>
    </div>
    <div class="home-card-sub">${stat}</div>
  `
  card.addEventListener('click', () => navigate('feed'))
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') navigate('feed') })
  return card
}

function buildPortfolioCard(navigate) {
  const { account_total, total_gl_pct, position_count, last_updated, last_purchase, alignment_score } = MOCK_PORTFOLIO

  const pctClass = total_gl_pct >= 0 ? 'text-buy' : 'text-sell'

  const alignMatch = alignment_score.match(/^(\d+) of (\d+)/)
  let alignColor = 'var(--sell)'
  if (alignMatch) {
    const n = parseInt(alignMatch[1], 10)
    const total = parseInt(alignMatch[2], 10)
    if (n === total)      alignColor = 'var(--buy)'
    else if (n >= total - 1) alignColor = 'var(--accent)'
    else                  alignColor = 'var(--sell)'
  }

  const card = document.createElement('div')
  card.className = 'home-card'
  card.setAttribute('role', 'button')
  card.setAttribute('tabindex', '0')
  card.innerHTML = `
    <div class="home-card-header">
      <span class="home-card-title">My Portfolio</span>
      <span class="home-card-chevron">›</span>
    </div>
    <div class="home-card-value">
      <span class="portfolio-total">${fmt$(account_total)}</span>
      <span class="portfolio-pct ${pctClass}">${fmtPct(total_gl_pct)}</span>
    </div>
    <div class="home-card-sub">${position_count} position${position_count !== 1 ? 's' : ''}</div>
    <div class="home-card-sub" style="margin-top:4px; font-size:12px; color:var(--text-tertiary)">
      Updated ${last_updated} · Last buy ${last_purchase}
    </div>
    <div class="home-card-sub" style="margin-top:6px; color:${alignColor}; font-size:12px; font-weight:500">
      ● ${alignment_score}
    </div>
  `
  card.addEventListener('click', () => navigate('positions'))
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') navigate('positions') })
  return card
}

function buildWhatToBuyCard(navigate) {
  const card = document.createElement('div')
  card.className = 'home-card'
  card.setAttribute('role', 'button')
  card.setAttribute('tabindex', '0')
  card.innerHTML = `
    <div class="home-card-header">
      <span class="home-card-title">What to Buy</span>
      <span class="home-card-chevron">›</span>
    </div>
    <div class="home-card-value">Ready to invest?</div>
    <div class="home-card-sub">Enter an amount to get slice picks</div>
  `
  card.addEventListener('click', () => navigate('whatToBuy'))
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') navigate('whatToBuy') })
  return card
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderHome(container, { navigate }) {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'home-wrapper'

  // Greeting
  const greeting = document.createElement('div')
  greeting.className = 'home-greeting'
  greeting.textContent = getGreeting()

  const dateLabel = document.createElement('div')
  dateLabel.className = 'home-date'
  dateLabel.textContent = getTodayLabel()

  const greetBlock = document.createElement('div')
  greetBlock.className = 'home-greet-block'
  greetBlock.appendChild(greeting)
  greetBlock.appendChild(dateLabel)

  // Cards
  const cardsBlock = document.createElement('div')
  cardsBlock.className = 'home-cards'
  cardsBlock.appendChild(buildWhatsNewCard(navigate))
  cardsBlock.appendChild(buildTopSignalCard(navigate))
  cardsBlock.appendChild(buildPortfolioCard(navigate))
  cardsBlock.appendChild(buildWhatToBuyCard(navigate))

  wrapper.appendChild(greetBlock)
  wrapper.appendChild(cardsBlock)
  container.appendChild(wrapper)
}
