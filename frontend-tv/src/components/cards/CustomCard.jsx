import { cardFields, accentOf } from './cardUtils.js'
import ImageFallback from './ImageFallback.jsx'
import PriceBadge from '../primitives/PriceBadge.jsx'
import { badgeStyleOf, badgeTypeOf, currencyOf } from '../../theme/designTokens'

// T10 — carte « personnalisée » : la disposition vient du JSON dessiné dans
// l'admin (zone.backgroundStyle.cardLayout, ou cardLayouts[itemId] pour un
// produit qui a son propre dessin), pas du code.
//
// x/y/w/h sont des % de la carte -> la carte suit la taille de sa cellule.
// Les tailles de police sont en px dans le repère `refW` (la largeur de la
// cellule au moment du dessin) et sont converties en `cqw` : 24px dessinés sur
// une carte de 400px = 6% de la largeur de la carte, donc le texte grandit
// avec la cellule au lieu de rester figé.
//
// Garder en phase avec frontend/src/pages/admin/canvas/cardLayout.js.
const DEFAULT_SLOTS = [
  { id: 'image', type: 'image', x: 8, y: 4, w: 84, h: 56, fit: 'contain', zIndex: 1 },
  { id: 'name', type: 'name', x: 4, y: 62, w: 92, h: 20, fontSize: 30, align: 'center', valign: 'center', uppercase: true, bold: true, zIndex: 2 },
  { id: 'desc', type: 'desc', x: 4, y: 82, w: 92, h: 16, fontSize: 18, align: 'center', valign: 'start', zIndex: 2 },
  { id: 'price', type: 'price', x: 62, y: 0, w: 38, h: 22, align: 'right', valign: 'start', zIndex: 3 },
]

const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' }
const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end' }

export default function CustomCard({
  item,
  layout,
  theme,
  badgeConfig,
  qty,
  badgeType,
  variant,
}) {
  const { name, description, price, imageUrl } = cardFields(item)
  const accent = accentOf(theme)
  const slots = Array.isArray(layout?.slots) && layout.slots.length > 0 ? layout.slots : DEFAULT_SLOTS
  const refW = layout?.refW > 0 ? layout.refW : 400

  // px du repère de dessin -> unité relative à la largeur de la carte
  const fs = (px) => `${(((px || 16) / refW) * 100).toFixed(3)}cqw`

  const renderSlot = (slot) => {
    if (slot.visible === false) return null

    if (slot.type === 'image') {
      return imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full"
          style={{
            objectFit: slot.fit || 'contain',
            filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))',
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-menu-badge">
          <ImageFallback label={name} />
        </div>
      )
    }

    // Image libre (uploadée ou prise dans la bibliothèque), indépendante du
    // produit : logo, pictogramme, bandeau...
    if (slot.type === 'asset') {
      if (!slot.imageUrl) return null
      return (
        <img
          src={slot.imageUrl}
          alt=""
          className="h-full w-full"
          style={{ objectFit: slot.fit || 'contain' }}
        />
      )
    }

    if (slot.type === 'shape') {
      return (
        <div
          className="h-full w-full"
          style={{
            background: slot.bg || accent,
            borderRadius: slot.shape === 'line' ? 9999 : slot.radius || 0,
            opacity: slot.opacity ?? 1,
          }}
        />
      )
    }

    if (slot.type === 'price') {
      if (price == null) return null
      return (
        <PriceBadge
          price={price}
          size="sm"
          fontSize={fs(slot.fontSize || 26)}
          badgeStyle={badgeStyleOf(theme)}
          badgeType={badgeTypeOf(slot.badgeType || badgeType)}
          variant={variant}
          currency={currencyOf(theme)}
        />
      )
    }

    if (slot.type === 'qty') {
      if (qty == null) return null
      // Pastille dessinée ici plutôt que via QtyBadge : ses tailles sont en px
      // fixes, elles ne suivraient pas la carte quand la cellule change.
      return (
        <span
          className="inline-flex items-center justify-center rounded-full font-display font-bold leading-none text-white"
          style={{
            background: slot.color || accent,
            fontSize: fs(slot.fontSize || 18),
            width: '2em',
            height: '2em',
          }}
        >
          {typeof qty === 'number' ? `${qty}X` : qty}
        </span>
      )
    }

    if (slot.type === 'zoneBadge') {
      // Le libellé posé sur la carte prime ; sinon on reprend celui du badge
      // de la zone. Sans l'un ni l'autre, rien à afficher.
      const label = slot.text || badgeConfig?.text
      if (!label) return null
      return (
        <span
          className="inline-block whitespace-nowrap rounded px-[0.4em] py-[0.15em] font-menu-header uppercase leading-tight tracking-wide text-white"
          style={{ background: slot.color || accent, fontSize: fs(slot.fontSize || 18) }}
        >
          {label}
        </span>
      )
    }

    const value = slot.type === 'name' ? name : slot.type === 'desc' ? description : slot.text
    if (!value) return null
    return (
      <span
        className="w-full break-words"
        style={{
          fontSize: fs(slot.fontSize),
          color: slot.color || (slot.type === 'desc' ? 'var(--menu-text-muted)' : 'var(--menu-text)'),
          fontFamily: slot.fontFamily || undefined,
          textTransform: slot.uppercase ? 'uppercase' : undefined,
          fontWeight: slot.bold ? 700 : 400,
          fontStyle: slot.italic ? 'italic' : undefined,
          textAlign: slot.align || 'left',
          lineHeight: 1.15,
        }}
      >
        {value}
      </span>
    )
  }

  // clip : la carte devient une fenêtre — tout ce qui dépasse de son cadre est
  // coupé au lieu de déborder sur les cartes voisines.
  return (
    <div
      className={`relative h-full w-full ${layout?.clip ? 'overflow-hidden' : ''}`}
      style={{ containerType: 'inline-size' }}
    >
      {slots.map((slot) => {
        const content = renderSlot(slot)
        if (!content) return null
        return (
          <div
            key={slot.id}
            className="absolute flex"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.w}%`,
              height: `${slot.h}%`,
              zIndex: slot.zIndex ?? 1,
              transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
              justifyContent: JUSTIFY[slot.align] || 'flex-start',
              alignItems: ALIGN[slot.valign] || 'flex-start',
            }}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
