import { cardFields, accentOf } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'

// text-only template: accent-colored bold uppercase title + description
// (Salad Formulas style).
export default function TextOnlyCard({ item, theme, badgeConfig, scale = 1 }) {
  const { name, description } = cardFields(item)
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
      <CardBadge config={badgeConfig} />
    </div>
  )
}
