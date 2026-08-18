import { useMemo } from 'react'

// Deterministic PRNG (same mulberry32 pattern as TornEdge) so the ribbon's
// torn edge stays stable between renders. Kept local so this stays a single
// self-contained component.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Right-edge torn cutout: straight left/top/bottom edges, a jagged right
// edge whose teeth eat into the ribbon by up to `thickness` px.
function ribbonClip(seedKey, thickness) {
  const rand = mulberry32(
    String(seedKey).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  )
  const teeth = 5 + Math.round(thickness / 3)
  const pts = []
  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth
    const d = Math.pow(rand(), 1.5) * thickness
    pts.push(`${Math.max(0, Math.min(100, t * 100)).toFixed(2)}% ${d.toFixed(2)}px`)
  }
  const path = ['0% 0%', '0% 100%', ...pts.map((p) => `calc(100% - ${p.split(' ')[1]}) ${p.split(' ')[0]}`)]
  return `polygon(${path.join(', ')})`
}

const SIZES = {
  sm: { pad: 'px-4 py-1', font: 15, divider: 2, torn: 10 },
  md: { pad: 'px-6 py-1.5', font: 18, divider: 2, torn: 12 },
  lg: { pad: 'px-8 py-2', font: 22, divider: 3, torn: 14 },
}

/**
 * CategoryBanner — section header: a torn-edge ribbon label followed by a
 * horizontal divider line filling the remaining width (Meat/Sauces/Extra
 * style). Ribbon background defaults to `var(--menu-accent)` so it follows
 * the zone's theme accent automatically.
 * @param {string} label - section title text (e.g. "Meat", "Sauces")
 * @param {string} [accent='var(--menu-accent)'] - ribbon + divider color
 * @param {string} [textColor='#FFFFFF'] - ribbon label text color
 * @param {'sm'|'md'|'lg'} [size='md'] - ribbon height / font / divider
 * @param {string} [className] - extra classes for the outer wrapper
 */
export default function CategoryBanner({
  label,
  accent = 'var(--menu-accent)',
  textColor = '#FFFFFF',
  size = 'md',
  className,
}) {
  const s = SIZES[size] || SIZES.md
  const clip = useMemo(() => ribbonClip(label || 'banner', s.torn), [label, s.torn])

  return (
    <div className={`flex w-full items-center gap-4 ${className}`}>
      <div
        className={`shrink-0 font-menu-header font-bold uppercase tracking-wide ${s.pad}`}
        style={{ backgroundColor: accent, color: textColor, fontSize: s.font, lineHeight: 1.2, clipPath: clip }}
      >
        {label}
      </div>
      <div className="min-w-0 flex-1" style={{ height: s.divider, backgroundColor: accent, opacity: 0.55 }} />
    </div>
  )
}