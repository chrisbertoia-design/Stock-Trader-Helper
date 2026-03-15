export function showToast(message, typeOrDuration = 3000) {
  const container = document.getElementById('toast-container')
  if (!container) return

  // Accept showToast(msg, 'success'|'error'|'info') or showToast(msg, milliseconds)
  const duration = typeof typeOrDuration === 'number' ? typeOrDuration : 3000

  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = message
  container.appendChild(el)

  setTimeout(() => {
    el.classList.add('leaving')
    el.addEventListener('animationend', () => el.remove(), { once: true })
    setTimeout(() => el.remove(), 600)  // fallback if animationend never fires
  }, duration)
}
