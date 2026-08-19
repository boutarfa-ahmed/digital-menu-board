import { cardFields, accentOf } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'

// text-only template: accent-colored bold uppercase title + description
// (Salad Formulas style).
export default function TextOnlyCard({ item, theme, badgeConfig }) {
  const { name, description } = cardFields(item)
  const accent = accentOf(theme)

  return (
    <div className="relative flex flex-col gap-1">
      <h3
        className="font-menu-header text-lg font-bold uppercase leading-tight tracking-wide"
        style={{ color: accent }}
      >
        {name}
      </h3>
      {description ? (
        <p className="font-menu-body text-sm leading-relaxed text-menu-text-muted">
          {description}
        </p>
      ) : null}
      <CardBadge config={badgeConfig} />
    </div>
  )
}
