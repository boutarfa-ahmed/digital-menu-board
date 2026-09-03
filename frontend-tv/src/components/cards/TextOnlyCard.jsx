import { cardFields, accentOf } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'
import PriceBadge from '../primitives/PriceBadge.jsx'
import { badgeStyleOf, badgeTypeOf, currencyOf } from '../../theme/designTokens'

// text-only template: accent-colored bold uppercase title + description
// (Salad Formulas style). `showPrice` (zone control "Afficher le prix") adds
// the price sticker under the text — this template never showed one before,
// so it stays off unless the zone explicitly asks for it.
export default function TextOnlyCard({ item, theme, badgeConfig, scale = 1, showPrice = false, badgeType, variant }) {
  const { name, description, price } = cardFields(item)
  const accent = accentOf(theme)

  return (
    <div className="relative flex flex-col gap-1">
      <h3
        className="font-menu-header font-bold uppercase leading-tight tracking-wide"
        style={{ color: accent, fontSize: Math.round(18 * scale) }}
      >
        {name}
      </h3>
      {description ? (
        <p className="font-menu-body leading-relaxed text-menu-text-muted" style={{ fontSize: Math.round(14 * scale) }}>
          {description}
        </p>
      ) : null}
      {showPrice && price != null ? (
        <div className="mt-1 flex">
          <PriceBadge
            price={price}
            size="sm"
            fontSize={Math.round(20 * scale)}
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
