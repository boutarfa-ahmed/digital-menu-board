// T7.3 — Zone badge/label overlay. Rendered from a zone's badgeConfig JSON:
// { text, price, style: torn-paper|ribbon|circle-stamp, position: corner anchor }.
const BADGE_STYLES = ['torn-paper', 'ribbon', 'circle-stamp']

const POSITIONS = {
  'top-left': 'left-2 top-2',
  'top-center': 'left-1/2 top-2 -translate-x-1/2',
  'top-right': 'right-2 top-2',
  'bottom-left': 'left-2 bottom-2',
  'bottom-center': 'left-1/2 bottom-2 -translate-x-1/2',
  'bottom-right': 'right-2 bottom-2',
}

// Jagged "torn paper" top edge (shared look with PriceBadge)
const TORN_CLIP =
  'polygon(0% 0%, 2.4% 7%, 4.6% 1.5%, 8% 9%, 10.5% 2%, 14% 8%, 16.8% 0.5%, 20% 7%, 23% 2.5%, 26.5% 9.5%, 29% 1.5%, 32.5% 7.5%, 35% 0%, 100% 0%, 100% 100%, 0% 100%)'

function PriceContent({ price, size = 'text-xl' }) {
  const [integer, decimal] = price.toFixed(2).split('.')
  return (
    <span className={`${size} font-menu-header leading-none`}>
      {integer}
      <span className="align-super text-[0.55em] leading-none">,{decimal}€</span>
    </span>
  )
}

export default function ZoneBadge({ config }) {
  if (!config) return null

  const style = BADGE_STYLES.includes(config.style) ? config.style : 'torn-paper'
  const positionClass = POSITIONS[config.position] || POSITIONS['top-right']
  const text = config.text
  const price = typeof config.price === 'number' ? config.price : null

  const base = `pointer-events-none absolute z-20 ${positionClass}`

  if (style === 'ribbon') {
    return (
      <span className={`${base}`}>
        <span
          className="block bg-menu-accent px-5 py-1.5 font-menu-header text-sm uppercase tracking-widest text-white shadow-menu-badge"
          style={{ transform: 'skewX(-10deg)' }}
        >
          <span style={{ display: 'inline-block', transform: 'skewX(10deg)' }}>
            {text || (price != null ? <PriceContent price={price} size="text-lg" /> : null)}
          </span>
        </span>
      </span>
    )
  }

  if (style === 'circle-stamp') {
    return (
      <span
        className={`${base} flex h-20 w-20 -rotate-6 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-dashed bg-menu-badge text-menu-accent shadow-menu-badge`}
      >
        {text ? (
          <span className="px-1 text-center font-menu-header text-[10px] uppercase leading-tight tracking-wider">
            {text}
          </span>
        ) : null}
        {price != null ? <PriceContent price={price} size="text-xl" /> : null}
      </span>
    )
  }

  // torn-paper (default): ripped top edge, slight rotation, stamped paper tag
  return (
    <span
      className={`${base} inline-flex items-center gap-2 bg-menu-badge px-4 py-1.5 text-menu-dark shadow-menu-badge`}
      style={{ clipPath: TORN_CLIP, transform: 'rotate(-1.5deg)' }}
    >
      {text ? (
        <span className="font-menu-header text-sm uppercase tracking-wide">{text}</span>
      ) : null}
      {price != null ? <PriceContent price={price} /> : null}
    </span>
  )
}
