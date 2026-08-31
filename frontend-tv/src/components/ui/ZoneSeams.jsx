// Torn-paper dividers rendered between adjacent zones. Active when the
// screen background pattern is 'torn-paper': every vertical/horizontal seam
// where two zones touch gets a jagged torn band (patternColor), mirroring the
// classic "torn paper divider between panels" look from the design spec.
//
// The tooth shape is traced pixel-by-pixel from a licensed torn-paper
// reference (Vecteezy #1222320, top+bottom edges sampled independently, see
// scratchpad notes) rather than generated — fixed points, not random, so this
// is the literal reference silhouette on every seam. Kept as plain [x, depth]
// arrays (not an SVG file) so it stays recolorable per theme and needs no
// image asset/network request.
// Keep TORN_TOP/TORN_BOTTOM in sync with the admin builder's own copy in
// ScreenLayoutCanvas.jsx (the two apps share no module to import from).

const GRID = 12
const DESIGN_W = 1920
const DESIGN_H = 1080

const TILE_LEN = 220
const THICKNESS = 40

// prettier-ignore
const TORN_TOP = [[0.0,4.9],[2.4,5.4],[4.9,5.6],[7.3,8.2],[9.8,10.5],[12.2,12.0],[14.7,12.6],[17.1,12.6],[19.6,12.0],[22.0,10.8],[24.4,10.3],[26.9,11.1],[29.3,11.6],[31.8,11.8],[34.2,11.8],[36.7,11.5],[39.1,10.8],[41.6,9.8],[44.0,9.5],[46.4,9.7],[48.9,10.2],[51.3,10.7],[53.8,11.0],[56.2,11.0],[58.7,10.3],[61.1,10.0],[63.6,10.2],[66.0,10.0],[68.4,9.7],[70.9,9.3],[73.3,9.3],[75.8,9.5],[78.2,10.0],[80.7,9.8],[83.1,9.5],[85.6,9.2],[88.0,9.3],[90.4,10.7],[92.9,11.5],[95.3,10.8],[97.8,10.2],[100.2,10.3],[102.7,12.1],[105.1,13.3],[107.6,13.6],[110.0,13.4],[112.4,12.6],[114.9,11.8],[117.3,11.0],[119.8,11.0],[122.2,10.5],[124.7,9.5],[127.1,8.4],[129.6,7.2],[132.0,6.2],[134.4,5.4],[136.9,4.6],[139.3,3.8],[141.8,2.9],[144.2,2.1],[146.7,1.8],[149.1,1.5],[151.6,1.5],[154.0,0.8],[156.4,0.3],[158.9,0.0],[161.3,0.0],[163.8,0.3],[166.2,0.8],[168.7,0.8],[171.1,0.0],[173.6,0.3],[176.0,1.6],[178.4,3.1],[180.9,3.4],[183.3,3.4],[185.8,3.8],[188.2,4.3],[190.7,5.1],[193.1,5.1],[195.6,4.9],[198.0,4.4],[200.4,3.9],[202.9,3.6],[205.3,3.4],[207.8,3.8],[210.2,4.8],[212.7,5.4],[215.1,5.7],[217.6,5.6],[220.0,5.1]]

// prettier-ignore
const TORN_BOTTOM = [[0.0,3.7],[2.4,3.7],[4.9,3.2],[7.3,5.5],[9.8,6.4],[12.2,7.1],[14.7,9.4],[17.1,10.9],[19.6,11.1],[22.0,10.2],[24.4,9.9],[26.9,12.1],[29.3,11.0],[31.8,11.6],[34.2,12.8],[36.7,13.6],[39.1,13.4],[41.6,12.6],[44.0,12.2],[46.4,12.4],[48.9,12.9],[51.3,13.6],[53.8,11.6],[56.2,10.1],[58.7,12.2],[61.1,11.7],[63.6,9.6],[66.0,7.7],[68.4,6.9],[70.9,7.6],[73.3,8.1],[75.8,7.5],[78.2,7.4],[80.7,7.7],[83.1,8.4],[85.6,10.9],[88.0,11.6],[90.4,11.1],[92.9,9.7],[95.3,8.3],[97.8,8.3],[100.2,8.9],[102.7,9.3],[105.1,9.1],[107.6,10.1],[110.0,10.7],[112.4,7.8],[114.9,6.0],[117.3,5.5],[119.8,6.9],[122.2,6.5],[124.7,7.4],[127.1,8.1],[129.6,8.7],[132.0,8.9],[134.4,8.7],[136.9,8.0],[139.3,7.6],[141.8,8.2],[144.2,8.5],[146.7,8.3],[149.1,7.3],[151.6,5.6],[154.0,4.1],[156.4,3.9],[158.9,0.5],[161.3,2.1],[163.8,1.1],[166.2,1.4],[168.7,2.1],[171.1,2.0],[173.6,0.5],[176.0,0.0],[178.4,0.6],[180.9,2.0],[183.3,3.1],[185.8,4.2],[188.2,4.2],[190.7,3.9],[193.1,3.9],[195.6,4.1],[198.0,4.6],[200.4,5.1],[202.9,5.3],[205.3,4.9],[207.8,4.9],[210.2,4.3],[212.7,3.4],[215.1,2.9],[217.6,2.8],[220.0,3.6]]

