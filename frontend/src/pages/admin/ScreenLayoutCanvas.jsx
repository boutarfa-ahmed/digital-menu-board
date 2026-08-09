import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageMeta from '../../components/common/PageMeta'
import Badge from '../../components/ui/badge/Badge'
import Button from '../../components/ui/button/Button'
import Input from '../../components/form/input/InputField'
import Label from '../../components/form/Label'
import { Modal } from '../../components/ui/modal'
import { useAuth } from '../../context/AuthContext'
import { ChevronLeftIcon, PlusIcon, CloseIcon, TrashBinIcon, ListIcon, CheckLineIcon } from '../../icons'
import api from '../../api/axios'

const GRID = 12
const REQUIRES_GRID = ['grid', 'list', 'carousel']
const CONTENT_ZONE_TYPES = ['menu', 'grid', 'list', 'carousel']

const ZONE_TYPE_LABELS = {
  menu: 'Menu',
  grid: 'Grille',
  list: 'Liste',
  carousel: 'Carrousel',
  banner: 'Bannière',
  hero: 'Héro',
  highlight: 'Mise en avant',
}

const ZONE_TYPE_COLORS = {
  menu: 'info',
  grid: 'primary',
  list: 'success',
  carousel: 'light',
  banner: 'info',
  hero: 'primary',
  highlight: 'success',
}

const CARD_TEMPLATES = ['default', 'compact', 'large', 'minimal', 'media']
const CARD_TEMPLATE_LABELS = {
  default: 'Par défaut',
  compact: 'Compact',
  large: 'Grand',
  minimal: 'Minimal',
  media: 'Média',
}

const TYPE_SWATCH = {
  menu: 'bg-blue-light-500',
  grid: 'bg-brand-500',
  list: 'bg-success-500',
  carousel: 'bg-gray-400',
  banner: 'bg-blue-light-500',
  hero: 'bg-brand-500',
  highlight: 'bg-success-500',
}

const PRESETS = [
  {
    key: 'split',
    label: 'Split dual-panel',
    description: 'Deux panneaux côte à côte',
    zones: [
      { name: 'Panneau gauche', zoneType: 'list', gridConfig: { rows: 6, cols: 2 }, x: 0, y: 0, w: 6, h: 12 },
      { name: 'Panneau droit', zoneType: 'list', gridConfig: { rows: 6, cols: 2 }, x: 6, y: 0, w: 6, h: 12 },
    ],
  },
  {
    key: 'stack',
    label: 'Multi-zone stack',
    description: 'Héro en haut, grille en dessous',
    zones: [
      { name: 'Héro', zoneType: 'hero', x: 0, y: 0, w: 12, h: 4 },
      { name: 'Grille produits', zoneType: 'grid', gridConfig: { rows: 2, cols: 4 }, x: 0, y: 4, w: 12, h: 8 },
    ],
  },
  {
    key: 'columns',
    label: '3-column independent',
    description: 'Trois colonnes indépendantes',
    zones: [
      { name: 'Colonne 1', zoneType: 'list', gridConfig: { rows: 6, cols: 2 }, x: 0, y: 0, w: 4, h: 12 },
      { name: 'Colonne 2', zoneType: 'list', gridConfig: { rows: 6, cols: 2 }, x: 4, y: 0, w: 4, h: 12 },
      { name: 'Colonne 3', zoneType: 'list', gridConfig: { rows: 6, cols: 2 }, x: 8, y: 0, w: 4, h: 12 },
    ],
  },
  {
    key: 'grid',
    label: 'Grille uniforme',
    description: 'Une grille pleine écran',
    variants: [
      { label: '2×2', rows: 2, cols: 2 },
      { label: '2×3', rows: 2, cols: 3 },
      { label: '3×4', rows: 3, cols: 4 },
    ],
  },
  {
    key: 'listrow',
    label: 'List-row',
    description: 'Bande de liste horizontale',
    zones: [
      { name: 'Liste', zoneType: 'list', gridConfig: { rows: 2, cols: 3 }, x: 0, y: 0, w: 12, h: 4 },
    ],
  },
]

