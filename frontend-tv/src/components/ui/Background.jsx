// T7.6 — screen-level background: an uploaded image. The torn-paper divider
// itself between zones is rendered by ZoneSeams (joins zones where they
// touch) — no separate grain/texture overlay here anymore.

const DEFAULTS = {
  type: 'image',
  pattern: 'none',
  patternColor: '#FFFFFF',
}

function imageCss(url) {
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

function backgroundCss(bg) {
  if (bg.type === 'image' && bg.imageUrl) {
    return imageCss(bg.imageUrl)
  }
  return null
}

export default function Background({ config }) {
  if (!config) return null
  const bg = { ...DEFAULTS, ...config }
  const css = backgroundCss(bg)
  if (!css) return null
  return <div className="pointer-events-none absolute inset-0 overflow-hidden" style={css} />
}