import { cardFields, accentOf } from './cardUtils.js'
import CardBadge from './CardBadge.jsx'
import ImageFallback from './ImageFallback.jsx'

// icon-label template: square icon container + uppercase bold label below
// (Meat/Sauces/Extra grids). Sized in cqmin (% of the smallest side of the
// grid cell — see the `containerType: 'size'` on GridContent's cell wrapper)
// instead of fixed px, so the same zone keeps looking right when its
// gridConfig rows/cols change and the cell shrinks or grows — `scale` (the
// zone's "Taille de police" control) still fine-tunes on top of that.
export default function IconLabelCard({ item, theme, badgeConfig, scale = 1 }) {
  const { name, imageUrl } = cardFields(item)
  const accent = accentOf(theme)
  const boxSize = `clamp(40px, ${(55 * scale).toFixed(1)}cqmin, 220px)`
  const labelSize = `clamp(10px, ${(9 * scale).toFixed(1)}cqmin, 32px)`

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div
        className={`overflow-hidden ${!imageUrl ? 'bg-menu-badge' : ''}`}
        style={{
          width: boxSize,
          height: boxSize,
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
        style={{ fontSize: labelSize }}
      >
        {name}
      </span>
      <CardBadge config={badgeConfig} />
    </div>
  )
}
