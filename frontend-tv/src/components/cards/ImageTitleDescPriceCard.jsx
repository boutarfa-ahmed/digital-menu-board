import { cardFields, templateStyle } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'
import ImageFallback from './ImageFallback.jsx'
import PriceBadge from '../ui/PriceBadge.jsx'
import { badgeStyleOf } from '../../theme/designTokens'

// image-title-desc-price template: image left (or right) + text block.
// Price stays out by default (per-panel badge style) unless showPrice is on.
export default function ImageTitleDescPriceCard({
  item,
  theme,
  badgeConfig,
  align = 'left',
  showPrice = false,
  template,
}) {
  const { name, description, price, imageUrl } = cardFields(item)
  const row = align === 'right' ? 'flex-row-reverse text-right' : ''
  const ts = templateStyle(template)
  const imgSize = Math.round(128 * (ts.media ? 1.2 : ts.scale))
  const titleSize = Math.round(18 * ts.scale)
  const descSize = Math.round(14 * ts.scale)

  return (
    <div className={`relative flex items-center gap-4 ${row}`}>
      <div
        className={`shrink-0 overflow-hidden rounded-xl bg-menu-badge ${ts.minimal ? '' : 'shadow-menu-badge'}`}
        style={{ width: imgSize, height: imgSize }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <ImageFallback label={name} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className="font-menu-header uppercase leading-tight tracking-wide text-menu-text"
          style={{ fontSize: titleSize }}
        >
          {name}
        </h3>
        {description ? (
          <p
            className="line-clamp-3 mt-1 font-menu-body leading-relaxed text-menu-text-muted"
            style={{ fontSize: descSize }}
          >
            {description}
          </p>
        ) : null}
        {showPrice && price != null ? (
          <div className="mt-2">
            <PriceBadge price={price} size="sm" badgeStyle={badgeStyleOf(theme)} />
          </div>
        ) : null}
      </div>
      <CardBadge config={badgeConfig} />
    </div>
  )
}
