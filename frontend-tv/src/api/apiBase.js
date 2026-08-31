// Same-origin by default (works behind Caddy, which reverse-proxies /api on
// the same domain as the TV frontend). Set VITE_API_URL to an absolute URL
// (e.g. https://galaxyfood-api.onrender.com/api) when the frontend is hosted
// on a different origin than the backend — Render's static sites and web
// services each get their own domain, unlike the single-domain Caddy setup.
export const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Derives the WebSocket URL from the same setting: same-origin uses the
// page's own host, cross-origin derives host+protocol from API_BASE instead.
export function wsUrl() {
  if (/^https?:\/\//.test(API_BASE)) {
    const url = new URL(API_BASE)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return url.toString()
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${API_BASE}`
}