function PresetThumb({ zones }) {
  return (
    <div
      className="relative h-14 w-24 flex-none overflow-hidden rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
      style={{ aspectRatio: '16 / 9' }}
    >
      {zones.map((z, i) => (
        <div
          key={i}
          className={`absolute ${TYPE_SWATCH[z.zoneType] || 'bg-gray-400'}`}
          style={{
            left: `${(z.x / 12) * 100}%`,
            top: `${(z.y / 12) * 100}%`,
            width: `${(z.w / 12) * 100}%`,
            height: `${(z.h / 12) * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

const RESIZE_HANDLES = [
  { dir: 'nw', cls: '-left-0.5 -top-0.5 cursor-nwse-resize' },
  { dir: 'ne', cls: '-right-0.5 -top-0.5 cursor-nesw-resize' },
  { dir: 'sw', cls: '-bottom-0.5 -left-0.5 cursor-nesw-resize' },
  { dir: 'se', cls: '-bottom-0.5 -right-0.5 cursor-nwse-resize' },
]

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

function findFreePosition(zones, w, h) {
  for (let y = 0; y <= GRID - h; y += 1) {
    for (let x = 0; x <= GRID - w; x += 1) {
      const rect = { x, y, w, h }
      if (!zones.some((z) => overlaps(rect, z))) return { x, y }
    }
  }
  return null
}

function validateLayoutForPublish(layout) {
  if (!layout) return []
  const zones = layout.zones || []
  if (zones.length === 0) return ['Ajoutez au moins une zone avant de publier.']
  const errors = []
  for (const z of zones) {
    const label = z.name || `Zone #${z.id}`
    const items = z.items || []
    if (CONTENT_ZONE_TYPES.includes(z.zoneType) && items.length === 0) {
      errors.push(`La zone « ${label} » est vide : ajoutez au moins un produit.`)
    }
    if (REQUIRES_GRID.includes(z.zoneType)) {
      const rows = z.gridConfig?.rows
      const cols = z.gridConfig?.cols
      if (!rows || !cols || rows < 1 || cols < 1) {
        errors.push(`La zone « ${label} » a une grille incohérente (lignes/colonnes invalides).`)
        continue
      }
      const capacity = rows * cols
      if (z.zoneType === 'grid') {
        const seen = new Set()
        for (const it of items) {
          const r = it.row
          const c = it.col
          if (typeof r !== 'number' || typeof c !== 'number' || r < 0 || r >= rows || c < 0 || c >= cols) {
            errors.push(`La zone « ${label} » contient un produit hors grille (position ${r},${c}) pour ${rows}×${cols}.`)
          } else {
            const key = `${r}:${c}`
            if (seen.has(key)) errors.push(`La zone « ${label} » place deux produits sur la même cellule (${r},${c}).`)
            seen.add(key)
          }
        }
      }
      if (items.length > capacity) {
        errors.push(`La zone « ${label} » dépasse sa capacité (${items.length} produits pour ${rows}×${cols}).`)
      }
    }
  }
  return errors
}

function ScreenLayoutCanvas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [screen, setScreen] = useState(null)
  const [layout, setLayout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingZone, setSavingZone] = useState(false)
  const [applying, setApplying] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [undoZone, setUndoZone] = useState(null)
  const [undoing, setUndoing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    zoneType: 'grid',
    name: '',
    cardTemplate: 'default',
    w: 2,
    h: 2,
    rows: 2,
    cols: 2,
  })

  const [gesture, setGesture] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [productsOpen, setProductsOpen] = useState(false)
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dropZoneId, setDropZoneId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const canvasRef = useRef(null)
  const zonesRef = useRef([])
  zonesRef.current = layout?.zones || []

  const load = () => {
    setLoading(true)
    setError('')
    setNotice('')
    setDirty(false)
    setUndoZone(null)
    Promise.all([
      api.get(`/screens/${id}`).then((r) => r.data),
      api.get(`/screens/${id}/layout`).then((r) => r.data),
      api.get('/categories').then((r) => r.data),
      api.get('/menu').then((r) => r.data),
    ])
      .then(([scr, lay, cats, menu]) => {
        setScreen(scr)
        setLayout(lay)
        setCategories(Array.isArray(cats) ? cats : [])
        setItems(Array.isArray(menu) ? menu : [])
      })
      .catch((err) => setError(err.response?.data?.error || 'Impossible de charger le layout'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const cellFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const cw = rect.width / GRID
    const ch = rect.height / GRID
    return {
      x: clamp(Math.round((e.clientX - rect.left) / cw), 0, GRID - 1),
      y: clamp(Math.round((e.clientY - rect.top) / ch), 0, GRID - 1),
    }
  }

  const startMove = (e, zone) => {
    if (e.button !== 0) return
    e.preventDefault()
    const cell = cellFromEvent(e)
    setGesture({
      zoneId: zone.id,
      mode: 'move',
      grab: { x: cell.x - zone.x, y: cell.y - zone.y },
      start: cell,
      orig: { x: zone.x, y: zone.y, w: zone.w, h: zone.h },
      rect: { x: zone.x, y: zone.y, w: zone.w, h: zone.h },
    })
  }

  const startResize = (e, zone, dir) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setGesture({
      zoneId: zone.id,
      mode: 'resize',
      dir,
      start: cellFromEvent(e),
      orig: { x: zone.x, y: zone.y, w: zone.w, h: zone.h },
      rect: { x: zone.x, y: zone.y, w: zone.w, h: zone.h },
    })
  }

  useEffect(() => {
    if (!gesture) return

    const onMove = (e) => {
      const cell = cellFromEvent(e)
      const { mode, dir, grab, start, orig } = gesture
      let rect = { ...orig }

      if (mode === 'move') {
        rect.x = clamp(cell.x - grab.x, 0, GRID - orig.w)
        rect.y = clamp(cell.y - grab.y, 0, GRID - orig.h)
      } else {
        const dx = cell.x - start.x
        const dy = cell.y - start.y
        if (dir.includes('e')) rect.w = orig.w + dx
        if (dir.includes('s')) rect.h = orig.h + dy
        if (dir.includes('w')) {
          rect.x = orig.x + dx
          rect.w = orig.w - dx
        }
        if (dir.includes('n')) {
          rect.y = orig.y + dy
          rect.h = orig.h - dy
        }
        rect.w = Math.max(1, rect.w)
        rect.h = Math.max(1, rect.h)
        rect.x = clamp(rect.x, 0, GRID - rect.w)
        rect.y = clamp(rect.y, 0, GRID - rect.h)
      }

      setGesture((g) => ({ ...g, rect }))
    }

    const onUp = () => {
      const g = gesture
      setGesture(null)
      if (!g) return
      const zone = zonesRef.current.find((z) => z.id === g.zoneId)
      if (!zone) return
      const changed =
        g.rect.x !== zone.x || g.rect.y !== zone.y || g.rect.w !== zone.w || g.rect.h !== zone.h
      if (!changed) {
        setSelectedId(g.zoneId)
        return
      }

      const clash = zonesRef.current.some(
        (z) => z.id !== g.zoneId && overlaps(g.rect, z)
      )
      if (clash) {
        setError('Position non valide : la zone chevauche une autre zone.')
        return
      }
      setError('')
      commitZone(g.zoneId, { x: g.rect.x, y: g.rect.y, w: g.rect.w, h: g.rect.h })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesture])

  const commitZone = async (zoneId, rect) => {
    try {
      await api.put(`/zones/${zoneId}`, rect)
      await load()
      setDirty(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour la zone')
      await load()
    }
  }

  const patchZone = async (zoneId, patch) => {
    setError('')
    setLayout((l) =>
      l
        ? { ...l, zones: l.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)) }
        : l
    )
    try {
      await api.put(`/zones/${zoneId}`, patch)
      setDirty(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour la zone')
      await load()
    }
  }

  const deleteZone = async (zoneId) => {
    const zone = layout?.zones?.find((z) => z.id === zoneId)
    if (!zone) return
    if (!window.confirm(`Supprimer la zone « ${zone.name || `#${zone.id}`} » ?`)) return
    try {
      await api.delete(`/zones/${zoneId}`)
      setSelectedId(null)
      setUndoZone(zone)
      await load()
      setNotice(`Zone « ${zone.name || `#${zone.id}`} » supprimée.`)
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer la zone')
    }
  }

  const undoDeleteZone = async () => {
    if (!undoZone || !layout) return
    setUndoing(true)
    setError('')
    try {
      const z = undoZone
      const restored = {
        name: z.name,
        zoneType: z.zoneType,
        cardTemplate: z.cardTemplate,
        gridConfig: z.gridConfig,
        backgroundStyle: z.backgroundStyle,
        x: z.x,
        y: z.y,
        w: z.w,
        h: z.h,
        order: z.order,
        items: (z.items || []).map((it) => ({
          itemId: it.itemId,
          row: it.row,
          col: it.col,
          index: it.index,
          order: it.order,
        })),
      }
      const zones = [
        ...layout.zones.map((s) => ({
          id: s.id,
          name: s.name,
          zoneType: s.zoneType,
          cardTemplate: s.cardTemplate,
          gridConfig: s.gridConfig,
          backgroundStyle: s.backgroundStyle,
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          order: s.order,
          items: (s.items || []).map((it) => ({
            itemId: it.itemId,
            row: it.row,
            col: it.col,
            index: it.index,
            order: it.order,
          })),
        })),
        restored,
      ]
      await api.put(`/screens/${id}/layout`, { zones })
      setUndoZone(null)
      await load()
      setDirty(true)
      setNotice('Zone restaurée.')
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de restaurer la zone')
    } finally {
      setUndoing(false)
    }
  }

  const assignItem = async (zone, itemId, targetRow, targetCol, targetIndex) => {
    if (!isAdmin) return
    const existing = zone.items || []
    if (existing.some((it) => it.itemId === itemId)) {
      setError('Ce produit est déjà dans cette zone.')
      return
    }
    const items = existing.map((it) => ({
      itemId: it.itemId,
      row: it.row,
      col: it.col,
      index: it.index,
      order: it.order,
    }))

    if (targetRow !== undefined) {
      items.push({ itemId, row: targetRow, col: targetCol, index: null, order: items.length })
    } else if (targetIndex !== undefined) {
      items.push({ itemId, row: null, col: null, index: targetIndex, order: targetIndex })
    } else if (zone.zoneType === 'grid') {
      const rows = zone.gridConfig?.rows || 1
      const cols = zone.gridConfig?.cols || 1
      let placed = false
      for (let r = 0; r < rows && !placed; r += 1) {
        for (let c = 0; c < cols && !placed; c += 1) {
          if (!items.some((it) => it.row === r && it.col === c)) {
            items.push({ itemId, row: r, col: c, index: null, order: items.length })
            placed = true
          }
        }
      }
      if (!placed) {
        setError('Grille pleine : augmentez les lignes/colonnes de la zone.')
        return
      }
    } else {
      const index = existing.reduce((m, it) => Math.max(m, it.index ?? 0), -1) + 1
      items.push({ itemId, row: null, col: null, index, order: index })
    }

    await putZoneItems(zone, items)
  }

  const putZoneItems = async (zone, items) => {
    try {
      const { data } = await api.put(`/zones/${zone.id}/items`, { items })
      setLayout((l) =>
        l ? { ...l, zones: l.zones.map((z) => (z.id === zone.id ? data : z)) } : l
      )
      setDirty(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de réorganiser la zone')
    }
  }

  const moveGridItem = async (zone, sourceItemId, targetRow, targetCol) => {
    if (!isAdmin) return
    const src = zone.items.find((it) => it.itemId === sourceItemId)
    if (!src) return
    const dst = zone.items.find((it) => it.row === targetRow && it.col === targetCol)
    if (dst && dst.itemId === sourceItemId) return
    const items = zone.items.map((it) => ({
      itemId: it.itemId,
      row: it.row,
      col: it.col,
      index: it.index,
      order: it.order,
    }))
    const si = items.find((it) => it.itemId === sourceItemId)
    if (dst) {
      const di = items.find((it) => it.itemId === dst.itemId)
      const { row: r, col: c } = si
      si.row = di.row
      si.col = di.col
      di.row = r
      di.col = c
    } else {
      si.row = targetRow
      si.col = targetCol
    }
    await putZoneItems(zone, items)
  }

  const moveListItem = async (zone, sourceItemId, targetIndex) => {
    if (!isAdmin) return
    const src = zone.items.find((it) => it.itemId === sourceItemId)
    if (!src) return
    const dst = zone.items.find((it) => it.index === targetIndex)
    if (dst && dst.itemId === sourceItemId) return
    const items = zone.items.map((it) => ({
      itemId: it.itemId,
      row: it.row,
      col: it.col,
      index: it.index,
      order: it.order,
    }))
    const si = items.find((it) => it.itemId === sourceItemId)
    if (dst) {
      const di = items.find((it) => it.itemId === dst.itemId)
      const idx = si.index
      si.index = di.index
      si.order = di.index
      di.index = idx
      di.order = idx
    } else {
      si.index = targetIndex
      si.order = targetIndex
    }
    await putZoneItems(zone, items)
  }

  const createLayout = async () => {
    setCreating(true)
    setError('')
    try {
      await api.post(`/screens/${id}/layout`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le layout')
    } finally {
      setCreating(false)
    }
  }

  const openModal = () => {
    setError('')
    setForm({
      zoneType: 'grid',
      name: '',
      cardTemplate: 'default',
      w: 2,
      h: 2,
      rows: 2,
      cols: 2,
    })
    setModalOpen(true)
  }

  const submitZone = async () => {
    setSavingZone(true)
    setError('')
    const { zoneType, name, cardTemplate, w, h, rows, cols } = form
    const pos = findFreePosition(zonesRef.current, w, h)
    if (!pos) {
      setError('Plus de place libre pour ces dimensions sur l’écran.')
      setSavingZone(false)
      return
    }
    const payload = {
      name: name.trim() || `${ZONE_TYPE_LABELS[zoneType] || zoneType} ${zonesRef.current.length + 1}`,
      zoneType,
      cardTemplate,
      x: pos.x,
      y: pos.y,
      w,
      h,
    }
    if (REQUIRES_GRID.includes(zoneType)) payload.gridConfig = { rows, cols }
    try {
      await api.post(`/layouts/${layout.id}/zones`, payload)
      await load()
      setModalOpen(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la zone')
    } finally {
      setSavingZone(false)
    }
  }

  const applyPreset = async (zones) => {
    if (!window.confirm('Appliquer ce preset va remplacer les zones actuelles de l’écran. Continuer ?')) return
    setApplying(true)
    setError('')
    setNotice('')
    try {
      await api.put(`/screens/${id}/layout`, { zones })
      await load()
      setDirty(true)
      setNotice('Preset appliqué — ajustez les zones puis publiez.')
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’appliquer le preset')
    } finally {
      setApplying(false)
    }
  }

  const saveDraft = async () => {
    if (!layout) return
    setSavingDraft(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        zones: layout.zones.map((z) => ({
          id: z.id,
          name: z.name,
          zoneType: z.zoneType,
          cardTemplate: z.cardTemplate,
          gridConfig: z.gridConfig,
          backgroundStyle: z.backgroundStyle,
          x: z.x,
          y: z.y,
          w: z.w,
          h: z.h,
          order: z.order,
          items: (z.items || []).map((it) => ({
            itemId: it.itemId,
            row: it.row,
            col: it.col,
            index: it.index,
            order: it.order,
          })),
        })),
      }
      await api.put(`/screens/${id}/layout`, payload)
      setDirty(false)
      setNotice('Brouillon enregistré.')
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’enregistrer le brouillon')
    } finally {
      setSavingDraft(false)
    }
  }

  const publishLayout = async () => {
    if (publishIssues.length > 0) {
      setError(`Publication impossible : ${publishIssues.join(' ')}`)
      return
    }
    setPublishing(true)
    setError('')
    setNotice('')
    try {
      await api.post(`/screens/${id}/layout/publish`)
      await load()
      setNotice('Layout publié — les écrans connectés seront notifiés.')
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de publier le layout')
    } finally {
      setPublishing(false)
    }
  }

  const pct = (cells) => `${(cells / GRID) * 100}%`

  const selected = layout?.zones?.find((z) => z.id === selectedId) || null
  const publishIssues = isAdmin ? validateLayoutForPublish(layout) : []

  const filteredItems = items.filter((it) => {
    if (catFilter !== 'all' && it.categoryId !== catFilter) return false
    if (search && !it.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const setGridField = (zone, field, value) => {
    const n = Math.max(1, parseInt(value, 10) || 1)
    const gc = zone.gridConfig || {}
    patchZone(zone.id, { gridConfig: { rows: gc.rows || 1, cols: gc.cols || 1, [field]: n } })
  }

  return (
    <div>
      <PageMeta title="Layout TV | GalaxyFood Admin" description="Éditeur de layout des écrans TV" />

      <button
        type="button"
        onClick={() => navigate('/dashboard/screens')}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
      >
        <ChevronLeftIcon className="size-4" />
        Retour aux écrans
      </button>

      {screen && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Layout — {screen.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {screen.location || 'Emplacement non défini'} · Aperçu 16:9 sur grille de {GRID}×{GRID}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && layout && dirty && (
              <span className="flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
                <span className="size-1.5 rounded-full bg-warning-500" />
                Modifications non enregistrées
              </span>
            )}
            {isAdmin && layout && (
              <Button
                size="sm"
                variant="outline"
                onClick={saveDraft}
                disabled={savingDraft || !dirty}
              >
                <CheckLineIcon className="size-4" />
                {savingDraft ? 'Enregistrement...' : 'Enregistrer le brouillon'}
              </Button>
            )}
            {isAdmin && layout && (
              <Button
                size="sm"
                onClick={publishLayout}
                disabled={publishing || publishIssues.length > 0}
                title={
                  publishIssues.length > 0
                    ? publishIssues[0]
                    : 'Publier le layout sur les écrans'
                }
              >
                {publishing ? 'Publication...' : 'Publier'}
              </Button>
            )}
            {isAdmin && layout && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProductsOpen((o) => !o)}
              >
                <ListIcon className="size-4" />
                Produits
              </Button>
            )}
            {layout && (
              <Badge color={layout.status === 'published' ? 'success' : 'light'}>
                {layout.status === 'published' ? 'Publié' : 'Brouillon'}
              </Badge>
            )}
            {isAdmin && layout && (
              <Button size="sm" onClick={openModal}>
                <PlusIcon className="size-4" />
                Ajouter une zone
              </Button>
            )}
          </div>
        </div>
      )}

      {isAdmin && layout && publishIssues.length > 0 && (
        <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-400">
          <p className="mb-1 font-medium">Publication bloquée</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {publishIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-success-50 px-4 py-3 text-sm text-success-600 dark:bg-success-500/10 dark:text-success-400">
          <span>{notice}</span>
          {undoZone && (
            <button
              type="button"
              disabled={undoing}
              onClick={undoDeleteZone}
              className="flex-none rounded-md border border-success-300 px-2 py-1 text-xs font-medium text-success-600 transition-colors hover:bg-success-100 dark:border-success-500/30 dark:text-success-400 dark:hover:bg-success-500/10"
            >
              {undoing ? 'Restauration...' : 'Annuler'}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {isAdmin && productsOpen && (
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white lg:w-72 lg:flex-none dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Produits</p>
                <p className="text-xs text-gray-400">Glissez un produit vers une zone</p>
              </div>
              <Badge size="sm" color="light">{filteredItems.length}</Badge>
            </div>

            <div className="space-y-3 border-b border-gray-100 p-4 dark:border-gray-800">
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
              />
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {filteredItems.length === 0 && (
                <p className="text-sm text-gray-400">Aucun produit.</p>
              )}
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'item', id: item.id }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 active:cursor-grabbing"
                >
                  {item.images?.[0] || item.imageUrl ? (
                    <img src={item.images?.[0] || item.imageUrl} alt="" className="h-9 w-9 rounded object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded bg-brand-50 text-xs font-bold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                      {item.name?.[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                    <p className="text-xs text-gray-400">{Number(item.price).toFixed(2)} CHF</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {isAdmin && screen && (
          <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white lg:w-72 lg:flex-none dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Presets</p>
              <p className="text-xs text-gray-400">Sélection rapide de mise en page</p>
            </div>
            <div className="space-y-3 p-4">
              {PRESETS.map((preset) => (
                <div key={preset.key} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  {preset.zones ? (
                    <button
                      type="button"
                      disabled={applying}
                      onClick={() => applyPreset(preset.zones)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <PresetThumb zones={preset.zones} />
                      <span>
                        <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                          {preset.label}
                        </span>
                        <span className="block text-xs text-gray-400">{preset.description}</span>
                      </span>
                    </button>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3">
                        <PresetThumb zones={[{ zoneType: 'grid', x: 0, y: 0, w: 12, h: 12 }]} />
                        <span>
                          <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                            {preset.label}
                          </span>
                          <span className="block text-xs text-gray-400">{preset.description}</span>
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {preset.variants.map((v) => (
                          <button
                            key={v.label}
                            type="button"
                            disabled={applying}
                            onClick={() =>
                              applyPreset([
                                {
                                  name: 'Grille',
                                  zoneType: 'grid',
                                  gridConfig: { rows: v.rows, cols: v.cols },
                                  x: 0,
                                  y: 0,
                                  w: 12,
                                  h: 12,
                                },
                              ])
                            }
                            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {loading ? (
          <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            Chargement...
          </div>
        ) : layout ? (
        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Canvas — {GRID}×{GRID}
            </h3>
            <Badge size="sm" color="light">
              {layout.zones?.length ?? 0} zone{(layout.zones?.length ?? 0) > 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="p-6">
            <div
              ref={canvasRef}
              onPointerDown={(e) => {
                if (e.target === canvasRef.current) setSelectedId(null)
              }}
              className="relative w-full select-none overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-900 shadow-xl dark:border-gray-700"
              style={{ aspectRatio: '16 / 9' }}
            >
              {(layout.zones || []).map((zone) => {
                const active = gesture?.zoneId === zone.id
                const rect = active ? gesture.rect : zone
                const clash = active
                  ? (layout.zones || []).some((z) => z.id !== zone.id && overlaps(rect, z))
                  : false
                const isGrid = zone.zoneType === 'grid'
                const isList = zone.zoneType === 'list' || zone.zoneType === 'carousel'
                const rows = zone.gridConfig?.rows || 1
                const cols = zone.gridConfig?.cols || 1

                const zoneEmpty =
                  CONTENT_ZONE_TYPES.includes(zone.zoneType) && (zone.items?.length ?? 0) === 0
                const zoneOverflow =
                  REQUIRES_GRID.includes(zone.zoneType) &&
                  ((zone.items?.length ?? 0) > rows * cols ||
                    (zone.zoneType === 'grid' &&
                      (zone.items || []).some(
                        (it) =>
                          typeof it.row !== 'number' ||
                          it.row >= rows ||
                          typeof it.col !== 'number' ||
                          it.col >= cols
                      )))
                const zoneWarnLabel = zoneEmpty ? 'Zone vide' : zoneOverflow ? 'Grille saturée' : null

                const slotDnD = (key, { targetRow, targetCol, targetIndex }, paletteAware) => ({
                  onDragOver: (e) => {
                    if (isAdmin) {
                      e.preventDefault()
                      setDropTarget({ zoneId: zone.id, key })
                    }
                  },
                  onDragLeave: () =>
                    setDropTarget((t) =>
                      t && t.zoneId === zone.id && t.key === key ? null : t
                    ),
                  onDrop: (e) => {
                    e.preventDefault()
                    setDropTarget(null)
                    let payload = null
                    try {
                      payload = JSON.parse(e.dataTransfer.getData('text/plain'))
                    } catch {
                      return
                    }
                    if (payload?.type !== 'item') return
                    if (payload.source === 'zone') {
                      if (payload.zoneId !== zone.id) return
                      if (paletteAware) {
                        if (targetRow !== undefined) moveGridItem(zone, payload.id, targetRow, targetCol)
                        else if (targetIndex !== undefined) moveListItem(zone, payload.id, targetIndex)
                      }
                    } else if (paletteAware) {
                      if (targetRow !== undefined) assignItem(zone, payload.id, targetRow, targetCol)
                      else assignItem(zone, payload.id)
                    }
                  },
                })

                const slotActive = (key) =>
                  dropTarget && dropTarget.zoneId === zone.id && dropTarget.key === key

                return (
                  <div
                    key={zone.id}
                    onPointerDown={(e) => isAdmin && startMove(e, zone)}
                    onDragOver={(e) => {
                      if (isAdmin) {
                        e.preventDefault()
                        setDropZoneId(zone.id)
                      }
                    }}
                    onDragLeave={() => setDropZoneId((cur) => (cur === zone.id ? null : cur))}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDropZoneId(null)
                      let payload = null
                      try {
                        payload = JSON.parse(e.dataTransfer.getData('text/plain'))
                      } catch {
                        return
                      }
                      if (payload?.type === 'item' && payload.source !== 'zone') {
                        assignItem(zone, payload.id)
                      }
                    }}
                    className={`absolute flex flex-col overflow-hidden rounded-md border p-1.5 transition-colors ${
                      clash
                        ? 'border-error-500 bg-error-50/90 ring-2 ring-error-500/50 dark:bg-error-500/20'
                        : 'border-gray-700 bg-white dark:bg-gray-800'
                    } ${isAdmin ? 'cursor-move' : ''} ${
                      active && !clash
                        ? 'ring-2 ring-brand-500/60'
                        : !active && selectedId === zone.id
                          ? 'ring-2 ring-brand-500/60'
                          : ''
                    } ${dropZoneId === zone.id ? 'ring-2 ring-brand-500/70' : ''}`}
                    style={{
                      left: pct(rect.x),
                      top: pct(rect.y),
                      width: pct(rect.w),
                      height: pct(rect.h),
                    }}
                  >
                    <div className="flex flex-none items-start justify-between gap-1">
                      <p className="truncate text-xs font-semibold text-gray-800 dark:text-white/90">
                        {zone.name || `Zone #${zone.id}`}
                      </p>
                      <span className="rounded bg-gray-200 px-1 py-px text-[9px] font-medium uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {ZONE_TYPE_LABELS[zone.zoneType] || zone.zoneType}
                      </span>
                      {zoneWarnLabel && (
                        <span className="rounded bg-warning-500/20 px-1 py-px text-[9px] font-medium text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
                          {zoneWarnLabel}
                        </span>
                      )}
                    </div>

                    {(isGrid || isList) && (zone.items?.length ?? 0) > 0 ? (
                      isGrid ? (
                        <div
                          className="mt-1 grid min-h-0 flex-1 gap-0.5"
                          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                        >
                          {Array.from({ length: rows * cols }, (_, i) => {
                            const r = Math.floor(i / cols)
                            const c = i % cols
                            const item = zone.items.find((it) => it.row === r && it.col === c)
                            const key = `${r}:${c}`
                            if (item) {
                              return (
                                <div
                                  key={key}
                                  draggable={isAdmin}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onDragStart={(e) => {
                                    e.stopPropagation()
                                    e.dataTransfer.setData(
                                      'text/plain',
                                      JSON.stringify({ source: 'zone', type: 'item', id: item.itemId, zoneId: zone.id })
                                    )
                                    e.dataTransfer.effectAllowed = 'move'
                                  }}
                                  {...slotDnD(key, { targetRow: r, targetCol: c }, false)}
                                  title={item.item?.name}
                                  className={`flex min-w-0 items-center justify-center rounded border px-0.5 py-0.5 text-[9px] font-medium leading-tight ${
                                    slotActive(key)
                                      ? 'border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-400'
                                      : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90'
                                  } ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                >
                                  <span className="truncate">{item.item?.name}</span>
                                </div>
                              )
                            }
                            return (
                              <div
                                key={key}
                                {...slotDnD(key, { targetRow: r, targetCol: c }, true)}
                                className={`flex items-center justify-center rounded border border-dashed text-[10px] leading-none ${
                                  slotActive(key)
                                    ? 'border-brand-500 text-brand-400'
                                    : 'border-gray-600 text-gray-500'
                                }`}
                              >
                                +
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                          {zone.items.map((item) => {
                            const key = `i:${item.index}`
                            return (
                              <div
                                key={item.itemId}
                                draggable={isAdmin}
                                onPointerDown={(e) => e.stopPropagation()}
                                onDragStart={(e) => {
                                  e.stopPropagation()
                                  e.dataTransfer.setData(
                                    'text/plain',
                                    JSON.stringify({ source: 'zone', type: 'item', id: item.itemId, zoneId: zone.id })
                                  )
                                  e.dataTransfer.effectAllowed = 'move'
                                }}
                                {...slotDnD(key, { targetIndex: item.index }, true)}
                                title={item.item?.name}
                                className={`flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[9px] font-medium ${
                                  slotActive(key)
                                    ? 'border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-400'
                                    : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90'
                                } ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
                              >
                                <span className="truncate">{item.item?.name}</span>
                              </div>
                            )
                          })}
                          {isAdmin && (
                            <div
                              {...slotDnD(`i:end`, { targetIndex: zone.items.length }, true)}
                              className={`flex h-4 flex-none items-center justify-center rounded border border-dashed text-[10px] leading-none ${
                                slotActive(`i:end`)
                                  ? 'border-brand-500 text-brand-400'
                                  : 'border-gray-600 text-gray-500'
                              }`}
                            >
                              +
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col justify-between text-[10px] text-gray-500 dark:text-gray-400">
                        <p className="mt-1">
                          {(zone.items?.length ?? 0) > 0
                            ? `${zone.items.length} produit${zone.items.length > 1 ? 's' : ''}`
                            : isList || isGrid
                              ? 'Glissez des produits ici'
                              : 'Aucun produit'}
                          {zone.gridConfig?.rows ? ` · ${zone.gridConfig.rows}×${zone.gridConfig.cols}` : ''}
                        </p>
                        <p>
                          {rect.w}×{rect.h} · {rect.x},{rect.y}
                        </p>
                      </div>
                    )}

                    {isAdmin &&
                      RESIZE_HANDLES.map(({ dir, cls }) => (
                        <span
                          key={dir}
                          onPointerDown={(e) => startResize(e, zone, dir)}
                          className={`absolute z-10 size-2.5 rounded-sm border border-white bg-brand-500 ${cls}`}
                        />
                      ))}
                  </div>
                )
              })}

              {(layout.zones || []).length === 0 && (
                <p className="flex h-full items-center justify-center text-sm text-gray-400">
                  Aucune zone. Cliquez sur « Ajouter une zone ».
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Aucun layout pour cet écran.
          </p>
          <Button type="button" onClick={createLayout} disabled={creating}>
            <PlusIcon className="size-4" />
            {creating ? 'Création...' : 'Créer un layout'}
          </Button>
        </div>
      )}

      {isAdmin && selected && (
        <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white lg:w-72 lg:flex-none dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Config zone</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => deleteZone(selected.id)}
                title="Supprimer la zone"
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
              >
                <TrashBinIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                title="Fermer"
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-5 p-4">
            <div>
              <Label htmlFor="zone-cfg-name">Nom</Label>
              <Input
                id="zone-cfg-name"
                type="text"
                value={selected.name || ''}
                onChange={(e) => patchZone(selected.id, { name: e.target.value })}
              />
            </div>

            <div>
              <Label>Type</Label>
              <Badge color={ZONE_TYPE_COLORS[selected.zoneType] || 'light'}>
                {ZONE_TYPE_LABELS[selected.zoneType] || selected.zoneType}
              </Badge>
            </div>

            {REQUIRES_GRID.includes(selected.zoneType) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zone-cfg-rows">Lignes</Label>
                  <Input
                    id="zone-cfg-rows"
                    type="number"
                    min="1"
                    value={selected.gridConfig?.rows ?? 1}
                    onChange={(e) => setGridField(selected, 'rows', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="zone-cfg-cols">Colonnes</Label>
                  <Input
                    id="zone-cfg-cols"
                    type="number"
                    min="1"
                    value={selected.gridConfig?.cols ?? 1}
                    onChange={(e) => setGridField(selected, 'cols', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="zone-cfg-template">Template de carte</Label>
              <select
                id="zone-cfg-template"
                value={selected.cardTemplate || 'default'}
                onChange={(e) => patchZone(selected.id, { cardTemplate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
              >
                {CARD_TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {CARD_TEMPLATE_LABELS[t] || t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Fond</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => patchZone(selected.id, { backgroundStyle: { dark: false } })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selected.backgroundStyle?.dark
                      ? 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                      : 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                  }`}
                >
                  Clair
                </button>
                <button
                  type="button"
                  onClick={() => patchZone(selected.id, { backgroundStyle: { dark: true } })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selected.backgroundStyle?.dark
                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                      : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  Sombre
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-md p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Ajouter une zone
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Choisissez le type et les dimensions initiales. La zone sera placée sur la première
          position libre.
        </p>

        <div className="space-y-5">
          <div>
            <Label>Type de zone</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ZONE_TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, zoneType: key })}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.zoneType === key
                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                      : 'border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="zone-name">Nom</Label>
            <Input
              id="zone-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Auto"
            />
          </div>

          <div>
            <Label htmlFor="zone-card-template">Template de carte</Label>
            <select
              id="zone-card-template"
              value={form.cardTemplate}
              onChange={(e) => setForm({ ...form, cardTemplate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
            >
              {CARD_TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {CARD_TEMPLATE_LABELS[t] || t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="zone-w">Largeur (cellules)</Label>
              <Input
                id="zone-w"
                type="number"
                min="1"
                max="12"
                value={form.w}
                onChange={(e) =>
                  setForm({ ...form, w: clamp(parseInt(e.target.value, 10) || 1, 1, GRID) })
                }
              />
            </div>
            <div>
              <Label htmlFor="zone-h">Hauteur (cellules)</Label>
              <Input
                id="zone-h"
                type="number"
                min="1"
                max="12"
                value={form.h}
                onChange={(e) =>
                  setForm({ ...form, h: clamp(parseInt(e.target.value, 10) || 1, 1, GRID) })
                }
              />
            </div>
          </div>

          {REQUIRES_GRID.includes(form.zoneType) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zone-rows">Lignes</Label>
                <Input
                  id="zone-rows"
                  type="number"
                  min="1"
                  value={form.rows}
                  onChange={(e) =>
                    setForm({ ...form, rows: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="zone-cols">Colonnes</Label>
                <Input
                  id="zone-cols"
                  type="number"
                  min="1"
                  value={form.cols}
                  onChange={(e) =>
                    setForm({ ...form, cols: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={submitZone} disabled={savingZone}>
            {savingZone ? 'Création...' : 'Ajouter'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default ScreenLayoutCanvas
