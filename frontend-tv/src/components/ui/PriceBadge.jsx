import { BADGE_STYLES } from '../../theme/designTokens'

const SIZE_STYLES = {
  sm: {
    badge: 'px-2.5 py-1',
    int: 'text-xl',
  },
  md: {
    badge: 'px-3.5 py-1.5',
    int: 'text-3xl',
  },
  lg: {
    badge: 'px-5 py-2',
    int: 'text-5xl',
  },
}

// Jagged "torn paper" top edge (T7A badgeStyle = "torn-paper")
const TORN_CLIP =
  'polygon(0% 0%, 2.4% 7%, 4.6% 1.5%, 8% 9%, 10.5% 2%, 14% 8%, 16.8% 0.5%, 20% 7%, 23% 2.5%, 26.5% 9.5%, 29% 1.5%, 32.5% 7.5%, 35% 0%, 100% 0%, 100% 100%, 0% 100%)'

export default function PriceBadge({
  price,
  size = 'md',
  rotate = false,
  badgeStyle = 'torn-paper',
}) {
  const [integer, decimal] = price.toFixed(2).split('.')
  const style = SIZE_STYLES[size] || SIZE_STYLES.md

  let borderRadius = '6px'
  let clipPath
  let transform = rotate ? 'rotate(-2deg)' : undefined

  if (badgeStyle === 'rounded') {
    borderRadius = '9999px'
  } else if (badgeStyle === 'ribbon') {
    borderRadius = '4px'
    transform = `${rotate ? 'rotate(-2deg) ' : ''}skewX(-8deg)`
  } else if (BADGE_STYLES.includes(badgeStyle)) {
    // torn-paper (default): ripped top edge, straight or slightly rotated
    borderRadius = '6px 6px 2px 2px'
    clipPath = TORN_CLIP
  }

  return (
    <span
      className={`inline-flex items-end bg-menu-badge font-menu-header text-menu-dark shadow-menu-badge ${style.badge}`}
      style={{ borderRadius, clipPath, transform }}
    >
      <span className={`${style.int} leading-none`}>{integer}</span>
      <span
        className="align-super text-[0.55em] leading-none"
        style={{ letterSpacing: '0.02em' }}
      >
        ,{decimal}€
      </span>
    </span>
  )
}
