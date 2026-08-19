// T7.6 — screen-level background: an uploaded image, plus an optional torn-paper
// grain texture. The torn-paper divider itself between zones is rendered by
// ZoneSeams (joins zones where they touch), not by a full-page split.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0.55 0'/></filter><rect width='140' height='140' filter='url(#n)'/></svg>"
)}")`

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
  const showPattern = bg.pattern === 'torn-paper'
  if (!css && !showPattern) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={css || undefined}>
      {showPattern && (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat', opacity: 0.14 }}
        />
      )}
    </div>
  )
}