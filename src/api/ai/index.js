/**
 * AI Router — model-agnostic.
 *
 * Provider priority:
 *   1. Whatever `config.ai_provider` says (ollama | gemini)
 *   2. Falls back to the other provider on error
 *
 * Model is NEVER hardcoded here. It comes from:
 *   config.ai_model           (explicit override, blank = use provider default)
 *   config.ollama_fallback_model  (e.g. "llama3.2")
 *   config.gemini_fallback_model  (e.g. "gemini-2.0-flash")
 *
 * Usage:
 *   import { ask } from './ai/index.js'
 *   const reply = await ask(prompt, { system, config })
 */

import { callOllama }  from './ollama.js'
import { callGemini }  from './gemini.js'
import { debug, info, warn, error } from '../../services/logger.js'

const CAT = 'AI_ROUTER'

/**
 * @param {string} prompt
 * @param {{ system?: string, config: object, context?: object }} opts
 * @returns {Promise<string>}
 */
export async function ask(prompt, { system = '', config, context = {} } = {}) {
  // Merge env vars as lowest-priority fallback (useful before Sheets is connected)
  const envConfig = {
    ai_provider:           import.meta.env.VITE_AI_PROVIDER || '',
    gemini_api_key:        import.meta.env.VITE_GEMINI_API_KEY || '',
    gemini_fallback_model: import.meta.env.VITE_GEMINI_MODEL || '',
  }
  const merged   = { ...envConfig, ...(config || {}) }

  const provider = merged.ai_provider || 'ollama'
  const model    = merged.ai_model || ''

  debug(CAT, `ask() — provider=${provider} model=${model || '(default)'}`)

  const primaryCall  = provider === 'gemini' ? callGemini : callOllama
  const fallbackCall = provider === 'gemini' ? callOllama  : callGemini

  try {
    const result = await primaryCall(prompt, { system, model, config: merged })
    info(CAT, `AI response from ${provider} (${result.model || 'unknown model'})`)
    debug(CAT, 'AI prompt+response', { prompt: prompt.slice(0, 200), response: result.text.slice(0, 300) })
    return result.text
  } catch (err) {
    warn(CAT, `Primary provider (${provider}) failed — trying fallback`, err.message)
    try {
      const result = await fallbackCall(prompt, { system, model: '', config: merged })
      info(CAT, `AI fallback response from ${provider === 'gemini' ? 'ollama' : 'gemini'}`)
      return result.text
    } catch (err2) {
      error(CAT, 'Both AI providers failed', { primary: err.message, fallback: err2.message })
      throw new Error(`AI unavailable: ${err.message} | fallback: ${err2.message}`)
    }
  }
}

/**
 * Structured prompts for specific app features.
 * Keeps prompt logic in one place, separate from call mechanics.
 */
export const Prompts = {

  tradeContext: ({ disclosure, userPositions, watchedPolitician }) => ({
    system: `You are a concise financial assistant helping a retail investor understand
congressional stock disclosures. Be direct, no disclaimers, no fluff.
The user uses Charles Schwab. Focus on what's relevant to their current holdings.`,
    prompt: `Congressional disclosure:
Politician: ${disclosure.politician_name} (${disclosure.party})
Trade: ${disclosure.action.toUpperCase()} ${disclosure.ticker}
Amount range: $${disclosure.amount_low.toLocaleString()} – $${disclosure.amount_high.toLocaleString()}
Transaction date: ${disclosure.transaction_date}
Disclosed: ${disclosure.disclosed_date}

User's current position in ${disclosure.ticker}: ${userPositions[disclosure.ticker]
  ? `${userPositions[disclosure.ticker].quantity} shares @ avg $${userPositions[disclosure.ticker].avg_cost}`
  : 'none'}

Relevant existing holdings (top 5 by value):
${JSON.stringify(Object.values(userPositions).slice(0,5).map(p => ({ ticker: p.ticker, value: p.mkt_value })))}

In 2-3 sentences: what does this trade mean in context of the user's portfolio?
Then one sentence: what sector/theme does this reinforce or contradict?`
  }),

  consensusSignal: ({ signal, userPositions }) => ({
    system: `You are a concise market analyst. One short paragraph maximum. No disclaimers.`,
    prompt: `Party-wide trading signal detected:
Party: ${signal.party}
Tickers: ${signal.tickers}
Members trading: ${signal.member_count} of ${signal.party_total} (${(signal.pct_of_party * 100).toFixed(0)}%)
Window: past ${signal.window_days} days

User holds: ${signal.tickers.split(',').map(t => t.trim()).filter(t => userPositions[t]).map(t => `${t}: ${userPositions[t].quantity} shares`).join(', ') || 'none of these'}

In one paragraph: why might this level of party coordination matter? What could explain it (upcoming legislation, sector rotation, macro event)?`
  }),

  sliceAllocation: ({ totalAmount, tickers, userPositions, signalStrengths }) => ({
    system: `You allocate investment amounts across stocks. Return ONLY a JSON array, no prose.`,
    prompt: `Allocate $${totalAmount} across these tickers as a Schwab Stock Slice order.
Rules: minimum $5 per stock, max 30 stocks, amounts sum to exactly $${totalAmount}.
Weight by signal strength and underweight tickers the user already holds heavily.

Tickers and signal strength (0-1):
${JSON.stringify(signalStrengths)}

User's current exposure:
${JSON.stringify(tickers.map(t => ({ ticker: t, held_value: userPositions[t]?.mkt_value || 0 })))}

Return JSON array: [{"ticker":"AAPL","amount":45},...]
Ensure sum equals ${totalAmount}.`
  }),

  decisionMemory: ({ recentDecisions }) => ({
    system: `You identify patterns. Be concise and direct.`,
    prompt: `Here are the user's last ${recentDecisions.length} trade decisions:
${recentDecisions.map(d => `${d.decided_at}: ${d.decision} on ${d.tickers} (invested: $${d.invest_amount || 0})`).join('\n')}

In 1-2 sentences: what pattern do you see in their decision-making?
Then one actionable observation.`
  })
}
