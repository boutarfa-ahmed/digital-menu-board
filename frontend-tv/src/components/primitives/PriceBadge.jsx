import { BADGE_STYLES } from '../../theme/designTokens'

const SIZE_STYLES = {
  sm: { pad: 'px-2.5 py-1', int: 'text-2xl' },
  md: { pad: 'px-3.5 py-1.5', int: 'text-3xl' },
  lg: { pad: 'px-5 py-2', int: 'text-5xl' },
}

// Jagged "torn paper" top edge (badgeStyle = "torn-paper")
const TORN_CLIP =
  'polygon(0% 0%, 2.4% 7%, 4.6% 1.5%, 8% 9%, 10.5% 2%, 14% 8%, 16.8% 0.5%, 20% 7%, 23% 2.5%, 26.5% 9.5%, 29% 1.5%, 32.5% 7.5%, 35% 0%, 100% 0%, 100% 100%, 0% 100%)'

// Color-scheme map keyed by variant — no inline conditionals scattered in JSX.
const VARIANT_STYLES = {
  // Existing behavior, unchanged: near-black tag, white text.
  dark: {
    badge: 'bg-badge-black text-white',
    currency: 'text-white/85',
  },
  // Light: off-white/paper bg, thin solid black border, black text.
  light: {
    badge: 'bg-menu-badge text-menu-dark border-2 border-badge-black',
    currency: 'text-menu-dark/75',
  },
}

// PriceBadge — stamped-style price sticker. Renders integer part large,
// cents as a smaller raised superscript, trailing currency symbol.
// Format: "12,90€" (NOT "€12.90"). Inline spans so vertical-align: super
// works reliably in Chromium-based TV webviews.
// Two variants (T7.2b): "dark" (default — black bg, white text) and "light"
// (paper bg, dark text). `tone` remains as a deprecated alias for backward
// compat: tone="paper" == variant="light", tone="black" == variant="dark".
/**
 * @param {number} price - value to format, e.g. 12.9 -> "12", "90", "€"
 * @param {'sm'|'md'|'lg'} [size=md] - scales padding + integer size
 * @param {number|boolean} [rotate=0] - degrees to rotate the badge (e.g. -2);
 *   `true` maps to -2deg for legacy boolean usage
 * @param {string} [currency='€'] - trailing currency symbol
 * @param {string} [badgeStyle] - 'torn-paper'|'rounded'|'ribbon' variant;
 *   defaults to a slightly-rounded sticker rectangle
 * @param {'dark'|'light'} [variant=dark] - badge color scheme (dark stays default)
 * @param {'black'|'paper'} [tone] - deprecated alias for `variant`
 */
export default function PriceBadge({
  price,
  size = 'md',
  rotate = 0,
  currency = '€',
  badgeStyle = null,
  variant,
  tone = 'black',
}) {
  // .toFixed(2) + split keeps the format locale-independent across TV browsers.
  const [integer, cents] = price.toFixed(2).split('.')
  const s = SIZE_STYLES[size] || SIZE_STYLES.md
  // Explicit variant wins; otherwise fall back to legacy `tone`; default dark.
  const vKey = variant === 'light' || (!variant && tone === 'paper') ? 'light' : 'dark'
  const v = VARIANT_STYLES[vKey]

  let borderRadius = '8px' // default: slightly-rounded price sticker
  let clipPath
  let transform = rotate ? `rotate(${typeof rotate === 'number' ? rotate : -2}deg)` : undefined

  if (badgeStyle === 'rounded') {
    borderRadius = '9999px'
  } else if (badgeStyle === 'ribbon') {
    borderRadius = '4px'
    transform = `${transform || ''} skewX(-8deg)`.trim() || undefined
  } else if (BADGE_STYLES.includes(badgeStyle)) {
    // torn-paper
    borderRadius = '6px 6px 2px 2px'
    clipPath = TORN_CLIP
  }

  return (
    <div
      className={`inline-block font-display ${v.badge} ${s.pad}`}
      style={{ borderRadius, clipPath, transform }}
    >
      <span className={`${s.int} leading-none`}>{integer}</span>
      <span className="align-super text-[0.55em] leading-none text-accent-orange">,{cents}</span>
      <span className={`text-[0.65em] leading-none ${v.currency}`}>{currency}</span>
    </div>
  )
}
