import { useEffect, useMemo, useRef, useState } from 'react'
import { CloseIcon, TrashBinIcon } from '../../../icons'
import { STYLE_DEFAULTS, FONT_OPTIONS, BADGE_TYPES, BADGE_TYPE_LABELS } from './constants'
import {
  SLOT_LABELS,
  SINGLETON_SLOTS,
  TEXT_SLOTS,
  cardCellSize,
  defaultCardLayout,
  newSlot,
  clampPct,
} from './cardLayout'

// T10 — éditeur de carte « personnalisée ».
//
// Ouvre un calque plein écran (le tableau derrière est flouté) contenant une
// maquette de UNE carte, au format exact de la cellule de la zone. Chaque
// morceau de la carte (photo, nom, description, prix, ...) est une boîte qu'on
// déplace et redimensionne à la souris, avec un panneau de style à droite.
//
// L'éditeur ne connaît pas l'API : il rend un objet cardLayout via onSave, et
// c'est l'appelant qui décide où l'écrire (zone entière ou un seul produit).

const HANDLES = [
  { dir: 'nw', cls: '-left-1 -top-1 cursor-nwse-resize' },
  { dir: 'ne', cls: '-right-1 -top-1 cursor-nesw-resize' },
  { dir: 'sw', cls: '-bottom-1 -left-1 cursor-nesw-resize' },
  { dir: 'se', cls: '-bottom-1 -right-1 cursor-nwse-resize' },
]

const ADD_BUTTONS = ['image', 'name', 'desc', 'price', 'qty', 'zoneBadge', 'text', 'shape', 'asset']

const SAMPLE = { name: 'Nom du produit', description: 'Description du produit', price: 12.9 }

// Rendu d'un slot dans la maquette. `px` convertit une taille de police du
// repère de dessin (refW) vers les pixels réels de la maquette à l'écran.
function SlotPreview({ slot, data, accent, textColor, px }) {
  const fontSize = Math.max(6, px(slot.fontSize || 16))
  const common = {
    fontFamily: slot.fontFamily || undefined,
    color: slot.color || textColor,
    fontSize,
    textTransform: slot.uppercase ? 'uppercase' : undefined,
    fontWeight: slot.bold ? 700 : 400,
    fontStyle: slot.italic ? 'italic' : undefined,
    lineHeight: 1.15,
    textAlign: slot.align || 'left',
    width: '100%',
  }

  if (slot.type === 'asset') {
    return slot.imageUrl ? (
      <img src={slot.imageUrl} alt="" className="h-full w-full" style={{ objectFit: slot.fit || 'contain' }} />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-current/40 px-1 text-center text-[10px] opacity-60">
        Choisir une image
      </div>
    )
  }
  if (slot.type === 'image') {
    return data.imageUrl ? (
      <img
        src={data.imageUrl}
        alt=""
        className="h-full w-full"
        style={{ objectFit: slot.fit || 'contain' }}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-current/40 text-[10px] opacity-60">
        Photo
      </div>
    )
  }
  if (slot.type === 'shape') {
    return (
      <div
        className="h-full w-full"
        style={{
          background: slot.bg || accent,
          borderRadius: slot.shape === 'line' ? 9999 : `${slot.radius ?? 0}px`,
          opacity: slot.opacity ?? 1,
        }}
      />
    )
  }
  if (slot.type === 'price') {
    // Les couleurs du badge prix viennent du style de la zone (sombre/clair,
    // type 1/2) — l'éditeur ne montre donc que sa taille et sa position.
    return (
      <span
        className="inline-block whitespace-nowrap rounded font-bold"
        style={{
          background: '#0D0D0D',
          color: '#FFFFFF',
          padding: '0.15em 0.4em',
          fontSize: Math.max(7, px(slot.fontSize || 26)),
        }}
      >
        {Number(data.price ?? 0).toFixed(2)}
      </span>
    )
  }
  if (slot.type === 'qty') {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full font-bold text-white"
        style={{
          background: slot.color || accent,
          fontSize: Math.max(7, px(slot.fontSize || 18)),
          width: '2em',
          height: '2em',
        }}
      >
        {data.qty != null ? `${data.qty}X` : '2X'}
      </span>
    )
  }
  if (slot.type === 'zoneBadge') {
    return (
      <span
        className="inline-block whitespace-nowrap rounded font-bold uppercase"
        style={{
          background: slot.color || accent,
          color: '#FFFFFF',
          padding: '0.15em 0.4em',
          fontSize: Math.max(7, px(slot.fontSize || 16)),
        }}
      >
        {slot.text || data.badgeText || 'PROMO'}
      </span>
    )
  }

  const value =
    slot.type === 'name' ? data.name : slot.type === 'desc' ? data.description : slot.text || 'Texte'
  return <span style={common}>{value}</span>
}

