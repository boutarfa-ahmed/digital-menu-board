import { useMemo } from 'react'

// Deterministic PRNG so the hatch never changes between renders (seeded).
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Full-box clip-path for an ENTIRE zone (not a thin strip): 3 straight edges,
// ONE torn/jagged edge. `depth` = how deep the teeth cut in, as a % of the
// box's own width/height. Same deterministic mulberry32 seeding as the band above.
export function tornZoneClipPath(edge, seedKey, jaggedness = 5, depth = 6) {
  const rand = mulberry32(String(seedKey).split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const teeth = 8 + Math.round(jaggedness * 1.6)
  const pts = []
  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth
    const jitter = (rand() - 0.5) * 2.5
    const d = Math.pow(rand(), 1.5) * depth
    pts.push([t * 100 + jitter, d])
  }
  const fmt = (v) => `${Math.max(0, Math.min(100, v)).toFixed(2)}%`

  if (edge === 'right') {
    const out = ['0% 0%', '0% 100%']
    for (let i = pts.length - 1; i >= 0; i--) out.push(`${fmt(100 - pts[i][1])} ${fmt(pts[i][0])}`)
    return `polygon(${out.join(', ')})`
  }
  if (edge === 'left') {
    const out = ['100% 0%', '100% 100%']
    for (let i = pts.length - 1; i >= 0; i--) out.push(`${fmt(pts[i][1])} ${fmt(pts[i][0])}`)
    return `polygon(${out.join(', ')})`
  }
  if (edge === 'bottom') {
    const out = ['0% 0%', '100% 0%']
    for (let i = pts.length - 1; i >= 0; i--) out.push(`${fmt(pts[i][0])} ${fmt(100 - pts[i][1])}`)
    return `polygon(${out.join(', ')})`
  }
  const out = ['0% 100%', '100% 100%']
  for (let i = pts.length - 1; i >= 0; i--) out.push(`${fmt(pts[i][0])} ${fmt(pts[i][1])}`)
  return `polygon(${out.join(', ')})`
}

// Hand-drawn "hash" strokes for the band: overlapping diagonal lines in both
// directions (#-marks) at irregular spacing (~5px, some 7px / 8px) so the
// pattern reads as many small gradients going up and down, not a perfect grid.
function hatchCss(fillColor, jaggedness) {
  const rand = mulberry32(Math.round(fillColor.split('').reduce((a, c) => a + c.charCodeAt(0), 0)))
  const stroke = 'rgba(0,0,0,0.32)'
  const layers = []
  const periods = [5, 6, 8]
  for (let i = 0; i < 4; i++) {
    const period = periods[i % periods.length] + (rand() - 0.5) * 0.8
    const jitter = (rand() - 0.5) * Math.min(2, jaggedness)
    const start = Math.max(0.5, period * 0.7 + jitter)
    for (const dir of ['45deg', '-45deg']) {
      layers.push(`repeating-linear-gradient(${dir}, transparent 0 ${start.toFixed(2)}px, ${stroke} ${start.toFixed(2)}px ${start.toFixed(2) + period}px)`)
    }
  }
  return layers.join(',')
}

/**
 * TornEdge — hatched accent band on one edge of a container (replaces the old
 * torn-paper strip). An absolutely-positioned strip (default 10px thick) filled
 * with a gray "hash" pattern: diagonal #-marks every ~5px, slightly irregular
 * so it looks hand-drawn. No layout logic — the consumer drops it in an
 * absolute child of their own position:relative wrapper.
 *
 * @param {'top'|'bottom'|'left'|'right'} position - which edge the band sits on
 * @param {string} [fillColor=#B9B9B9] - band color (gray by default)
 * @param {number} [jaggedness=5] - stroke irregularity scale
 * @param {number} [thickness=10] - band thickness in px (the "10px border")
 * @param {string} [className] - extra classes for the consumer's positioning
 */
export default function TornEdge({
  position = 'bottom',
  fillColor = '#B9B9B9',
  jaggedness = 5,
  thickness = 10,
  className,
}) {
  const background = useMemo(
    () => hatchCss(fillColor, jaggedness),
    [fillColor, jaggedness]
  )

  const horizontal = position === 'top' || position === 'bottom'
  const bandStyle = horizontal
    ? {
        [position]: 0,
        left: 0,
        right: 0,
        height: thickness,
      }
    : {
        [position]: 0,
        top: 0,
        bottom: 0,
        width: thickness,
      }

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        backgroundColor: fillColor,
        backgroundImage: background,
        backgroundRepeat: 'repeat',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
        ...bandStyle,
      }}
    />
  )
}