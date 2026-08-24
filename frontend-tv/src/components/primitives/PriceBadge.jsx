import { BADGE_STYLES, BADGE_TYPES, DEFAULT_CURRENCY } from '../../theme/designTokens'

// Two badge designs, each with a sombre/clair variant:
//
//   type1 — the original Galaxy Food sticker: one jagged rip across the
//           top-left corner, decimals tinted with the accent colour.
//   type2 — the price tag used on the reference menu boards: a paper strip
//           torn along the top AND bottom edge, decimals in the same ink as
//           the integer (those boards never tint the cents), and a drop
//           shadow so the strip lifts off the panel.
//
// `size` picks a preset; type2 carries more vertical padding because its rips
// eat into both edges and the digits have to clear them.
const SIZE_STYLES = {
  type1: {
    sm: { pad: 'px-2.5 py-1', int: 'text-2xl' },
    md: { pad: 'px-3.5 py-1.5', int: 'text-3xl' },
    lg: { pad: 'px-5 py-2', int: 'text-5xl' },
  },
  type2: {
    sm: { pad: 'px-3 py-2', int: 'text-2xl' },
    md: { pad: 'px-4 py-2.5', int: 'text-3xl' },
    lg: { pad: 'px-6 py-3.5', int: 'text-5xl' },
  },
}

// type1: a single rip across the top-left corner, the rest of the box square.
const TORN_CLIP_TYPE1 =
  'polygon(0% 0%, 2.4% 7%, 4.6% 1.5%, 8% 9%, 10.5% 2%, 14% 8%, 16.8% 0.5%, 20% 7%, 23% 2.5%, 26.5% 9.5%, 29% 1.5%, 32.5% 7.5%, 35% 0%, 100% 0%, 100% 100%, 0% 100%)'

// type2: torn along the full width of both horizontal edges. Peaks and valleys
// alternate at irregular widths (2.6%-6.8%) so the edge reads as torn paper
// rather than as a zigzag border. Generated once from a fixed seed and frozen
// here: a shape recomputed per render would shimmer on the TV.
// Keep in sync with BADGE_TYPE2_CLIP in the admin builder's thumbnail.
const TORN_CLIP_TYPE2 =
  'polygon(0.0% 1.6%, 4.6% 8.7%, 8.0% 0.7%, 13.8% 8.9%, 16.7% 1.8%, 21.9% 8.2%, 26.0% 1.0%, 28.7% 7.5%, 31.7% 1.3%, 37.2% 6.5%, 41.1% 1.5%, 47.2% 8.0%, 53.4% 2.0%, 59.0% 6.3%, 62.9% 1.6%, 67.3% 8.0%, 72.7% 1.9%, 76.6% 7.5%, 80.7% 0.8%, 85.9% 6.0%, 88.9% 1.7%, 95.4% 5.7%, 100% 2.0%, 100.0% 98.8%, 95.3% 92.9%, 90.6% 97.9%, 87.2% 91.6%, 81.3% 98.1%, 78.6% 92.5%, 72.4% 99.1%, 68.7% 93.5%, 64.9% 97.5%, 59.5% 92.3%, 55.2% 98.1%, 51.0% 91.5%, 46.0% 98.3%, 42.2% 90.6%, 37.3% 98.5%, 33.2% 92.5%, 29.1% 97.7%, 23.3% 91.8%, 17.6% 98.6%, 14.3% 91.6%, 8.7% 98.1%, 5.8% 91.5%, 1.5% 98.3%, 0% 98.0%)'

// Colour schemes keyed by type then variant — no inline conditionals in JSX.
const VARIANT_STYLES = {
  type1: {
    dark: { badge: 'bg-badge-black text-white', cents: 'text-accent-orange', currency: 'text-white/85' },
    light: {
      badge: 'bg-menu-badge text-menu-dark border-2 border-badge-black',
      cents: 'text-accent-orange',
      currency: 'text-menu-dark/75',
    },
  },
  type2: {
    // Monochrome on purpose: on the reference boards the decimals carry the
    // same ink as the integer and only the size changes. No border either —
    // the torn edge already separates the tag from the panel.
    dark: { badge: 'bg-badge-black text-white', cents: 'text-white', currency: 'text-white' },
    light: { badge: 'bg-menu-badge text-menu-dark', cents: 'text-menu-dark', currency: 'text-menu-dark' },
  },
}

