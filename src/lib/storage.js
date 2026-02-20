const STORAGE_KEY = 'civic-action-builder-state'
const STORAGE_EXPIRY_DAYS = 7

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    // Check 7-day expiry
    if (saved.timestamp) {
      const age = Date.now() - saved.timestamp
      if (age > STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
    }
    return saved
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, timestamp: Date.now() }))
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY)
}
