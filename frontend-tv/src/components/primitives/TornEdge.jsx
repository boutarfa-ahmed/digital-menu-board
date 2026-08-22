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
//
// Organic-torn tuning knobs (tweak these before touching the algorithm):
// - WIDTH_VARIANCE 0.6-1.5: each tooth's span is a random 60%-150% of the
//   average width; positions are accumulated then normalized so the tear
//   still spans the full 0-100% edge (uneven spacing, not machine-cut).
// - MACRO_WAVE: a slow sine (~2.2 periods across the edge, seeded phase)
//   lifts/drops the whole silhouette by up to ±70% of depth; per-tooth noise
//   (pow 1.4 bias, up to 40% of depth) stacks on top of it.
// - RIP_CHANCE 0.2 / RIP_BONUS +30%-60% of depth: ~20% of teeth tear deeper
//   than the local norm — spots where the paper ripped further.
// - TIP_JITTER: each vertex shifts off its segment grid point by up to ±35%
//   of the local tooth width (hard-capped ±2.5% of the edge), so peaks never
//   align to a regular rhythm; clamped against both neighbours so the
//   polygon can never fold over itself.
// - Midpoints: one extra vertex per tooth takes the blend of its neighbours'
//   depths ±25% noise, breaking up straight chords for a slight curve feel.
export function tornZoneClipPath(edge, seedKey, jaggedness = 7, depth = 5) {
  const rand = mulberry32(String(seedKey).split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const teeth = 16 + Math.round(jaggedness * 2.4) // denser teeth
  const macroPhase = rand() * Math.PI * 2 // slow wave riding the whole silhouette
  const RIP_CHANCE = 0.2
  const MIN_GAP = 0.3

  // Uneven tooth spacing: randomized segment widths, normalized back to 0-100%.
  const widths = []
  let total = 0
  for (let i = 0; i < teeth; i++) {
    const w = 0.6 + rand() * 0.9
    widths.push(w)
    total += w
  }
  const xs = [0]
  let acc = 0
  for (let i = 0; i < teeth; i++) {
    acc += widths[i]
    xs.push((acc / total) * 100)
  }

  const pts = []
  for (let i = 0; i <= teeth; i++) {
    // Tip jitter scales with the local tooth width and stays inside both
    // neighbouring grid points (endpoints stay pinned at 0% / 100%).
    const cell = Math.min(
      i === 0 ? Infinity : xs[i] - xs[i - 1],
      i === teeth ? Infinity : xs[i + 1] - xs[i]
    )
    const jitMax = Math.min(2.5, cell * 0.35)
    const x = i === 0 || i === teeth ? xs[i] : xs[i] + (rand() - 0.5) * 2 * jitMax
    // Macro-wave: one slow sine swell (~2.2 periods, seeded phase) lifting or
    // dropping the entire silhouette before per-tooth noise stacks on top.
    const macro = (Math.sin((i / teeth) * Math.PI * 2.2 + macroPhase) * 0.5 + 0.5) * depth * 0.7
    let d = macro + Math.pow(rand(), 1.4) * depth * 0.4
    if (rand() < RIP_CHANCE) d += depth * (0.3 + rand() * 0.3)
    pts.push([x, Math.max(0, d)])
  }
  // Midpoints soften the straight chords between vertices into a subtle curve.
  const dense = []
  for (let i = 0; i < pts.length; i++) {
    dense.push(pts[i])
    if (i === pts.length - 1) break
    const [x0, d0] = pts[i]
    const [x1, d1] = pts[i + 1]
    const mx = Math.max(x0 + MIN_GAP, Math.min(x1 - MIN_GAP, (x0 + x1) / 2 + (rand() - 0.5) * (x1 - x0) * 0.2))
    dense.push([mx, ((d0 + d1) / 2) * (0.75 + rand() * 0.5)])
  }
  const fmt = (v) => `${Math.max(0, Math.min(100, v)).toFixed(2)}%`

  if (edge === 'right') {
    const out = ['0% 0%', '0% 100%']
    for (let i = dense.length - 1; i >= 0; i--) out.push(`${fmt(100 - dense[i][1])} ${fmt(dense[i][0])}`)
    return `polygon(${out.join(', ')})`
  }
  if (edge === 'left') {
    const out = ['100% 0%', '100% 100%']
    for (let i = dense.length - 1; i >= 0; i--) out.push(`${fmt(dense[i][1])} ${fmt(dense[i][0])}`)
    return `polygon(${out.join(', ')})`
  }
  if (edge === 'bottom') {
    const out = ['0% 0%', '100% 0%']
    for (let i = dense.length - 1; i >= 0; i--) out.push(`${fmt(dense[i][0])} ${fmt(100 - dense[i][1])}`)
    return `polygon(${out.join(', ')})`
  }
  const out = ['0% 100%', '100% 100%']
  for (let i = dense.length - 1; i >= 0; i--) out.push(`${fmt(dense[i][0])} ${fmt(dense[i][1])}`)
  return `polygon(${out.join(', ')})`
}

// Hand-drawn "hash" strokes for the band: overlapping diagonal lines in both
// directions (#-marks) at irregular spacing (~5px, some 7px / 8px, each layer
// wandering ±15% around its base period) with varied stroke weights (26%-42%
// ink coverage per layer) so the pattern reads as many small gradients going
// up and down, not a perfect grid.
function hatchCss(fillColor, jaggedness) {
  const rand = mulberry32(Math.round(fillColor.split('').reduce((a, c) => a + c.charCodeAt(0), 0)))
  const stroke = 'rgba(0,0,0,0.32)'
  const layers = []
  const periods = [5, 6, 8]
  for (let i = 0; i < 4; i++) {
    const period = (periods[i % periods.length] + (rand() - 0.5) * 0.8) * (0.85 + rand() * 0.3)
    const strokeFrac = 0.26 + rand() * 0.16
    const start = Math.max(0.5, period * (1 - strokeFrac) + (rand() - 0.5) * Math.min(2, jaggedness))
    for (const dir of ['45deg', '-45deg']) {
      layers.push(`repeating-linear-gradient(${dir}, transparent 0 ${start.toFixed(2)}px, ${stroke} ${start.toFixed(2)}px ${period.toFixed(2)}px)`)
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
        filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.18))',
        ...bandStyle,
      }}
    />
  )
}