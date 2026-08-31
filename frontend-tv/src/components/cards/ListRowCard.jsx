import { cardFields, templateStyle } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'
import ImageFallback from './ImageFallback.jsx'
import PriceBadge from '../primitives/PriceBadge.jsx'
import QtyBadge from '../primitives/QtyBadge.jsx'
import { badgeStyleOf, badgeTypeOf, currencyOf } from '../../theme/designTokens'

// list-row-price-qty template: thumbnail — name — qty badge — right-aligned
// price (Extras/Desserts style). Name forced uppercase — the reference rows
// ("TEDNERS", "WINGS") are always solid caps regardless of how it was typed
// into the admin, unlike a MenuItem's own display casing elsewhere.
export default function ListRowCard({
  item,
  theme,
  badgeConfig,
  qtyLabel,
  showPrice = true,
  template,
  scale = 1,
  badgeType,
  variant,
}) {
  const { name, price, imageUrl } = cardFields(item)
  const ts = templateStyle(template)
  const s = ts.scale * scale
  const imgSize = Math.round(64 * (ts.media ? 1.3 * scale : s))
  const fontSize = Math.round(16 * s)
  const py = Math.round(12 * s)
  const priceFontSize = Math.round(24 * s)

  return (
    <div
      className={`relative flex items-center justify-between gap-4 border-b ${ts.minimal ? 'border-menu-text-muted/10' : 'border-menu-text-muted/20'}`}
      style={{ paddingTop: py, paddingBottom: py }}
    >
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: imgSize, height: imgSize }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-contain"
            style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.3))' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-menu-badge">
            <ImageFallback label={name} />
          </div>
        )}
      </div>
      <span
        className={`min-w-0 flex-1 font-menu-body font-semibold uppercase text-menu-text ${ts.media ? 'text-center' : ''}`}
        style={{ fontSize }}
      >
        {name}
      </span>
      {qtyLabel != null ? <QtyBadge qty={qtyLabel} size="sm" /> : null}
      {showPrice && price != null ? (
        <div className="shrink-0">
          <PriceBadge
            price={price}
            size="sm"
            fontSize={priceFontSize}
            badgeStyle={badgeStyleOf(theme)}
            badgeType={badgeTypeOf(badgeType)}
            variant={variant}
            currency={currencyOf(theme)}
          />
        </div>
      ) : null}
      <CardBadge config={badgeConfig} />
    </div>
  )
}
