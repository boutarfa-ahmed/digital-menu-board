import PriceBadge from './PriceBadge.jsx'
import { DEFAULT_CURRENCY } from '../../theme/designTokens'

/**
 * TierPricingHeader — horizontal row of tiered pricing badges (e.g. "1 Meat
 * 8,50€", "2 Meats 9,50€"): each tier is a small paper label chip stacked above
 * a PriceBadge. Pure presentational — props in, JSX out, tailwind + CSS custom
 * properties for theme colors.
 *
 * @param {Array<{label: string, price: number}>} tiers - tier definitions
 * @param {'torn-paper'|'rounded'|'ribbon'} [badgeStyle=torn-paper] - passed to each PriceBadge
 * @param {string} [currency=DEFAULT_CURRENCY] - currency symbol for prices
 * @param {'sm'|'md'} [size=md] - PriceBadge size
 */
export default function TierPricingHeader({
  tiers,
  badgeStyle = 'torn-paper',
  currency = DEFAULT_CURRENCY,
  size = 'md',
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {tiers.map((tier, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="rounded bg-menu-badge px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-menu-dark shadow-menu-badge">
            {tier.label}
          </span>
          <PriceBadge price={tier.price} size={size} badgeStyle={badgeStyle} currency={currency} />
        </div>
      ))}
    </div>
  )
}