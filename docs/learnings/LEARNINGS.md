# LEARNINGS — Master Reference

Consolidated from `good.md` and `bad.md` at milestones. Keep lean — remove resolved/superseded entries.

<!-- Last consolidated: 2026-03-14 (project init) -->

## Architecture Principles (Hard-Won)

| # | Principle | Source |
|---|-----------|--------|
| 1 | Render first, load data async. Never block `renderApp()` on any API call. | bad: blocking boot |
| 2 | All Sheets writes must be batched. One `batchUpdate` call, never per-key loops. | bad: 429 on saveEditableConfig |
| 3 | Async stores that can be called concurrently need `_inFlight` dedup. | bad: Positions crash |
| 4 | External fetches need AbortController timeouts. Sheets: 10s. HSW: 15s. | good: timeouts |
| 5 | Never store `raw_json` on normalized records. Memory + localStorage quota killer. | bad: tab crash |
| 6 | CORS on localhost → Vite proxy. Keep direct URL in prod. Use `import.meta.env.DEV`. | bad: CORS |
| 7 | HSW data: trim to 90 days immediately after parse. 10k+ records → ~500. | bad: Chrome kill |

## Reusable Patterns

### In-flight dedup for async modules
```js
let _inFlight = null
export function loadSomething() {
  if (_loaded && _data !== null) return Promise.resolve(_data)
  if (_inFlight) return _inFlight
  _inFlight = _doLoad().finally(() => { _inFlight = null })
  return _inFlight
}
```

### Vite dev proxy for CORS
```js
// vite.config.js
server: {
  proxy: {
    '/api/hsw': {
      target: 'https://external-host.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/hsw/, '/data')
    }
  }
}
// source file
const URL = import.meta.env.DEV ? '/api/hsw/file.json' : 'https://external-host.com/data/file.json'
```

### Sheets batch write
```js
// Always diff first, then write only changed keys in one call
await writeConfigBatch(changedKeysOnly)
```
