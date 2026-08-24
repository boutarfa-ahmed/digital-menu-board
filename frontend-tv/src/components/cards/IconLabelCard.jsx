import { cardFields, accentOf } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'
import ImageFallback from './ImageFallback.jsx'

const SIZES = {
  sm: { box: 80, label: 14 },
  md: { box: 100, label: 16 },
}

// icon-label template: circular icon container + uppercase bold label below
// (Meat/Sauces/Extra grids).
export default function IconLabelCard({ item, theme, badgeConfig, size = 'md', scale = 1 }) {
  const { name, imageUrl } = cardFields(item)
  const s = SIZES[size] || SIZES.md
  const accent = accentOf(theme)

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div
        className="overflow-hidden rounded-full bg-menu-badge shadow-menu-badge"
        style={{
          width: Math.round(s.box * scale),
          height: Math.round(s.box * scale),
          ...(!imageUrl ? { border: `2px solid ${accent}` } : {}),
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <ImageFallback accent={accent} label={name} />
        )}
      </div>
      <span
        className="font-menu-body text-center font-bold uppercase text-menu-text"
        style={{ fontSize: Math.round(s.label * scale) }}
      >
        {name}
      </span>
      <CardBadge config={badgeConfig} />
    </div>
  )
}
