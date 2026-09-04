import { useEffect, useState } from 'react'
import { API_BASE } from '../../api/apiBase'

// Custom fonts uploaded through the admin's Bibliothèque (category type
// "font") aren't bundled into this build like Anton/Inter/Playfair/
// Tagesschrift (fonts.css) — they're registered here as @font-face rules
// pointing at their live Cloudinary URL. Unlike the bundled fonts, a custom
// font is unavailable if the TV boots offline before it's cached; only the
// free-text elements that explicitly picked one are affected (font-display:
// swap falls them back to the browser default), everything else on the
// board keeps using the always-available bundled fonts.
function formatFor(url) {
  const ext = (url.match(/\.[^./?#]+$/) || [''])[0].toLowerCase()
  if (ext === '.woff2') return 'woff2'
  if (ext === '.woff') return 'woff'
  if (ext === '.otf') return 'opentype'
  return 'truetype'
}

export default function LibraryFontFaces() {
  const [css, setCss] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/library/categories`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((categories) => {
        if (cancelled || !Array.isArray(categories)) return
        const rules = categories
          .filter((c) => c.type === 'font')
          .flatMap((c) => c.assets || [])
          .filter((a) => a.name && a.url)
          .map(
            (a) =>
              `@font-face { font-family: '${a.name.replace(/'/g, "\\'")}'; src: url('${a.url}') format('${formatFor(a.url)}'); font-display: swap; }`
          )
        setCss(rules.join('\n'))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!css) return null
  return <style>{css}</style>
}
