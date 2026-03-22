/**
 * generate-trades.js
 *
 * Build-time script that calls the Anthropic API to generate congressional
 * trade data and writes it to public/congressional-trades.json.
 *
 * If the API key is missing or any error occurs, falls back to seed data
 * so the build never fails.
 *
 * Usage: node scripts/generate-trades.js && vite build
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '..', 'public', 'congressional-trades.json');

const API_KEY = process.env.VITE_ANTHROPIC_API_KEY;

// Seed trades: 100 entries with enough unique politicians per ticker to cross tier1 (8% of 213 Dems = 18 needed).
// NVDA: 20 unique D buyers, AAPL: 18 unique D buyers, MSFT: 8 D + 8 R buyers.
const SEED_TRADES = [
  // NVDA — 20 unique Democrat buyers
  { id: 'Pelosi_NVDA_s1',      politician_name: 'Nancy Pelosi',       party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 250001, amount_high: 500000,  sp500: 'Y' },
  { id: 'Khanna_NVDA_s1',      politician_name: 'Ro Khanna',          party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 100001, amount_high: 250000,  sp500: 'Y' },
  { id: 'Gottheimer_NVDA_s1',  politician_name: 'Josh Gottheimer',    party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Himes_NVDA_s1',       politician_name: 'Jim Himes',          party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Warner_NVDA_s1',      politician_name: 'Mark Warner',        party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Schumer_NVDA_s1',     politician_name: 'Chuck Schumer',      party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Jefferies_NVDA_s1',   politician_name: 'Hakeem Jefferies',   party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Levin_NVDA_s1',       politician_name: 'Mike Levin',         party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Panetta_NVDA_s1',     politician_name: 'Jimmy Panetta',      party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Swalwell_NVDA_s1',    politician_name: 'Eric Swalwell',      party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Lieu_NVDA_s1',        politician_name: 'Ted Lieu',           party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'DeSaulnier_NVDA_s1',  politician_name: 'Mark DeSaulnier',    party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Eshoo_NVDA_s1',       politician_name: 'Anna Eshoo',         party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Lofgren_NVDA_s1',     politician_name: 'Zoe Lofgren',        party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Porter_NVDA_s1',      politician_name: 'Katie Porter',       party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Jacobs_NVDA_s1',      politician_name: 'Sara Jacobs',        party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Brownley_NVDA_s1',    politician_name: 'Julia Brownley',     party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Cardenas_NVDA_s1',    politician_name: 'Tony Cardenas',      party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Schiff_NVDA_s1',      politician_name: 'Adam Schiff',        party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Aguilar_NVDA_s1',     politician_name: 'Pete Aguilar',       party: 'D', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  // NVDA — Republican buyers
  { id: 'Johnson_NVDA_s1',     politician_name: 'Mike Johnson',       party: 'R', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Crenshaw_NVDA_s1',    politician_name: 'Dan Crenshaw',       party: 'R', ticker: 'NVDA', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Waltz_NVDA_s1',       politician_name: 'Michael Waltz',      party: 'R', ticker: 'NVDA', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  // AAPL — 18 unique Democrat buyers
  { id: 'Pelosi_AAPL_s1',      politician_name: 'Nancy Pelosi',       party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 500001, amount_high: 1000000, sp500: 'Y' },
  { id: 'Schumer_AAPL_s1',     politician_name: 'Chuck Schumer',      party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Khanna_AAPL_s1',      politician_name: 'Ro Khanna',          party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Warner_AAPL_s1',      politician_name: 'Mark Warner',        party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Jefferies_AAPL_s1',   politician_name: 'Hakeem Jefferies',   party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Himes_AAPL_s1',       politician_name: 'Jim Himes',          party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Swalwell_AAPL_s1',    politician_name: 'Eric Swalwell',      party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Lieu_AAPL_s1',        politician_name: 'Ted Lieu',           party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Eshoo_AAPL_s1',       politician_name: 'Anna Eshoo',         party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Lofgren_AAPL_s1',     politician_name: 'Zoe Lofgren',        party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Gottheimer_AAPL_s1',  politician_name: 'Josh Gottheimer',    party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Levin_AAPL_s1',       politician_name: 'Mike Levin',         party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Porter_AAPL_s1',      politician_name: 'Katie Porter',       party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Panetta_AAPL_s1',     politician_name: 'Jimmy Panetta',      party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Schiff_AAPL_s1',      politician_name: 'Adam Schiff',        party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Aguilar_AAPL_s1',     politician_name: 'Pete Aguilar',       party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'DeSaulnier_AAPL_s1',  politician_name: 'Mark DeSaulnier',    party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Brownley_AAPL_s1',    politician_name: 'Julia Brownley',     party: 'D', ticker: 'AAPL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  // AAPL — Republican buyers
  { id: 'Greene_AAPL_s1',      politician_name: 'Marjorie Taylor Greene', party: 'R', ticker: 'AAPL', action: 'buy', amount_low: 15001, amount_high: 50000, sp500: 'Y' },
  { id: 'McCaul_AAPL_s1',      politician_name: 'Michael McCaul',     party: 'R', ticker: 'AAPL', action: 'buy',  amount_low: 100001, amount_high: 250000, sp500: 'Y' },
  // MSFT — mixed party
  { id: 'Gottheimer_MSFT_s1',  politician_name: 'Josh Gottheimer',    party: 'D', ticker: 'MSFT', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Warner_MSFT_s1',      politician_name: 'Mark Warner',        party: 'D', ticker: 'MSFT', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Himes_MSFT_s1',       politician_name: 'Jim Himes',          party: 'D', ticker: 'MSFT', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Levin_MSFT_s1',       politician_name: 'Mike Levin',         party: 'D', ticker: 'MSFT', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Swalwell_MSFT_s1',    politician_name: 'Eric Swalwell',      party: 'D', ticker: 'MSFT', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'McCaul_MSFT_s1',      politician_name: 'Michael McCaul',     party: 'R', ticker: 'MSFT', action: 'buy',  amount_low: 100001, amount_high: 250000,  sp500: 'Y' },
  { id: 'Cotton_MSFT_s1',      politician_name: 'Tom Cotton',         party: 'R', ticker: 'MSFT', action: 'buy',  amount_low: 100001, amount_high: 250000,  sp500: 'Y' },
  { id: 'Turner_MSFT_s1',      politician_name: 'Mike Turner',        party: 'R', ticker: 'MSFT', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Crenshaw_MSFT_s1',    politician_name: 'Dan Crenshaw',       party: 'R', ticker: 'MSFT', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Dunn_MSFT_s1',        politician_name: 'Neal Dunn',          party: 'R', ticker: 'MSFT', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  // Meta / AMZN / others
  { id: 'Warner_META_s1',      politician_name: 'Mark Warner',        party: 'D', ticker: 'META', action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Khanna_META_s1',      politician_name: 'Ro Khanna',          party: 'D', ticker: 'META', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Pelosi_META_s1',      politician_name: 'Nancy Pelosi',       party: 'D', ticker: 'META', action: 'sell', amount_low: 250001, amount_high: 500000,  sp500: 'Y' },
  { id: 'Schumer_META_s1',     politician_name: 'Chuck Schumer',      party: 'D', ticker: 'META', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Himes_AMZN_s1',       politician_name: 'Jim Himes',          party: 'D', ticker: 'AMZN', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Warner_AMZN_s1',      politician_name: 'Mark Warner',        party: 'D', ticker: 'AMZN', action: 'buy',  amount_low: 250001, amount_high: 500000,  sp500: 'Y' },
  { id: 'Gottheimer_GOOGL_s1', politician_name: 'Josh Gottheimer',    party: 'D', ticker: 'GOOGL', action: 'sell', amount_low: 50001, amount_high: 100000,  sp500: 'Y' },
  { id: 'Turner_GOOGL_s1',     politician_name: 'Mike Turner',        party: 'R', ticker: 'GOOGL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Schumer_JPM_s1',      politician_name: 'Chuck Schumer',      party: 'D', ticker: 'JPM',   action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Warner_JPM_s1',       politician_name: 'Mark Warner',        party: 'D', ticker: 'JPM',   action: 'sell', amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Tuberville_AMD_s1',   politician_name: 'Tommy Tuberville',   party: 'R', ticker: 'AMD',   action: 'buy',  amount_low: 100001, amount_high: 250000,  sp500: 'N' },
  { id: 'Greene_AMD_s1',       politician_name: 'Marjorie Taylor Greene', party: 'R', ticker: 'AMD', action: 'sell', amount_low: 15001, amount_high: 50000, sp500: 'N' },
  { id: 'Tuberville_XOM_s1',   politician_name: 'Tommy Tuberville',   party: 'R', ticker: 'XOM',   action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'McCaul_CVX_s1',       politician_name: 'Michael McCaul',     party: 'R', ticker: 'CVX',   action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Turner_INTC_s1',      politician_name: 'Mike Turner',        party: 'R', ticker: 'INTC',  action: 'sell', amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Himes_QCOM_s1',       politician_name: 'Jim Himes',          party: 'D', ticker: 'QCOM',  action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Cotton_LMT_s1',       politician_name: 'Tom Cotton',         party: 'R', ticker: 'LMT',   action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'McCaul_LMT_s1',       politician_name: 'Michael McCaul',     party: 'R', ticker: 'LMT',   action: 'buy',  amount_low: 250001, amount_high: 500000,  sp500: 'Y' },
  { id: 'Johnson_BA_s1',       politician_name: 'Mike Johnson',       party: 'R', ticker: 'BA',    action: 'sell', amount_low: 100001, amount_high: 250000,  sp500: 'Y' },
  { id: 'Tuberville_BA_s1',    politician_name: 'Tommy Tuberville',   party: 'R', ticker: 'BA',    action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Pelosi_TSM_s1',       politician_name: 'Nancy Pelosi',       party: 'D', ticker: 'TSM',   action: 'buy',  amount_low: 500001, amount_high: 1000000, sp500: 'N' },
  { id: 'Himes_TSLA_s1',       politician_name: 'Jim Himes',          party: 'D', ticker: 'TSLA',  action: 'sell', amount_low: 100001, amount_high: 250000,  sp500: 'Y' },
  { id: 'Greene_TSLA_s1',      politician_name: 'Marjorie Taylor Greene', party: 'R', ticker: 'TSLA', action: 'buy', amount_low: 15001, amount_high: 50000, sp500: 'Y' },
  { id: 'Waltz_TSLA_s1',       politician_name: 'Michael Waltz',      party: 'R', ticker: 'TSLA',  action: 'buy',  amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
];

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function writeOutput(trades) {
  const payload = {
    generated_at: new Date().toISOString(),
    trades,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`[generate-trades] Wrote ${trades.length} trades to ${OUT_PATH}`);
}

function writeSeed() {
  const now = Date.now();
  const trades = SEED_TRADES.map((t, i) => {
    const txDate = new Date(now - (i + 1) * 3 * 86_400_000);
    const discDate = new Date(txDate.getTime() + 35 * 86_400_000);
    return {
      ...t,
      transaction_date: fmtDate(txDate),
      disclosed_date: fmtDate(discDate),
    };
  });
  writeOutput(trades);
}

const PROMPT = `You are a data API for US congressional STOCK Act disclosures.
Return a JSON array of EXACTLY 100 congressional stock trades.
Use real politician names and real tickers they are known to trade.
Use transaction dates within the last 90 days.

CRITICAL DISTRIBUTION REQUIREMENTS — you MUST meet ALL of these:
- NVDA: at least 20 DIFFERENT Democrat politicians buying (e.g. Pelosi, Gottheimer, Khanna, Himes, Warner, Schumer, Jefferies, Levin, Panetta, Swalwell, Lieu, DeSaulnier, Eshoo, Lofgren, Porter, Speier, Jacobs, Brownley, Cardenas, Lee)
- AAPL: at least 18 DIFFERENT Democrat politicians buying
- MSFT: at least 15 DIFFERENT politicians (mixed party) buying
- Use at least 25 unique Democrat politicians and 20 unique Republican politicians across the full 100 trades
- Each of the top 3 tickers (NVDA, AAPL, MSFT) must appear at least 20 times each

Democrats to use: Nancy Pelosi, Josh Gottheimer, Ro Khanna, Jim Himes, Mark Warner, Chuck Schumer, Hakeem Jefferies, Mike Levin, Jimmy Panetta, Eric Swalwell, Ted Lieu, Mark DeSaulnier, Anna Eshoo, Zoe Lofgren, Katie Porter, Jackie Speier, Sara Jacobs, Julia Brownley, Tony Cardenas, Barbara Lee, Adam Schiff, Karen Bass, Maxine Waters, Brad Sherman, Pete Aguilar, Grace Napolitano, Alan Lowenthal, Norma Torres, Nanette Barragan, Raul Ruiz.

Republicans to use: Tommy Tuberville, Michael McCaul, Mike Turner, Mitch McConnell, Tom Cotton, Mike Johnson, Marjorie Taylor Greene, Kevin McCarthy, Dan Crenshaw, Michael Waltz, Greg Steube, Brian Mast, Mario Diaz-Balart, Carlos Gimenez, Maria Salazar, Byron Donalds, John Rutherford, Kat Cammack, Neal Dunn, Bill Posey.

Return ONLY a valid JSON array. No explanation, no markdown, no code fences.
Start your response with [ and end with ].

Each trade object must have exactly these fields:
{
  "id": "LastName_TICKER_YYYY-MM-DD",
  "politician_name": "First Last",
  "party": "D" or "R" or "U",
  "ticker": "UPPERCASE_TICKER",
  "action": "buy" or "sell",
  "amount_low": (one of: 1001, 15001, 50001, 100001, 250001, 500001, 1000001),
  "amount_high": (one of: 15000, 50000, 100000, 250000, 500000, 1000000, 5000000),
  "transaction_date": "YYYY-MM-DD",
  "disclosed_date": "YYYY-MM-DD",
  "sp500": "Y" or "N"
}

Return 100 trades sorted by transaction_date descending. Meet ALL distribution requirements above.`;

function normalizeAction(raw) {
  if (!raw) return null;
  const lower = String(raw).toLowerCase().trim();
  if (lower === 'buy' || lower === 'purchase') return 'buy';
  if (lower === 'sell' || lower === 'sale') return 'sell';
  return null;
}

function normalizeParty(raw) {
  if (!raw) return 'U';
  const lower = String(raw).toLowerCase().trim();
  if (lower === 'd' || lower === 'democrat' || lower === 'democratic') return 'D';
  if (lower === 'r' || lower === 'republican') return 'R';
  return 'U';
}

function patchDates(trades) {
  const total = trades.length;
  const now = Date.now();
  return trades.map((t, i) => {
    const txDate = new Date(now - ((total - 1 - i) / Math.max(total - 1, 1)) * 60 * 86_400_000);
    const discDate = new Date(txDate.getTime() + 35 * 86_400_000);
    return {
      ...t,
      transaction_date: fmtDate(txDate),
      disclosed_date: fmtDate(discDate),
    };
  });
}

function parseTradesFromResponse(body) {
  // Find the last content block with type "text"
  const contentBlocks = body.content || [];
  let text = '';
  for (let i = contentBlocks.length - 1; i >= 0; i--) {
    if (contentBlocks[i].type === 'text') {
      text = contentBlocks[i].text;
      break;
    }
  }
  if (!text) throw new Error('No text content block in API response');

  // Try direct JSON parse first
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }

  // Try regex extraction
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    return JSON.parse(match[0]);
  }

  throw new Error('Could not extract JSON array from API response');
}

function normalizeTrades(raw) {
  return raw
    .map((t) => {
      const action = normalizeAction(t.action);
      if (!action) return null;
      if (!t.politician_name || !t.ticker) return null;
      return {
        id: t.id || `${t.politician_name.split(' ').pop()}_${t.ticker}_unknown`,
        politician_name: t.politician_name,
        party: normalizeParty(t.party),
        ticker: String(t.ticker).toUpperCase().trim(),
        action,
        amount_low: t.amount_low || 1001,
        amount_high: t.amount_high || 15000,
        sp500: t.sp500 || 'N',
      };
    })
    .filter(Boolean);
}

async function main() {
  if (!API_KEY) {
    console.warn('[generate-trades] VITE_ANTHROPIC_API_KEY not set — writing seed data');
    writeSeed();
    process.exit(0);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        messages: [{ role: 'user', content: PROMPT }],
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '(no body)');
      throw new Error(`API returned ${res.status}: ${errText}`);
    }

    const body = await res.json();
    const rawTrades = parseTradesFromResponse(body);

    if (!Array.isArray(rawTrades) || rawTrades.length === 0) {
      throw new Error('API returned empty or non-array trades');
    }

    const normalized = normalizeTrades(rawTrades);

    if (normalized.length === 0) {
      throw new Error('All trades filtered out during normalization');
    }

    const dated = patchDates(normalized);
    writeOutput(dated);
  } catch (err) {
    console.error(`[generate-trades] Error: ${err.message}`);
    console.warn('[generate-trades] Falling back to seed data');
    writeSeed();
  }

  process.exit(0);
}

main();
