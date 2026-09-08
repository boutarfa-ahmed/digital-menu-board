// Placement libre : les produits d'une zone se déplacent et se redimensionnent
// à la souris, chacun dans sa propre boîte en % de la zone — au lieu de tomber
// dans les cases d'une grille régulière.
//
// Les bornes et le repli sur la tuile par défaut viennent du schéma partagé, et
// le rendu TV correspondant est FreeContent dans
// frontend-tv/src/components/zones/ZoneRenderer.jsx.
import { useEffect, useRef, useState } from 'react'
import { PencilIcon } from '../../../icons'
import CardTemplatePreview from './CardTemplatePreview'
import { cardLayoutFor, hasOwnCardLayout } from './cardLayout'
import {
  freeItemBox,
  clampPct,
  FREE_ITEM_MIN,
  FREE_ITEM_MAX,
  FREE_ITEM_POS_MIN,
  FREE_ITEM_POS_MAX,
} from '../../../shared/menuSchema'

const HANDLES = [
  { dir: 'nw', cls: '-left-1 -top-1 cursor-nwse-resize' },
  { dir: 'ne', cls: '-right-1 -top-1 cursor-nesw-resize' },
  { dir: 'sw', cls: '-bottom-1 -left-1 cursor-nesw-resize' },
  { dir: 'se', cls: '-bottom-1 -right-1 cursor-nwse-resize' },
]

export default function FreeItemsLayer({
  zone,
  isAdmin = false,
  accent,
  text,
  showPrice = false,
  onCommit,
  onRemove,
  onEditCard,
}) {
  const layerRef = useRef(null)
  // Geste en cours : { itemId, mode, dir, rect, grab, start }. Tant qu'il dure,
  // la boîte affichée vient d'ici et non de la zone — le produit suit la souris
  // sans aller-retour serveur à chaque pixel.
  const [gesture, setGesture] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const items = zone.items || []

  const boxOf = (zi, i) =>
    gesture && gesture.itemId === zi.itemId ? gesture.rect : freeItemBox(zi, i)

  const pctFromEvent = (e) => {
    const r = layerRef.current?.getBoundingClientRect()
    if (!r || !r.width || !r.height) return { x: 0, y: 0 }
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    }
  }

  const startGesture = (e, zi, i, mode, dir) => {
    if (!isAdmin) return
    e.preventDefault()
    e.stopPropagation()
    const rect = boxOf(zi, i)
    const pt = pctFromEvent(e)
    setSelectedId(zi.itemId)
    setGesture({
      itemId: zi.itemId,
      mode,
      dir,
      rect,
      orig: rect,
      grab: { x: pt.x - rect.x, y: pt.y - rect.y },
      start: pt,
    })
  }

  useEffect(() => {
    if (!gesture) return undefined
    const onMove = (e) => {
      const pt = pctFromEvent(e)
      setGesture((g) => {
        if (!g) return g
        const { mode, dir, orig, grab, start } = g
        const next = { ...orig }
        if (mode === 'move') {
          next.x = clampPct(pt.x - grab.x, FREE_ITEM_POS_MIN, FREE_ITEM_POS_MAX)
          next.y = clampPct(pt.y - grab.y, FREE_ITEM_POS_MIN, FREE_ITEM_POS_MAX)
        } else {
          const dx = pt.x - start.x
          const dy = pt.y - start.y
          if (dir.includes('e')) next.w = clampPct(orig.w + dx, FREE_ITEM_MIN, FREE_ITEM_MAX)
          if (dir.includes('s')) next.h = clampPct(orig.h + dy, FREE_ITEM_MIN, FREE_ITEM_MAX)
          if (dir.includes('w')) {
            next.w = clampPct(orig.w - dx, FREE_ITEM_MIN, FREE_ITEM_MAX)
            next.x = clampPct(orig.x + (orig.w - next.w), FREE_ITEM_POS_MIN, FREE_ITEM_POS_MAX)
          }
          if (dir.includes('n')) {
            next.h = clampPct(orig.h - dy, FREE_ITEM_MIN, FREE_ITEM_MAX)
            next.y = clampPct(orig.y + (orig.h - next.h), FREE_ITEM_POS_MIN, FREE_ITEM_POS_MAX)
          }
        }
        return { ...g, rect: next }
      })
    }
    // Une seule écriture, au relâchement : pendant le geste on ne touche ni au
    // serveur ni au layout du parent.
    const stop = () => {
      setGesture((g) => {
        if (g && onCommit) {
          onCommit(
            items.map((zi, i) => {
              const box = zi.itemId === g.itemId ? g.rect : freeItemBox(zi, i)
              return { ...zi, ...box }
            })
          )
        }
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesture, items])

  if (items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
        Glissez un produit ici
      </div>
    )
  }

  return (
    <div ref={layerRef} className="relative h-full w-full">
      {items.map((zi, i) => {
        const box = boxOf(zi, i)
        const active = selectedId === zi.itemId
        return (
          <div
            key={zi.itemId}
            onPointerDown={(e) => startGesture(e, zi, i, 'move')}
            className={`group absolute rounded-sm ${isAdmin ? 'cursor-move' : ''} ${
              active ? 'outline outline-1 outline-brand-500' : 'outline outline-1 outline-white/15'
            }`}
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.w}%`,
              height: `${box.h}%`,
            }}
          >
            <CardTemplatePreview
              template={zone.cardTemplate}
              name={zi.item?.name || ''}
              accent={accent}
              text={text}
              showPrice={showPrice}
              price={zi.item?.price ?? null}
              layout={cardLayoutFor(zone, zi.itemId)}
            />

            {isAdmin && onEditCard && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onEditCard(zi)
                }}
                title={
                  hasOwnCardLayout(zone, zi.itemId)
                    ? 'Ce produit a son propre dessin'
                    : 'Personnaliser la carte de ce produit'
                }
                className={`absolute -left-1 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-brand-500 text-white shadow transition-opacity hover:bg-brand-600 ${
                  hasOwnCardLayout(zone, zi.itemId) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <PencilIcon className="size-2" />
              </button>
            )}

            {isAdmin && onRemove && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(zi.itemId)
                }}
                title="Retirer le produit"
                className="absolute -right-1 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold leading-none text-white opacity-0 shadow transition-opacity hover:bg-error-600 group-hover:opacity-100"
              >
                ×
              </button>
            )}

            {isAdmin &&
              active &&
              HANDLES.map((h) => (
                <span
                  key={h.dir}
                  onPointerDown={(e) => startGesture(e, zi, i, 'resize', h.dir)}
                  className={`absolute z-10 size-2 rounded-full border border-white bg-brand-500 ${h.cls}`}
                />
              ))}
          </div>
        )
      })}
    </div>
  )
}
