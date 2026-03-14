export function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container')
  if (!container) return

  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = message
  container.appendChild(el)

  setTimeout(() => {
    el.classList.add('leaving')
    el.addEventListener('animationend', () => el.remove())
  }, duration)
}
