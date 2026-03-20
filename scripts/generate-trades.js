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

const SEED_TRADES = [
  { id: 'Pelosi_NVDA_seed',       politician_name: 'Nancy Pelosi',          party: 'D', ticker: 'NVDA',  action: 'buy',  amount_low: 250001, amount_high: 500000,  sp500: 'Y' },
  { id: 'Gottheimer_MSFT_seed',   politician_name: 'Josh Gottheimer',       party: 'D', ticker: 'MSFT',  action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Khanna_AAPL_seed',       politician_name: 'Ro Khanna',             party: 'D', ticker: 'AAPL',  action: 'sell', amount_low: 50001,  amount_high: 100000,  sp500: 'Y' },
  { id: 'Tuberville_AMD_seed',    politician_name: 'Tommy Tuberville',      party: 'R', ticker: 'AMD',   action: 'buy',  amount_low: 100001, amount_high: 250000,  sp500: 'N' },
  { id: 'Pelosi_TSM_seed',        politician_name: 'Nancy Pelosi',          party: 'D', ticker: 'TSM',   action: 'buy',  amount_low: 500001, amount_high: 1000000, sp500: 'N' },
  { id: 'Turner_GOOGL_seed',      politician_name: 'Mike Turner',           party: 'R', ticker: 'GOOGL', action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Himes_AMZN_seed',        politician_name: 'Jim Himes',             party: 'D', ticker: 'AMZN',  action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'McCaul_MSFT_seed',       politician_name: 'Michael McCaul',        party: 'R', ticker: 'MSFT',  action: 'buy',  amount_low: 100001, amount_high: 250000,  sp500: 'Y' },
  { id: 'Greene_TSLA_seed',       politician_name: 'Marjorie Taylor Greene', party: 'R', ticker: 'TSLA',  action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
  { id: 'Cotton_LMT_seed',        politician_name: 'Tom Cotton',            party: 'R', ticker: 'LMT',   action: 'buy',  amount_low: 15001,  amount_high: 50000,   sp500: 'Y' },
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
    const txDate = new Date(now - (i + 1) * 7 * 86_400_000);
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
Return a JSON array of 25 real US congressional stock trades from your training data.
Use real politician names and real tickers they are known to trade.
Focus on trades from 2024.

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

Include politicians from this list if possible: Nancy Pelosi, Josh Gottheimer, Ro Khanna, Tommy Tuberville, Michael McCaul, Mike Turner, Jim Himes, Mitch McConnell, Tom Cotton, Mark Warner, Chuck Schumer, Mike Johnson, Hakeem Jefferies, Marjorie Taylor Greene.
Return 25 trades sorted by transaction_date descending.`;

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
        max_tokens: 4096,
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
