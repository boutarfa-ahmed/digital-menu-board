// Torn-paper dividers rendered between adjacent zones. Active when the
// screen background pattern is 'torn-paper': every vertical/horizontal seam
// where two zones touch gets a jagged torn band (patternColor), mirroring the
// classic "torn paper divider between panels" look from the design spec.

const GRID = 12
const DESIGN_H = 1080

function tornStripDataUri(color) {
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='40'><path d='M0 8 L5 13 L10 6 L16 14 L22 5 L28 13 L34 7 L40 14 L46 6 L52 13 L57 8 L63 13 L64 13 L64 27 L58 33 L52 26 L46 34 L40 27 L34 33 L28 26 L22 34 L16 27 L10 33 L5 26 L0 31 Z' fill='${color}'/></svg>`
  )}")`
}

function tornStripVDataUri(color) {
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='64'><path d='M0 0 L7 6 L2 13 L9 20 L3 27 L10 34 L4 41 L11 48 L5 55 L12 61 L6 64 L34 64 L38 59 L31 52 L36 45 L30 38 L35 31 L29 24 L34 17 L28 10 L33 4 L34 0 Z' fill='${color}'/></svg>`
  )}")`
}

// Fill the remaining shape the same way for stacking seams (keeps color continuity).
function computeSeams(zones) {
  const v = []
  const h = []
  const push = (list, type, pos, a, span) => {
    const key = `${type}:${pos}:${a}:${span}`
    if (!list.some((x) => x.key === key)) list.push({ pos, a, span, key })
  }
  for (let i = 0; i < zones.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = zones[i]
      const b = zones[j]
      const yTop = Math.max(a.y, b.y)
      const ySpan = Math.min(a.y + a.h, b.y + b.h) - yTop
      const xLeft = Math.max(a.x, b.x)
      const xSpan = Math.min(a.x + a.w, b.x + b.w) - xLeft
      if (ySpan > 0) {
        if (a.x + a.w === b.x) push(v, 'v', b.x, yTop, ySpan)
        if (b.x + b.w === a.x) push(v, 'v', a.x, yTop, ySpan)
      }
      if (xSpan > 0) {
        if (a.y + a.h === b.y) push(h, 'h', b.y, xLeft, xSpan)
        if (b.y + b.h === a.y) push(h, 'h', a.y, xLeft, xSpan)
      }
    }
  }
  return { v, h }
}

// seedsEnabled master switch + per-seam hiddenSeams (keys like "v:6:0:12")
export default function ZoneSeams({ zones, patternColor = '#FFFFFF', seamsEnabled = true, hiddenSeams = [] }) {
  const hidden = new Set(hiddenSeams || [])
  const { v, h } = computeSeams(zones || [])
  if (!seamsEnabled) return null
  const vv = v.filter((s) => !hidden.has(s.key))
  const hh = h.filter((s) => !hidden.has(s.key))
  if (vv.length === 0 && hh.length === 0) return null
  return (
    <>
      {vv.map((s) => (
        <div
          key={`zsv${s.key}`}
          className="pointer-events-none absolute z-30"
          style={{
            left: `${(s.pos / GRID) * 100}%`,
            top: `${(s.a / GRID) * 100}%`,
            width: 40,
            height: `${(s.span / GRID) * DESIGN_H}px`,
            transform: 'translateX(-50%)',
            backgroundImage: tornStripVDataUri(patternColor),
            backgroundRepeat: 'repeat-y',
            backgroundSize: '40px 64px',
            opacity: 0.9,
          }}
        />
      ))}
      {hh.map((s) => (
        <div
          key={`zsh${s.key}`}
          className="pointer-events-none absolute z-30"
          style={{
            left: `${(s.a / GRID) * 100}%`,
            top: `${(s.pos / GRID) * 100}%`,
            width: `${(s.span / GRID) * 100}%`,
            height: 40,
            transform: 'translateY(-50%)',
            backgroundImage: tornStripDataUri(patternColor),
            backgroundRepeat: 'repeat-x',
            backgroundSize: '64px 40px',
            opacity: 0.9,
          }}
        />
      ))}
    </>
  )
}