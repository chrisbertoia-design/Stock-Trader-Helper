// Web Worker: receives raw JSON text, parses + normalizes, returns array
// Runs off the main thread to avoid blocking UI on 30-50MB payloads (BL-006)
self.onmessage = function(e) {
  try {
    const json = JSON.parse(e.data)
    const rawTrades = json.trades
    if (!Array.isArray(rawTrades)) {
      self.postMessage({ error: 'Invalid trades array' })
      return
    }

    // Normalize inline — cannot import ES modules in this worker context
    function _esc(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    const trades = []
    for (const raw of rawTrades) {
      try {
        if (!raw || typeof raw !== 'object') continue

        // Ticker is required
        const ticker = (raw.ticker || '').toUpperCase().trim()
        if (!ticker || ticker === '--') continue

        // Normalize action
        const rawAction = (raw.action || '').toLowerCase().trim()
        let action
        if (rawAction === 'buy' || rawAction === 'purchase') {
          action = 'buy'
        } else if (rawAction === 'sell' || rawAction === 'sale') {
          action = 'sell'
        } else {
          continue  // invalid action
        }

        // Normalize party
        const rawParty = (raw.party || '').toLowerCase().trim()
        let party
        if (rawParty === 'd' || rawParty === 'democrat' || rawParty === 'democratic') {
          party = 'D'
        } else if (rawParty === 'r' || rawParty === 'republican') {
          party = 'R'
        } else {
          party = 'U'
        }

        // Validate dates
        const transaction_date = (raw.transaction_date || '').trim()
        const transaction_ts   = new Date(transaction_date).getTime()
        if (!transaction_date || isNaN(transaction_ts)) continue

        const disclosed_date = (raw.disclosed_date || '').trim()

        // Validate numeric amount fields
        const amount_low  = typeof raw.amount_low  === 'number' ? raw.amount_low  : 1001
        const amount_high = typeof raw.amount_high === 'number' ? raw.amount_high : 15000

        // sp500 default 'N' if missing or invalid
        const sp500Raw = (raw.sp500 || '').toUpperCase().trim()
        const sp500    = sp500Raw === 'Y' ? 'Y' : 'N'

        trades.push({
          id:               String(raw.id || `${ticker}_${transaction_date}_${(raw.politician_name || '').split(' ').pop()}`),
          politician_name:  _esc((raw.politician_name || 'Unknown').trim()),
          party,
          ticker:           _esc(ticker),
          action,
          amount_low,
          amount_high,
          transaction_date,
          disclosed_date,
          transaction_ts,
          sp500
        })
      } catch (_) {
        // skip malformed record
      }
    }

    self.postMessage({ trades })
  } catch(err) {
    self.postMessage({ error: err.message })
  }
}
