import { cardFields, templateStyle } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'
import ImageFallback from './ImageFallback.jsx'
import PriceBadge from '../primitives/PriceBadge.jsx'
import { badgeStyleOf } from '../../theme/designTokens'

// Size map (rem — relative units, scaled by zoneSize). Font sizes + image
// box grow proportionally; outer container itself stays % / rem only.
const SIZE_MAP = {
  sm: { img: 6, title: 1, desc: 0.75 },
  md: { img: 8, title: 1.125, desc: 0.875 },
  lg: { img: 11, title: 1.5, desc: 1 },
}

// Sticker corner offsets — pulled slightly outside the photo edge.
const BADGE_CORNERS = {
  'top-right': 'top-2 -right-2',
  'bottom-right': 'bottom-2 -right-2',
  'top-left': 'top-2 -left-2',
  'bottom-left': 'bottom-2 -left-2',
}

// image-title-desc-price template: pre-cut PNG photo (object-fit contain +
// drop-shadow cutout, NO background rectangle behind it), bold single-line
// Anton title, 2-line muted description, and the PriceBadge sticker (T7.2)
// overlapping a corner of the photo. Price is passed straight to PriceBadge.
export default function ImageTitleDescPriceCard({
  item,
  theme,
  badgeConfig,
  align = 'left',
  showPrice = true,
  badgePosition = 'top-right',
  zoneSize = 'md',
  template,
}) {
  const { name, description, price, imageUrl } = cardFields(item)
  const row = align === 'right' ? 'flex-row-reverse text-right' : ''
  const s = SIZE_MAP[zoneSize] || SIZE_MAP.md
  const ts = templateStyle(template)
  const imgSize = `${(s.img * (ts.media ? 1.2 : ts.scale)).toFixed(2)}rem`
  const titleSize = `${(s.title * ts.scale).toFixed(2)}rem`
  const descSize = `${(s.desc * ts.scale).toFixed(2)}rem`
  const corner = BADGE_CORNERS[badgePosition] || BADGE_CORNERS['top-right']

  return (
    <div className={`relative flex w-full items-center gap-4 ${row}`}>
      <div className="relative shrink-0" style={{ width: imgSize, height: imgSize }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-contain"
            style={{ filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.35))' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-menu-badge">
            <ImageFallback label={name} />
          </div>
        )}
        {showPrice && price != null ? (
          <div className={`absolute z-10 ${corner}`}>
            <PriceBadge price={price} size="sm" rotate badgeStyle={badgeStyleOf(theme)} />
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className="truncate font-display font-bold uppercase leading-tight tracking-wide text-menu-text"
          style={{ fontSize: titleSize }}
        >
          {name}
        </h3>
        {description ? (
          <p
            className="line-clamp-2 mt-1 font-body leading-relaxed text-menu-text-muted"
            style={{ fontSize: descSize }}
          >
            {description}
          </p>
        ) : null}
      </div>
      <CardBadge config={badgeConfig} />
    </div>
  )
}
