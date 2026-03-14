/**
 * Ollama provider.
 * Model resolved from config — never hardcoded.
 * Endpoint: config.ollama_base_url (default: http://localhost:11434)
 */

import { debug, warn } from '../../services/logger.js'

const CAT = 'AI_OLLAMA'

export async function callOllama(prompt, { system = '', model = '', config = {} } = {}) {
  const base       = (config.ollama_base_url || 'http://localhost:11434').replace(/\/$/, '')
  const resolvedModel = model || config.ollama_fallback_model || 'llama3.2'
  const url        = `${base}/api/chat`

  debug(CAT, `callOllama model=${resolvedModel} endpoint=${url}`)

  const messages = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      stream: false,
      options: { temperature: 0.3 }
    })
  })

  if (!res.ok) {
    const body = await res.text()
    warn(CAT, `Ollama request failed ${res.status}`, body)
    throw new Error(`Ollama ${res.status}: ${body}`)
  }

  const data = await res.json()
  const text = data.message?.content || data.response || ''

  if (!text) throw new Error('Ollama returned empty response')

  return { text, model: resolvedModel }
}
