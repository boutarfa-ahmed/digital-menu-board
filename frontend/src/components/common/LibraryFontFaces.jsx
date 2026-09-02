import { useEffect, useState } from 'react'
import api from '../../api/axios'

// Registers @font-face rules for every "font" category asset in the
// Bibliothèque, so admin previews (Library.jsx swatches, the "Police"
// dropdown in ScreenLayoutCanvas) actually render in the picked font —
// mirrors frontend-tv's LibraryFontFaces.jsx.
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
    api
      .get('/library/categories')
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return
        const rules = data
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
