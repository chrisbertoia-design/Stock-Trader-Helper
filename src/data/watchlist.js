/**
 * Seed watchlist — politicians we track.
 * This is the startup default. Persisted to Google Sheets `watchlist` tab.
 * Categories: named | gang8 | auto
 * Tier: 1 = mirror their trades, 2 = consensus signals only
 */

export const WATCHLIST = [
  // ── Explicitly named ─────────────────────────────────────────────────────
  {
    id: 'pelosi_n',
    name: 'Nancy Pelosi',
    party: 'D', chamber: 'House', state: 'CA',
    mirror: 'Y', tier: 1, category: 'named', active: 'Y',
    notes: 'Historically high-conviction tech trades'
  },
  {
    id: 'johnson_m',
    name: 'Mike Johnson',
    party: 'R', chamber: 'House', state: 'LA',
    mirror: 'Y', tier: 1, category: 'named', active: 'Y',
    notes: 'Speaker; Gang of 8'
  },
  {
    id: 'schumer_c',
    name: 'Chuck Schumer',
    party: 'D', chamber: 'Senate', state: 'NY',
    mirror: 'Y', tier: 1, category: 'named', active: 'Y',
    notes: 'Senate Majority Leader; Gang of 8'
  },
  {
    id: 'jefferies_h',
    name: 'Hakeem Jefferies',
    party: 'D', chamber: 'House', state: 'NY',
    mirror: 'Y', tier: 1, category: 'named', active: 'Y',
    notes: 'House Minority Leader; Gang of 8'
  },

  // ── Gang of 8 (intelligence briefing recipients) ──────────────────────────
  {
    id: 'warner_m',
    name: 'Mark Warner',
    party: 'D', chamber: 'Senate', state: 'VA',
    mirror: 'Y', tier: 1, category: 'gang8', active: 'Y',
    notes: 'Senate Intel Committee Chair'
  },
  {
    id: 'cotton_t',
    name: 'Tom Cotton',
    party: 'R', chamber: 'Senate', state: 'AR',
    mirror: 'Y', tier: 1, category: 'gang8', active: 'Y',
    notes: 'Senate Intel Ranking Member'
  },
  {
    id: 'turner_m',
    name: 'Mike Turner',
    party: 'R', chamber: 'House', state: 'OH',
    mirror: 'Y', tier: 1, category: 'gang8', active: 'Y',
    notes: 'House Intel Committee Chair'
  },
  {
    id: 'himes_j',
    name: 'Jim Himes',
    party: 'D', chamber: 'House', state: 'CT',
    mirror: 'Y', tier: 1, category: 'gang8', active: 'Y',
    notes: 'House Intel Ranking Member'
  },
  {
    id: 'mcconnell_m',
    name: 'Mitch McConnell',
    party: 'R', chamber: 'Senate', state: 'KY',
    mirror: 'Y', tier: 1, category: 'gang8', active: 'Y',
    notes: 'Senate Minority Leader; Gang of 8'
  },

  // ── Auto-recommended: active traders with notable gain patterns ───────────
  {
    id: 'tuberville_t',
    name: 'Tommy Tuberville',
    party: 'R', chamber: 'Senate', state: 'AL',
    mirror: 'Y', tier: 1, category: 'auto', active: 'Y',
    notes: 'Most prolific Senate trader; energy & defense heavy'
  },
  {
    id: 'gottheimer_j',
    name: 'Josh Gottheimer',
    party: 'D', chamber: 'House', state: 'NJ',
    mirror: 'Y', tier: 1, category: 'auto', active: 'Y',
    notes: '100+ trades/yr; tech-sector focus; pre-AI-boom pattern'
  },
  {
    id: 'khanna_r',
    name: 'Ro Khanna',
    party: 'D', chamber: 'House', state: 'CA',
    mirror: 'Y', tier: 1, category: 'auto', active: 'Y',
    notes: 'Silicon Valley seat; semiconductor trades ahead of CHIPS Act'
  },
  {
    id: 'mccaul_m',
    name: 'Michael McCaul',
    party: 'R', chamber: 'House', state: 'TX',
    mirror: 'Y', tier: 1, category: 'auto', active: 'Y',
    notes: 'Consistent tech/defense gains; long-tenure pattern'
  },
  {
    id: 'greene_m',
    name: 'Marjorie Taylor Greene',
    party: 'R', chamber: 'House', state: 'GA',
    mirror: 'Y', tier: 1, category: 'auto', active: 'Y',
    notes: 'High-volume disclosure filer; aggressive buyer'
  }
]
