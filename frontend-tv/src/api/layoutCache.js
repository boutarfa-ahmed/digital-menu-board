// Last-known-good published layout, per screen id. The TV boots straight into
// this cache instead of a blank skeleton, and falls back to it when a fetch
// fails mid-session (wifi drop, backend restart) — a signage board going
// blank in front of customers is worse than showing slightly stale content.
const CACHE_PREFIX = 'galaxy-tv-cache:'

export function saveLayoutCache(screenId, layout) {
  try {
    localStorage.setItem(CACHE_PREFIX + screenId, JSON.stringify({ layout, savedAt: Date.now() }))
  } catch {
    /* storage full/disabled (private browsing) — cache is best-effort */
  }
}

export function loadLayoutCache(screenId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + screenId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && parsed.layout ? parsed.layout : null
  } catch {
    return null
  }
}
