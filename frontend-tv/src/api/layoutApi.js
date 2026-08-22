const API_BASE = '/api'

// GET /api/screens/:id/layout — zone-based layout (nested zones + items)
export async function fetchScreenLayout(screenId) {
  const res = await fetch(`${API_BASE}/screens/${screenId}/layout`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Failed to load layout (${res.status})`)
  }
  return res.json()
}

// POST /api/screens/:id/ping — heartbeat.
//
// The admin dashboard derives online/offline from Screen.lastPing, but nothing
// in this app ever pinged (the old heartbeat lived in the retired frontend
// /display page), so every TV read as offline. Fire-and-forget: a failed ping
// must never disturb what is on screen.
export function pingScreen(screenId) {
  return fetch(`${API_BASE}/screens/${screenId}/ping`, {
    method: 'POST',
    cache: 'no-store',
  }).catch(() => {})
}