export default function CardDesigner({
  open,
  zone,
  item,
  layout,
  fonts = [],
  images = [],
  onUploadImage,
  onSave,
  onClose,
  onClearOverride,
  onCopyTo,
  onApplyToZone,
  zones = [],
  saving = false,
  error = '',
}) {
  const [slots, setSlots] = useState([])
  const [ref, setRef] = useState({ refW: 400, refH: 300 })
  // Rogner ce qui dépasse du cadre de la carte. Décoché = ce qui déborde
  // continue de s'afficher par-dessus les cartes voisines (comportement
  // d'origine), coché = la carte se comporte comme une fenêtre.
  const [clip, setClip] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [gesture, setGesture] = useState(null)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [uploading, setUploading] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [copyTarget, setCopyTarget] = useState('')
  const [notice, setNotice] = useState('')
  const canvasRef = useRef(null)
  const viewportRef = useRef(null)
  const fileRef = useRef(null)

  const cell = useMemo(() => cardCellSize(zone), [zone])

  // (Ré)initialise l'éditeur à chaque ouverture, jamais pendant l'édition.
  useEffect(() => {
    if (!open) return
    const base = layout && Array.isArray(layout.slots) ? layout : defaultCardLayout(zone)
    setSlots(
      base.slots.map((s) => {
        const copy = { ...s }
        // Un badge sans libellé ne rendait rien sur la TV alors que la maquette
        // affichait "PROMO" en exemple. On matérialise le libellé dès
        // l'ouverture : ce qu'on voit ici est exactement ce qui sera enregistré.
        if (copy.type === 'zoneBadge' && !copy.text) {
          copy.text = zone?.badgeConfig?.text || 'PROMO'
        }
        return copy
      })
    )
    setRef({ refW: base.refW || cell.w || 400, refH: base.refH || cell.h || 300 })
    setClip(base.clip === true)
    setSelectedId(base.slots[0]?.id || null)
    setCopyTarget('')
    setNotice('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Place dispo pour la maquette. La maquette est ensuite dimensionnée en px
  // pour tenir ENTIÈREMENT dedans au format de la cellule : une cellule
  // portrait doit se voir en entier, pas déborder en hauteur.
  useEffect(() => {
    if (!open) return
    const el = viewportRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setViewport({ w: r.width, h: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const pctFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  useEffect(() => {
    if (!gesture) return
    const onMove = (e) => {
      const pt = pctFromEvent(e)
      const { id, mode, dir, grab, start, orig } = gesture
      const next = { ...orig }
      if (mode === 'move') {
        next.x = clampPct(pt.x - grab.x, -50, 150 - orig.w)
        next.y = clampPct(pt.y - grab.y, -50, 150 - orig.h)
      } else {
        const dx = pt.x - start.x
        const dy = pt.y - start.y
        if (dir.includes('e')) next.w = clampPct(orig.w + dx, 2, 200)
        if (dir.includes('s')) next.h = clampPct(orig.h + dy, 2, 200)
        if (dir.includes('w')) {
          next.w = clampPct(orig.w - dx, 2, 200)
          next.x = clampPct(orig.x + (orig.w - next.w), -50, 150)
        }
        if (dir.includes('n')) {
          next.h = clampPct(orig.h - dy, 2, 200)
          next.y = clampPct(orig.y + (orig.h - next.h), -50, 150)
        }
      }
      setSlots((list) => list.map((s) => (s.id === id ? { ...s, ...next } : s)))
    }
    const stop = () => setGesture(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [gesture])

  if (!open) return null

  const selected = slots.find((s) => s.id === selectedId) || null
  const zStyle = zone?.backgroundStyle || {}
  const accent = zStyle.accent || STYLE_DEFAULTS.accent
  const dark = zStyle.dark !== false
  const bg = zStyle.bg || (dark ? STYLE_DEFAULTS.bgDark : STYLE_DEFAULTS.bgLight)
  const textColor = zStyle.text || (dark ? STYLE_DEFAULTS.textDark : STYLE_DEFAULTS.textLight)

  // Contenu montré dans la maquette. Pour le dessin d'un produit précis c'est
  // ce produit ; pour le dessin de la zone on prend son PREMIER produit —
  // sinon la photo n'était qu'un cadre vide et on plaçait à l'aveugle.
  const sample = item || zone?.items?.[0] || null
  const data = {
    name: sample?.item?.name || SAMPLE.name,
    description: sample?.item?.description || SAMPLE.description,
    price: sample?.item?.price ?? SAMPLE.price,
    imageUrl:
      (Array.isArray(sample?.item?.images) && sample.item.images[0]) ||
      sample?.item?.imageUrl ||
      null,
    qty: sample?.qty,
    badgeText: zone?.badgeConfig?.text,
  }

  // Format de la cellule ramené dans la place dispo (contain).
  const ratio = (cell.w || 1) / (cell.h || 1)
  let canvasW = Math.max(0, viewport.w)
  let canvasH = canvasW / ratio
  if (viewport.h && canvasH > viewport.h) {
    canvasH = viewport.h
    canvasW = canvasH * ratio
  }

  // px du repère de dessin -> px de la maquette affichée
  const px = (v) => (canvasW ? (v * canvasW) / (ref.refW || canvasW) : v)

  const currentLayout = () => ({ refW: ref.refW, refH: ref.refH, clip, slots })

  const patchSlot = (id, patch) =>
    setSlots((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const addSlot = (type) => {
    if (SINGLETON_SLOTS.includes(type) && slots.some((s) => s.type === type)) {
      setSelectedId(type)
      return
    }
    const slot = newSlot(type, slots.length)
    setSlots((list) => [...list, slot])
    setSelectedId(slot.id)
  }

  const pickFile = () => fileRef.current?.click()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedId || !onUploadImage) return
    setUploading(true)
    try {
      const url = await onUploadImage(file)
      if (url) patchSlot(selectedId, { imageUrl: url })
    } finally {
      setUploading(false)
    }
  }

  const removeSlot = (id) => {
    setSlots((list) => list.filter((s) => s.id !== id))
    setSelectedId(null)
  }

  const startMove = (e, slot) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(slot.id)
    const pt = pctFromEvent(e)
    setGesture({
      id: slot.id,
      mode: 'move',
      grab: { x: pt.x - slot.x, y: pt.y - slot.y },
      orig: { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
    })
  }

  const startResize = (e, slot, dir) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(slot.id)
    setGesture({
      id: slot.id,
      mode: 'resize',
      dir,
      start: pctFromEvent(e),
      orig: { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
    })
  }

  const numberField = (label, key, opts = {}) =>
    selected ? (
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <input
          type="number"
          step={opts.step ?? 1}
          min={opts.min}
          max={opts.max}
          value={selected[key] ?? opts.fallback ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            patchSlot(selected.id, { [key]: raw === '' ? undefined : Number(raw) })
          }}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90"
        />
      </label>
    ) : null

  const toggle = (label, key, defaultOn = false) =>
    selected ? (
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={selected[key] ?? defaultOn}
          onChange={(e) => patchSlot(selected.id, { [key]: e.target.checked })}
          className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        {label}
      </label>
    ) : null

  const isText = selected && TEXT_SLOTS.includes(selected.type)

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      {/* Le tableau derrière reste visible mais flouté, pour garder le contexte */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-md" onClick={onClose} />

      <div
        className="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-none items-start justify-between gap-4 border-b border-gray-100 p-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Carte personnalisée
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {item
                ? `Produit « ${item.item?.name || item.itemId} » — ce dessin ne s’applique qu’à ce produit.`
                : `Zone « ${zone?.name || `#${zone?.id}`} » — ce dessin s’applique à tous les produits de la zone${
                    sample?.item?.name ? ` (aperçu avec « ${sample.item.name} »)` : ''
                  }.`}
              {' · '}
              Cellule réelle {cell.w}×{cell.h}px
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:h-[70vh] lg:flex-row">
          {/* Maquette */}
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {ADD_BUTTONS.map((type) => {
                const existing = SINGLETON_SLOTS.includes(type)
                  ? slots.find((s) => s.type === type)
                  : null
                const used = !!existing
                // Un élément présent mais décoché ("Afficher") se signale ici :
                // sinon on le cherche sur la maquette où il n'est qu'en pâle.
                const hidden = used && existing.visible === false
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addSlot(type)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      hidden
                        ? 'border-warning-300 text-warning-600 hover:bg-warning-50 dark:border-warning-500/40 dark:text-warning-400'
                        : used
                          ? 'border-gray-200 text-gray-400 dark:border-gray-800'
                          : 'border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-400 dark:hover:bg-brand-500/10'
                    }`}
                    title={
                      hidden
                        ? 'Présent mais masqué — cliquer pour le sélectionner, puis cocher « Afficher »'
                        : used
                          ? 'Déjà présent — cliquer pour le sélectionner'
                          : 'Ajouter'
                    }
                  >
                    {hidden ? '⃠ ' : used ? '✓ ' : '+ '}
                    {SLOT_LABELS[type]}
                    {hidden ? ' (masqué)' : ''}
                  </button>
                )
              })}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={clip}
                onChange={(e) => setClip(e.target.checked)}
                className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Rogner ce qui dépasse de la carte
              <span className="text-gray-400 dark:text-gray-500">
                — ce qui sort du cadre n’est plus affiché
              </span>
            </label>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-gray-100 p-4 dark:bg-gray-950">
              <div ref={viewportRef} className="flex h-full w-full items-center justify-center">
              <div
                ref={canvasRef}
                onPointerDown={() => setSelectedId(null)}
                className={`relative select-none rounded-md shadow-inner ${clip ? 'overflow-hidden' : ''}`}
                style={{
                  width: canvasW || undefined,
                  height: canvasH || undefined,
                  background: bg,
                  color: textColor,
                }}
              >
                {slots.map((slot) => {
                  const active = slot.id === selectedId
                  const hidden = slot.visible === false
                  const justify =
                    slot.align === 'right' ? 'flex-end' : slot.align === 'center' ? 'center' : 'flex-start'
                  const alignItems =
                    slot.valign === 'end' ? 'flex-end' : slot.valign === 'center' ? 'center' : 'flex-start'
                  return (
                    <div
                      key={slot.id}
                      onPointerDown={(e) => startMove(e, slot)}
                      className={`absolute flex touch-none ${active ? 'cursor-move outline-2 outline-brand-500' : 'cursor-move outline-1 outline-dashed outline-gray-400/40'} ${hidden ? 'opacity-30' : ''}`}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: `${slot.w}%`,
                        height: `${slot.h}%`,
                        // Pas de bonus de z pour la sélection : sinon l'élément
                        // sélectionné passe devant tous les autres et avale les
                        // clics destinés à ses voisins (on ne pouvait plus
                        // attraper le prix posé sur la photo).
                        zIndex: slot.zIndex ?? 1,
                        transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
                        justifyContent: justify,
                        alignItems,
                        outlineStyle: active ? 'solid' : 'dashed',
                      }}
                    >
                      <SlotPreview slot={slot} data={data} accent={accent} textColor={textColor} px={px} />
                      {active &&
                        HANDLES.map(({ dir, cls }) => (
                          <span
                            key={dir}
                            onPointerDown={(e) => startResize(e, slot, dir)}
                            className={`absolute z-10 size-2.5 touch-none rounded-sm border border-white bg-brand-500 ${cls}`}
                          />
                        ))}
                    </div>
                  )
                })}
              </div>
              </div>
            </div>
          </div>

          {/* Panneau de style */}
          <div className="w-full flex-none space-y-4 overflow-y-auto lg:w-72">
            {!selected ? (
              <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                Cliquez sur un élément de la carte pour le déplacer, le redimensionner et changer son
                style. Les boutons au-dessus de la maquette ajoutent un élément.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {SLOT_LABELS[selected.type] || selected.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSlot(selected.id)}
                    title="Retirer de la carte"
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/15"
                  >
                    <TrashBinIcon className="size-4" />
                  </button>
                </div>

                {toggle('Afficher', 'visible', true)}

                <div className="grid grid-cols-2 gap-2">
                  {numberField('X (%)', 'x', { step: 0.5 })}
                  {numberField('Y (%)', 'y', { step: 0.5 })}
                  {numberField('Largeur (%)', 'w', { step: 0.5 })}
                  {numberField('Hauteur (%)', 'h', { step: 0.5 })}
                </div>

                {selected.type === 'image' ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Cadrage
                    </span>
                    <select
                      value={selected.fit || 'contain'}
                      onChange={(e) => patchSlot(selected.id, { fit: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    >
                      <option value="contain">Entière (contain)</option>
                      <option value="cover">Remplir (cover)</option>
                    </select>
                  </label>
                ) : null}

                {selected.type === 'asset' ? (
                  <div className="space-y-2">
                    <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      {selected.imageUrl ? (
                        <img src={selected.imageUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400">Aucune image</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={pickFile}
                        disabled={uploading || !onUploadImage}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
                      >
                        {uploading ? 'Envoi…' : 'Appareil'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLibrary((v) => !v)}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                      >
                        Bibliothèque
                      </button>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFile}
                    />
                    {showLibrary ? (
                      images.length === 0 ? (
                        <p className="text-xs text-gray-400">Aucune image dans la bibliothèque.</p>
                      ) : (
                        <div className="grid max-h-40 grid-cols-4 gap-1 overflow-y-auto rounded-lg border border-gray-200 p-1 dark:border-gray-700">
                          {images.map((img) => (
                            <button
                              key={img.id ?? img.url}
                              type="button"
                              title={img.name}
                              onClick={() => {
                                patchSlot(selected.id, { imageUrl: img.url })
                                setShowLibrary(false)
                              }}
                              className="aspect-square overflow-hidden rounded border border-gray-200 hover:border-brand-400 dark:border-gray-700"
                            >
                              <img src={img.url} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )
                    ) : null}
                    {selected.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => patchSlot(selected.id, { imageUrl: undefined })}
                        className="text-xs font-medium text-gray-400 hover:text-error-500"
                      >
                        Retirer l’image
                      </button>
                    ) : null}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Cadrage
                      </span>
                      <select
                        value={selected.fit || 'contain'}
                        onChange={(e) => patchSlot(selected.id, { fit: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                      >
                        <option value="contain">Entière (contain)</option>
                        <option value="cover">Remplir (cover)</option>
                      </select>
                    </label>
                  </div>
                ) : null}

                {selected.type === 'text' || selected.type === 'zoneBadge' ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {selected.type === 'zoneBadge' ? 'Texte du badge' : 'Texte'}
                    </span>
                    <input
                      type="text"
                      value={selected.text || ''}
                      onChange={(e) => patchSlot(selected.id, { text: e.target.value })}
                      placeholder={selected.type === 'zoneBadge' ? 'Ex : PROMO, NOUVEAU…' : ''}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    />
                  </label>
                ) : null}

                {selected.type === 'shape' ? (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Forme
                      </span>
                      <select
                        value={selected.shape || 'rect'}
                        onChange={(e) => patchSlot(selected.id, { shape: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                      >
                        <option value="rect">Rectangle</option>
                        <option value="line">Trait</option>
                      </select>
                    </label>
                    {numberField('Arrondi (px)', 'radius', { min: 0, max: 100 })}
                  </div>
                ) : null}

                {selected.type !== 'image' && selected.type !== 'shape' && selected.type !== 'asset' ? (
                  <>
                    {numberField(`Taille police (px sur ${ref.refW}px)`, 'fontSize', { min: 4, max: 200 })}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Police
                      </span>
                      <select
                        value={selected.fontFamily || ''}
                        onChange={(e) =>
                          patchSlot(selected.id, { fontFamily: e.target.value || undefined })
                        }
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                        {fonts.length > 0 && (
                          <optgroup label="Bibliothèque">
                            {fonts.map((f) => (
                              <option key={f.id ?? f.name} value={f.name}>
                                {f.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </label>
                  </>
                ) : null}

                {selected.type !== 'image' && selected.type !== 'price' && selected.type !== 'asset' ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Couleur
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selected.color || (selected.type === 'shape' ? accent : textColor)}
                        onChange={(e) => patchSlot(selected.id, { color: e.target.value })}
                        className="h-9 w-12 cursor-pointer rounded-md border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => patchSlot(selected.id, { color: undefined })}
                        className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
                      >
                        Défaut
                      </button>
                    </div>
                  </label>
                ) : null}

                {selected.type === 'shape' ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Couleur de fond
                    </span>
                    <input
                      type="color"
                      value={selected.bg || accent}
                      onChange={(e) => patchSlot(selected.id, { bg: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-md border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                    />
                  </label>
                ) : null}

                {selected.type === 'price' ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Type de badge
                    </span>
                    <select
                      value={selected.badgeType || ''}
                      onChange={(e) => patchSlot(selected.id, { badgeType: e.target.value || undefined })}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    >
                      <option value="">Celui de la zone</option>
                      {BADGE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {BADGE_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Alignement
                    </span>
                    <select
                      value={selected.align || 'left'}
                      onChange={(e) => patchSlot(selected.id, { align: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    >
                      <option value="left">Gauche</option>
                      <option value="center">Centre</option>
                      <option value="right">Droite</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Vertical
                    </span>
                    <select
                      value={selected.valign || 'start'}
                      onChange={(e) => patchSlot(selected.id, { valign: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                    >
                      <option value="start">Haut</option>
                      <option value="center">Milieu</option>
                      <option value="end">Bas</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {numberField('Rotation (°)', 'rotation', { min: -180, max: 180 })}
                  {numberField('Ordre (z)', 'zIndex', { min: 0, max: 99 })}
                </div>

                {isText ? (
                  <div className="space-y-2">
                    {toggle('MAJUSCULES', 'uppercase')}
                    {toggle('Gras', 'bold')}
                    {toggle('Italique', 'italic')}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Efface tout le dessin : on demande, cette action a déjà
                // coûté un dessin entier.
                if (!window.confirm('Effacer ce dessin et repartir de la disposition par défaut ?')) return
                const base = defaultCardLayout(zone)
                setSlots(base.slots)
                setRef({ refW: base.refW, refH: base.refH })
                setClip(base.clip === true)
                setSelectedId(null)
                setNotice('')
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
            >
              Réinitialiser
            </button>
            {item && onClearOverride ? (
              <button
                type="button"
                onClick={onClearOverride}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-error-300 hover:text-error-600 dark:border-gray-700 dark:text-gray-300"
              >
                Revenir au dessin de la zone
              </button>
            ) : null}
            {item && onApplyToZone ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onApplyToZone(currentLayout())}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
              >
                Appliquer à toute la zone
              </button>
            ) : null}
            {onCopyTo && zones.length > 0 ? (
              <div className="flex items-center gap-1">
                <select
                  value={copyTarget}
                  onChange={(e) => setCopyTarget(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-transparent px-2 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                >
                  <option value="">Copier vers…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name || `Zone #${z.id}`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!copyTarget || saving}
                  onClick={async () => {
                    const target = zones.find((z) => String(z.id) === String(copyTarget))
                    const ok = await onCopyTo(Number(copyTarget), currentLayout())
                    if (ok) {
                      setNotice(`Dessin copié vers « ${target?.name || `#${copyTarget}`} ».`)
                      setCopyTarget('')
                    }
                  }}
                  className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50 dark:border-brand-500/40 dark:text-brand-400"
                >
                  Copier
                </button>
              </div>
            ) : null}
            {notice ? (
              <span className="text-xs font-medium text-success-600 dark:text-success-400">{notice}</span>
            ) : null}
          </div>
          {error ? (
            <p className="order-first w-full rounded-lg bg-error-50 px-3 py-2 text-xs font-medium text-error-600 dark:bg-error-500/15 dark:text-error-400 lg:order-none lg:w-auto lg:flex-1">
              {error} — le dessin n’est pas enregistré, la fenêtre reste ouverte.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave(currentLayout())}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
