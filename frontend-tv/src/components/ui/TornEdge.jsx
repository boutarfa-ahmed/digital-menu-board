import { useMemo } from 'react'

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildJaggedPoints(orientation) {
  const rand = mulberry32(orientation === 'horizontal' ? 20260815 : 20260814)
  const zigzags = 12
  const pts = []

  if (orientation === 'horizontal') {
    const step = 100 / zigzags
    pts.push('0,0', '100,0')
    for (let i = 0; i < zigzags; i++) {
      const x = 100 - step * (i + 0.5) + (rand() * 2 - 1) * step * 0.3
      const y = 12 + rand() * 8
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    pts.push('0,14')
  } else {
    const step = 100 / zigzags
    pts.push('0,0', '0,100')
    for (let i = 0; i < zigzags; i++) {
      const y = 100 - step * (i + 0.5) + (rand() * 2 - 1) * step * 0.3
      const x = 12 + rand() * 8
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    pts.push('14,0')
  }

  return pts.join(' ')
}

export default function TornEdge({
  orientation = 'vertical',
  color = '#F5F3EF',
  className,
}) {
  const points = useMemo(() => buildJaggedPoints(orientation), [orientation])

  if (orientation === 'horizontal') {
    return (
      <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon points={points} fill={color} />
      </svg>
    )
  }

  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={points} fill={color} />
    </svg>
  )
}