// filter is applied before clip-path on the same element, so a drop-shadow set
// alongside the clip would be silhouetted from the unclipped box and then cut
// away. Putting it on the wrapper shadows the already-clipped child instead.
const TYPE2_SHADOW = 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))'

function resolveShape(badgeType, badgeStyle) {
  if (badgeStyle === 'rounded') return { borderRadius: '9999px', skew: false }
  if (badgeStyle === 'ribbon') return { borderRadius: '4px', skew: true }
  // torn-paper, or type2's own default look when the theme says nothing.
  if (badgeType === 'type2') {
    return { borderRadius: '0', clipPath: TORN_CLIP_TYPE2, skew: false }
  }
  if (BADGE_STYLES.includes(badgeStyle)) {
    return { borderRadius: '6px 6px 2px 2px', clipPath: TORN_CLIP_TYPE1, skew: false }
  }
  return { borderRadius: '8px', skew: false } // plain slightly-rounded sticker
}

// PriceBadge — stamped-style price sticker. Renders the integer part large,
// the cents as a smaller raised superscript, then the currency symbol.
// Format: "12,90CHF" (NOT "CHF12.90"). Inline spans so vertical-align: super
// works reliably in Chromium-based TV webviews.
// `tone` remains a deprecated alias for `variant`: tone="paper" == "light",
// tone="black" == "dark".
/**
 * @param {number} price - value to format, e.g. 12.9 -> "12", "90", "CHF"
 * @param {'sm'|'md'|'lg'} [size=md] - scales padding + integer size
 * @param {number|boolean} [rotate=0] - degrees to rotate the badge (e.g. -2);
 *   `true` maps to -2deg for legacy boolean usage
 * @param {string} [currency=DEFAULT_CURRENCY] - trailing currency symbol
 * @param {string} [badgeStyle] - 'torn-paper'|'rounded'|'ribbon' shape from the
 *   theme; defaults to a slightly-rounded sticker (type1) or a torn strip (type2)
 * @param {'type1'|'type2'} [badgeType=type1] - which of the two designs to use
 * @param {'dark'|'light'} [variant=dark] - colour scheme (dark stays default)
 * @param {'black'|'paper'} [tone] - deprecated alias for `variant`
 * @param {number} [fontSize] - explicit integer-part pixel size; overrides the
 *   sm/md/lg presets so the badge scales up to 100px (used by free elements).
 */
export default function PriceBadge({
  price,
  size = 'md',
  rotate = 0,
  currency = DEFAULT_CURRENCY,
  badgeStyle = null,
  badgeType,
  variant,
  tone = 'black',
  fontSize,
}) {
  // .toFixed(2) + split keeps the format locale-independent across TV browsers.
  const [integer, cents] = price.toFixed(2).split('.')
  const tKey = BADGE_TYPES.includes(badgeType) ? badgeType : 'type1'
  const s = SIZE_STYLES[tKey][size] || SIZE_STYLES[tKey].md
  // Explicit variant wins; otherwise fall back to legacy `tone`; default dark.
  const vKey = variant === 'light' || (!variant && tone === 'paper') ? 'light' : 'dark'
  const v = VARIANT_STYLES[tKey][vKey]
  const fontOverride = fontSize ? Math.max(8, Math.min(fontSize, 100)) : null

  const shape = resolveShape(tKey, badgeStyle)
  const rotateDeg = rotate ? (typeof rotate === 'number' ? rotate : -2) : 0
  const transform =
    [rotateDeg ? `rotate(${rotateDeg}deg)` : '', shape.skew ? 'skewX(-8deg)' : '']
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div
      className="inline-block"
      style={{ transform, filter: tKey === 'type2' ? TYPE2_SHADOW : undefined }}
    >
      <div
        className={`inline-block font-display ${v.badge} ${s.pad}`}
        style={{
          borderRadius: shape.borderRadius,
          clipPath: shape.clipPath,
          ...(fontOverride ? { fontSize: fontOverride } : {}),
        }}
      >
        <span className={`${s.int} leading-none`} style={fontOverride ? { fontSize: '1em' } : undefined}>
          {integer}
        </span>
        <span className={`align-super leading-none ${v.cents}`} style={{ fontSize: 'calc(0.55em + 10px)' }}>
          ,{cents}
        </span>
        <span className={`leading-none ${v.currency}`} style={{ fontSize: 'calc(0.65em + 10px)' }}>
          {currency}
        </span>
      </div>
    </div>
  )
}
