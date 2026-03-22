export function showToast(message, typeOrDuration = 3000) {
  const container = document.getElementById('toast-container')
  if (!container) return

  // Accept showToast(msg, 'success'|'error'|'info') or showToast(msg, milliseconds)
  const isType   = typeof typeOrDuration === 'string'
  const duration = isType ? (typeOrDuration === 'error' ? 6000 : 3000) : typeOrDuration

  const el = document.createElement('div')
  el.className = 'toast'
  if (typeOrDuration === 'error')   el.classList.add('toast-error')
  if (typeOrDuration === 'success') el.classList.add('toast-success')
  el.textContent = message
  container.appendChild(el)

  setTimeout(() => {
    el.classList.add('leaving')
    el.addEventListener('animationend', () => el.remove(), { once: true })
    setTimeout(() => el.remove(), 600)  // fallback if animationend never fires
  }, duration)
}
