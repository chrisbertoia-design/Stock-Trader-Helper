/**
 * Gemini provider — used as fallback or when explicitly configured.
 * Model resolved from config — never hardcoded here.
 * API key from config.gemini_api_key.
 */

import { debug, warn } from '../../services/logger.js'

const CAT = 'AI_GEMINI'

export async function callGemini(prompt, { system = '', model = '', config = {} } = {}) {
  const apiKey       = config.gemini_api_key || ''
  const resolvedModel = model || config.gemini_fallback_model || 'gemini-2.0-flash'

  if (!apiKey) throw new Error('Gemini API key not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`

  debug(CAT, `callGemini model=${resolvedModel}`)

  const contents = []
  if (system) {
    // Gemini uses systemInstruction at top level
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] })

  const body = {
    contents,
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
  }
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const b = await res.text()
    warn(CAT, `Gemini request failed ${res.status}`, b)
    throw new Error(`Gemini ${res.status}: ${b}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!text) throw new Error('Gemini returned empty response')

  return { text, model: resolvedModel }
}
