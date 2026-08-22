// Torn-paper dividers rendered between adjacent zones. Active when the
// screen background pattern is 'torn-paper': every vertical/horizontal seam
// where two zones touch gets a jagged torn band (patternColor), mirroring the
// classic "torn paper divider between panels" look from the design spec.
//
// Strip look is generated procedurally (seeded, deterministic) rather than
// hand-drawn paths: dense fine micro-teeth + occasional deeper "rip" notches,
// plus a baked-in SVG drop shadow — same visual family as a pro ripped-paper
// stock texture, but license-free and re-colorable per theme.

const GRID = 12
const DESIGN_H = 1080

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// One jagged edge as a polyline of [pos-along-edge, depth] pairs. Dense teeth
// (many small segments) with the occasional deeper "rip" for realism.
function tornEdgePoints(rand, length, segments, depth) {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const pos = (i / segments) * length
    let d = Math.pow(rand(), 1.6) * depth
    if (rand() < 0.16) d += depth * (0.5 + rand() * 0.5) // occasional deeper rip
    pts.push([pos, d])
  }
  return pts
}

// Horizontal strip band: jagged on BOTH long edges (top + bottom), seamlessly
// tileable left-right. thickness = band height, length = tile width.
function tornStripDataUri(color, seed = 1, length = 64, thickness = 36) {
  const rand = mulberry32(seed)
  const segs = 22
  const depth = thickness * 0.34
  const top = tornEdgePoints(rand, length, segs, depth)
  const bottom = tornEdgePoints(rand, length, segs, depth)
  const topPts = top.map(([x, d]) => `${x.toFixed(1)} ${d.toFixed(1)}`).join(' L')
  const botPts = bottom
    .map(([x, d]) => `${x.toFixed(1)} ${(thickness - d).toFixed(1)}`)
    .reverse()
    .join(' L')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${length}' height='${thickness}'><filter id='ds' x='-20%' y='-60%' width='140%' height='220%'><feDropShadow dx='0' dy='2' stdDeviation='1.6' flood-color='#000000' flood-opacity='0.3'/></filter><path filter='url(#ds)' d='M${topPts} L${botPts} Z' fill='${color}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Vertical strip band: jagged on BOTH long edges (left + right), seamlessly
// tileable top-bottom. thickness = band width, length = tile height.
function tornStripVDataUri(color, seed = 2, length = 64, thickness = 36) {
  const rand = mulberry32(seed)
  const segs = 22
  const depth = thickness * 0.34
  const left = tornEdgePoints(rand, length, segs, depth)
  const right = tornEdgePoints(rand, length, segs, depth)
  const leftPts = left.map(([y, d]) => `${d.toFixed(1)} ${y.toFixed(1)}`).join(' L')
  const rightPts = right
    .map(([y, d]) => `${(thickness - d).toFixed(1)} ${y.toFixed(1)}`)
    .reverse()
    .join(' L')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${thickness}' height='${length}'><filter id='ds' x='-60%' y='-20%' width='220%' height='140%'><feDropShadow dx='2' dy='0' stdDeviation='1.6' flood-color='#000000' flood-opacity='0.3'/></filter><path filter='url(#ds)' d='M${leftPts} L${rightPts} Z' fill='${color}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
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
            backgroundSize: '36px 64px',
            opacity: 1,
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
            backgroundSize: '64px 36px',
            opacity: 1,
          }}
        />
      ))}
    </>
  )
}