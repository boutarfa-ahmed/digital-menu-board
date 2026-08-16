import { useMemo } from 'react'

// Deterministic PRNG so the tear never changes between renders (seeded).
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Generate the clip-path points (x/y percentage pairs) for a hand-torn strip.
// `jaggedness` scales the tooth count and the depth variance. Depths are
// random-biased toward shallow with occasional deep rips — an irregular jagged
// tear line, not a smooth wave or a regular zigzag.
function buildTear(jaggedness, seedKey) {
  const rand = mulberry32(seedKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const teeth = 8 + Math.round(jaggedness * 2)
  const maxDepth = 55 + jaggedness * 6
  const pts = []

  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth
    const jitter = (rand() - 0.5) * 3
    // rand()^1.5 biases toward 0 -> teeth mostly shallow, occasionally deep
    const depth = Math.pow(rand(), 1.5) * maxDepth
    const x = t * 100 + jitter
    const y = 100 - depth
    pts.push([x, y])
  }

  const fmt = (v) => `${v.toFixed(2)}%`

  if (seedKey === 'top') {
    const out = ['0% 100%', '100% 100%']
    for (let i = pts.length - 1; i >= 0; i--) out.push(`${fmt(pts[i][0])} ${fmt(pts[i][1])}`)
    return out
  }
  if (seedKey === 'right') {
    const out = ['0% 0%', '0% 100%']
    for (let i = pts.length - 1; i >= 0; i--) out.push(`100% ${fmt(pts[i][0])}`)
    return out
  }
  if (seedKey === 'left') {
    const out = ['100% 0%', '100% 100%']
    for (let i = pts.length - 1; i >= 0; i--) out.push(`0% ${fmt(pts[i][0])}`)
    return out
  }
  // bottom (default)
  const out = ['0% 0%', '100% 0%']
  for (let i = pts.length - 1; i >= 0; i--) out.push(`${fmt(pts[i][0])} ${fmt(pts[i][1])}`)
  return out
}

/**
 * TornEdge — torn-paper strip on one edge of a container. Renders ONLY the
 * shape: one absolutely-positioned div clipped by a jagged polygon, no layout
 * logic for surrounding content (the consumer drops it in an absolute child of
 * their own position:relative wrapper).
 *
 * @param {'top'|'bottom'|'left'|'right'} position - which edge the strip sits on
 * @param {string} fillColor - CSS color of the torn strip (e.g. var(--color-panel-light))
 * @param {number} [jaggedness=5] - tooth count + depth variance scale
 * @param {number} [thickness=16] - strip thickness in px
 * @param {string} [className] - extra classes for the consumer's positioning
 */
export default function TornEdge({
  position = 'bottom',
  fillColor = 'var(--color-panel-light)',
  jaggedness = 5,
  thickness = 16,
  className,
}) {
  const clipPath = useMemo(
    () => `polygon(${buildTear(jaggedness, position).join(', ')})`,
    [jaggedness, position]
  )

  const horizontal = position === 'top' || position === 'bottom'
  const edgeStyle = horizontal
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
        clipPath,
        ...edgeStyle,
      }}
    />
  )
}
