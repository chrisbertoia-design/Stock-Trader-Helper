/**
 * Logger — writes to Google Sheets "log" tab AND console.
 * Every entry: timestamp, level, category, message, details, session_id.
 * Design: fire-and-forget writes so logging never blocks the UI.
 */

const SESSION_ID = `s_${Date.now().toString(36)}`
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }

let _sheetsWriter = null  // injected after Sheets is initialized
let _minLevel = LOG_LEVELS.DEBUG
let _buffer = []          // holds logs until Sheets is ready
let _flushing = false

export function initLogger({ sheetsWriter, minLevel = 'DEBUG' }) {
  _sheetsWriter = sheetsWriter
  _minLevel = LOG_LEVELS[minLevel] ?? LOG_LEVELS.DEBUG
  log('INFO', 'LOGGER', `Logger initialized — session ${SESSION_ID}`)
  _flushBuffer()
}

export function log(level, category, message, details = null) {
  const numLevel = LOG_LEVELS[level] ?? LOG_LEVELS.DEBUG
  if (numLevel < _minLevel) return

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : '',
    session_id: SESSION_ID
  }

  // Always log to console with color coding
  const styles = {
    DEBUG: 'color: #555',
    INFO:  'color: #8a8',
    WARN:  'color: #ca8',
    ERROR: 'color: #c77; font-weight: bold'
  }
  console.log(
    `%c[${level}] [${category}]%c ${message}`,
    styles[level] || '',
    'color: inherit',
    details ?? ''
  )

  if (_sheetsWriter) {
    _writeToSheets(entry)
  } else {
    _buffer.push(entry)
    if (_buffer.length > 200) _buffer.shift() // cap buffer
  }
}

// Convenience shorthands
export const debug = (cat, msg, d) => log('DEBUG', cat, msg, d)
export const info  = (cat, msg, d) => log('INFO',  cat, msg, d)
export const warn  = (cat, msg, d) => log('WARN',  cat, msg, d)
export const error = (cat, msg, d) => log('ERROR', cat, msg, d)

async function _flushBuffer() {
  if (_flushing || _writing || !_sheetsWriter || _buffer.length === 0) return
  _flushing = true
  const entries = [..._buffer]
  _buffer = []
  try {
    await _sheetsWriter(entries)
    console.log(`[LOGGER] Flushed ${entries.length} buffered log entries`) // use console to avoid re-entrancy
  } catch (e) {
    console.error('[LOGGER] Failed to flush buffer:', e)
    _buffer = [...entries, ..._buffer] // put back on failure
  }
  _flushing = false
}

let _writing = false  // re-entrancy guard: prevents appendRows→debug→appendRows loop

async function _writeToSheets(entry) {
  if (_writing) { _buffer.push(entry); return }
  _writing = true
  try {
    await _sheetsWriter([entry])
  } catch (e) {
    console.error('[LOGGER] Sheets write failed:', e, entry)
    _buffer.push(entry) // buffer on failure
  } finally {
    _writing = false
  }
}

export function getSessionId() { return SESSION_ID }
