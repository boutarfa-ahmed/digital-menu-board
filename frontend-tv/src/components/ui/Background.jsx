// T7.6 — screen-level background: split 50/50 (dark/light + angle), an uploaded
// image, or "regions": one global image/fill + free-form colored/hatched zones
// drawn from the 12x12 grid (shared background, zones stay transparent).
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0.55 0'/></filter><rect width='140' height='140' filter='url(#n)'/></svg>"
)}")`

const DEFAULTS = {
  type: 'split',
  dark: '#121212',
  light: '#F5F3EF',
  angle: 0,
  pattern: 'none',
  patternColor: '#FFFFFF',
}

const HATCH = {
  backgroundImage: 'repeating-linear-gradient(-45deg, #cccccc 0 4px, #B9B9B9 4px 7px)',
}

const pct = (g) => `${(g * 100) / 12}%`

function regionStyle(r) {
  const style = {
    left: pct(r.x),
    top: pct(r.y),
    width: pct(r.w),
    height: pct(r.h),
  }
  if (r.fill === 'hatch') return { ...style, ...HATCH }
  if (r.fill) style.backgroundColor = r.fill
  return style
}

function imageCss(url) {
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

function tornStripDataUri(color) {
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='40'><path d='M0 8 L5 13 L10 6 L16 14 L22 5 L28 13 L34 7 L40 14 L46 6 L52 13 L57 8 L63 13 L64 13 L64 27 L58 33 L52 26 L46 34 L40 27 L34 33 L28 26 L22 34 L16 27 L10 33 L5 26 L0 31 Z' fill='${color}'/></svg>`
  )}")`
}

function backgroundCss(bg) {
  if (bg.type === 'regions') {
    if (bg.imageUrl) return imageCss(bg.imageUrl)
    if (bg.fill) return { backgroundColor: bg.fill }
    return null
  }
  if (bg.type === 'image' && bg.imageUrl) {
    return imageCss(bg.imageUrl)
  }
  if (bg.type === 'split') {
    return {
      backgroundImage: `linear-gradient(${bg.angle + 90}deg, ${bg.dark} 50%, ${bg.light} 50%)`,
    }
  }
  return null
}

export default function Background({ config }) {
  if (!config) return null
  const bg = { ...DEFAULTS, ...config }
  if (bg.type === 'regions') {
    const css = backgroundCss(bg)
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={css}>
        {(bg.regions || []).map((r, i) => (
          <div key={i} className="absolute" style={regionStyle(r)} />
        ))}
      </div>
    )
  }
  const css = backgroundCss(bg)
  if (!css) return null
  const showPattern = bg.pattern === 'torn-paper'
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={css}>
      {showPattern && (
        <>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat', opacity: 0.14 }}
          />
          {bg.type === 'split' && (
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: '300%',
                height: 40,
                transform: `translate(-50%, -50%) rotate(${bg.angle - 90}deg)`,
                transformOrigin: 'center',
                backgroundImage: tornStripDataUri(bg.patternColor),
                backgroundRepeat: 'repeat-x',
                backgroundSize: '64px 40px',
                opacity: 0.9,
              }}
            />
          )}
        </>
      )}
    </div>
  )
}