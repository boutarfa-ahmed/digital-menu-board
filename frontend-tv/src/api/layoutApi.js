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