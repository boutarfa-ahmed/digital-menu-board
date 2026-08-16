import { cardFields, templateStyle } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'
import PriceBadge from '../ui/PriceBadge.jsx'
import { badgeStyleOf } from '../../theme/designTokens'

// hero-banner template: full-bleed image, gradient overlay for legibility,
// big title + stamped price tag bottom corner. Without an image it falls back
// to a text-only accent gradient panel.
export default function HeroBannerCard({ item, theme, badgeConfig, showPrice = true, template }) {
  const { name, price, imageUrl } = cardFields(item)
  const ts = templateStyle(template)
  const titleSize = Math.round(36 * ts.scale)

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg shadow-menu-badge">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name || ''}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--menu-accent-2), var(--menu-accent))' }}
        />
      )}
      {name ? (
        <div className="absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-black/60 to-transparent" />
      ) : null}
      {name ? (
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3
            className="font-menu-header uppercase leading-tight tracking-wide text-white"
            style={{ fontSize: titleSize }}
          >
            {name}
          </h3>
        </div>
      ) : null}
      {showPrice && price != null ? (
        <div className="absolute bottom-6 right-6">
          <PriceBadge price={price} size="lg" rotate badgeStyle={badgeStyleOf(theme)} />
        </div>
      ) : null}
      <CardBadge config={badgeConfig} />
    </div>
  )
}