// Horizontal strip band: jagged on both long edges (top + bottom), tileable
// left-right (the traced segment's end nearly matches its start on both
// edges, so the repeat is effectively invisible).
function tornStripDataUri(color) {
  const topPts = TORN_TOP.map(([x, d]) => `${x} ${d}`).join(' L')
  const botPts = TORN_BOTTOM
    .map(([x, d]) => `${x} ${(THICKNESS - d).toFixed(1)}`)
    .reverse()
    .join(' L')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${TILE_LEN}' height='${THICKNESS}'><filter id='ds' x='-20%' y='-60%' width='140%' height='220%'><feDropShadow dx='0' dy='2' stdDeviation='1.6' flood-color='#000000' flood-opacity='0.3'/></filter><path filter='url(#ds)' d='M${topPts} L${botPts} Z' fill='${color}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Vertical strip band: same two traced curves, transposed onto left/right
// instead of top/bottom — one shared tooth family in both directions.
function tornStripVDataUri(color) {
  const leftPts = TORN_TOP.map(([y, d]) => `${d} ${y}`).join(' L')
  const rightPts = TORN_BOTTOM
    .map(([y, d]) => `${(THICKNESS - d).toFixed(1)} ${y}`)
    .reverse()
    .join(' L')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${THICKNESS}' height='${TILE_LEN}'><filter id='ds' x='-60%' y='-20%' width='220%' height='140%'><feDropShadow dx='2' dy='0' stdDeviation='1.6' flood-color='#000000' flood-opacity='0.3'/></filter><path filter='url(#ds)' d='M${leftPts} L${rightPts} Z' fill='${color}'/></svg>`
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

// Which of THIS zone's 4 edges has a visible torn seam on it — same pairing
// rules as computeSeams above (shared edge + overlapping span), so a zone
// next to the seam band can inset its own content away from that specific
// edge instead of every edge (see ZoneRenderer's per-side padding).
export function zoneSeamEdges(zones, hiddenSeams = []) {
  const hidden = new Set(hiddenSeams || [])
  const map = {}
  const mark = (zone, side, key) => {
    if (hidden.has(key)) return
    if (!map[zone.id]) map[zone.id] = {}
    map[zone.id][side] = true
  }
  const list = zones || []
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = list[i]
      const b = list[j]
      const yTop = Math.max(a.y, b.y)
      const ySpan = Math.min(a.y + a.h, b.y + b.h) - yTop
      const xLeft = Math.max(a.x, b.x)
      const xSpan = Math.min(a.x + a.w, b.x + b.w) - xLeft
      if (ySpan > 0) {
        if (a.x + a.w === b.x) {
          const key = `v:${b.x}:${yTop}:${ySpan}`
          mark(a, 'right', key)
          mark(b, 'left', key)
        }
        if (b.x + b.w === a.x) {
          const key = `v:${a.x}:${yTop}:${ySpan}`
          mark(b, 'right', key)
          mark(a, 'left', key)
        }
      }
      if (xSpan > 0) {
        if (a.y + a.h === b.y) {
          const key = `h:${b.y}:${xLeft}:${xSpan}`
          mark(a, 'bottom', key)
          mark(b, 'top', key)
        }
        if (b.y + b.h === a.y) {
          const key = `h:${a.y}:${xLeft}:${xSpan}`
          mark(b, 'bottom', key)
          mark(a, 'top', key)
        }
      }
    }
  }
  return map
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
      {vv.map((s) => {
        // Two segments on the same seam line (one per zone pair touching it)
        // are laid out top:%/height:px back to back — that mix of units can
        // round to sub-pixel-apart edges in the browser instead of exactly
        // touching, leaving a hairline gap. OUTSET pads each segment's div a
        // touch past its true span (symmetric, so the midpoint doesn't move)
        // so neighbors overlap by a hair instead of risking that gap; the
        // background-position anchor below still uses the TRUE (non-outset)
        // position so the tile phase itself doesn't shift.
        const yPx = (s.a / GRID) * DESIGN_H
        const hPx = (s.span / GRID) * DESIGN_H
        const OUTSET = 1
        return (
          <div
            key={`zsv${s.key}`}
            className="pointer-events-none absolute z-30"
            style={{
              left: `${(s.pos / GRID) * 100}%`,
              top: `${yPx - OUTSET / 2}px`,
              width: THICKNESS,
              height: `${hPx + OUTSET}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Drift lives on this inner layer, not the outer div above: the
                outer transform centers the strip on the seam line (static), so
                the two don't fight over the same CSS property. */}
            <div
              className="torn-seam-drift h-full w-full"
              style={{
                backgroundImage: tornStripVDataUri(patternColor),
                backgroundRepeat: 'repeat-y',
                backgroundSize: `${THICKNESS}px ${TILE_LEN}px`,
                // Anchor the tile to this segment's own global Y (not its local
                // 0) so two segments on the same seam line pick up the pattern
                // where the other left off instead of each restarting it.
                backgroundPositionY: `${-((yPx - OUTSET / 2) % TILE_LEN)}px`,
              }}
            />
          </div>
        )
      })}
      {hh.map((s) => {
        const xPx = (s.a / GRID) * DESIGN_W
        const wPct = (s.span / GRID) * 100
        const OUTSET = 1
        return (
          <div
            key={`zsh${s.key}`}
            className="pointer-events-none absolute z-30"
            style={{
              left: `calc(${(s.a / GRID) * 100}% - ${OUTSET / 2}px)`,
              top: `${(s.pos / GRID) * 100}%`,
              width: `calc(${wPct}% + ${OUTSET}px)`,
              height: THICKNESS,
              transform: 'translateY(-50%)',
            }}
          >
            <div
              className="torn-seam-drift h-full w-full"
              style={{
                backgroundImage: tornStripDataUri(patternColor),
                backgroundRepeat: 'repeat-x',
                backgroundSize: `${TILE_LEN}px ${THICKNESS}px`,
                // Same anchoring as the vertical band above, along X this time.
                backgroundPositionX: `${-((xPx - OUTSET / 2) % TILE_LEN)}px`,
              }}
            />
          </div>
        )
      })}
    </>
  )
}
