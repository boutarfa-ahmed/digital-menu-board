import { cardFields, templateStyle } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'
import ImageFallback from './ImageFallback.jsx'
import PriceBadge from '../primitives/PriceBadge.jsx'
import { badgeStyleOf, currencyOf } from '../../theme/designTokens'

// Size map (rem — relative units, scaled by zoneSize). Font sizes + image
// box grow proportionally; outer container itself stays % / rem only.
const SIZE_MAP = {
  sm: { img: 6, title: 1, desc: 0.75 },
  md: { img: 8, title: 1.125, desc: 0.875 },
  lg: { img: 11, title: 1.5, desc: 1 },
}

// Cartes agrandies pour le template "image-details" (image +70px au total,
// texte +10px au total, prix +5px au-dessus du format md standard).
const IMG_BOOST_REM = 70 / 16
const TEXT_BOOST_REM = 10 / 16
const PRICE_SCALE = 1.17

// image-title-desc-price template: pre-cut PNG photo (object-fit contain +
// drop-shadow cutout, NO background rectangle behind it), bold single-line
// Anton title, 2-line muted description, and the PriceBadge sticker (T7.2)
// below the description (larger, md). `mirror` flips the image to the opposite
// side and right-aligns the text/price for the right half of a grid.
export default function ImageTitleDescPriceCard({
  item,
  theme,
  badgeConfig,
  align = 'left',
  showPrice = true,
  zoneSize = 'md',
  template,
  mirror = false,
}) {
  const { name, description, price, imageUrl } = cardFields(item)
  const row = align === 'right' ? 'flex-row-reverse text-right' : ''
  const s = SIZE_MAP[zoneSize] || SIZE_MAP.md
  const ts = templateStyle(template)
  const imgSize = `${((s.img + IMG_BOOST_REM) * (ts.media ? 1.2 : ts.scale)).toFixed(2)}rem`
  const titleSize = `${((s.title + TEXT_BOOST_REM) * ts.scale).toFixed(2)}rem`
  const descSize = `${((s.desc + TEXT_BOOST_REM) * ts.scale).toFixed(2)}rem`

  return (
    <div className={`relative flex w-full items-center gap-4 ${row}`}>
      <div
        className="relative shrink-0"
        style={{ width: imgSize, height: imgSize, order: mirror ? 3 : 1 }}
      >
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
      </div>
      <div className={`order-2 flex min-w-0 flex-1 flex-col ${mirror ? 'items-end text-right' : 'items-start text-left'}`}>
        <h3
          className="w-full break-words font-display font-semibold uppercase leading-tight tracking-wide text-menu-text"
          style={{ fontSize: titleSize }}
        >
          {name}
        </h3>
        {description ? (
          <p
            className="line-clamp-2 mt-1 w-full font-body leading-relaxed text-menu-text-muted"
            style={{ fontSize: descSize }}
          >
            {description}
          </p>
        ) : null}
        {showPrice && price != null ? (
          <div className="mt-2 flex items-center" style={{ transform: `scale(${PRICE_SCALE})`, transformOrigin: mirror ? 'top right' : 'top left' }}>
            <PriceBadge price={price} size="md" rotate badgeStyle={badgeStyleOf(theme)} currency={currencyOf(theme)} />
          </div>
        ) : null}
      </div>
      <CardBadge config={badgeConfig} />
    </div>
  )
}
