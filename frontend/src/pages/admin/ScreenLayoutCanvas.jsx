import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageMeta from '../../components/common/PageMeta'
import Badge from '../../components/ui/badge/Badge'
import Button from '../../components/ui/button/Button'
import Input from '../../components/form/input/InputField'
import Label from '../../components/form/Label'
import { Modal } from '../../components/ui/modal'
import { useAuth } from '../../context/AuthContext'
import { ChevronLeftIcon, PlusIcon, CloseIcon, TrashBinIcon, ListIcon, CheckLineIcon, PencilIcon } from '../../icons'
import api from '../../api/axios'
import ZoneSeamMarkers from './canvas/ZoneSeamMarkers'
import BadgeTypePicker from './canvas/BadgeTypePicker'
import ZoneBadgePreview from './canvas/ZoneBadgePreview'
import CardTemplatePreview from './canvas/CardTemplatePreview'
import StyledZoneContent from './canvas/StyledZoneContent'
import PresetThumb from './canvas/PresetThumb'
import CardDesigner from './canvas/CardDesigner'
import FreeItemsLayer from './canvas/FreeItemsLayer'
import {
  isFreeZone,
  defaultFreeItemBox,
  ZONE_LAYOUT_MODES,
  ZONE_LAYOUT_MODE_LABELS,
  ZONE_PRESETS,
  presetZoneLayout,
  resolveZoneLayout,
} from '../../shared/menuSchema'
import ElementVisual from './canvas/ElementVisual'
import {
  GRID,
  REQUIRES_GRID,
  CONTENT_ZONE_TYPES,
  DEFAULT_CONTENT_BOX,
  CONTENT_BOX_MIN,
  EL_IMAGE_MAX_PX,
  EL_PADDING_MAX,
  ICON_START_PX,
  ELEMENT_TYPE_LABELS,
  ELEMENT_FITS,
  ELEMENT_FIT_LABELS,
  ELEMENT_BG_SHAPES,
  ELEMENT_BG_SHAPE_LABELS,
  ICON_DEFAULTS,
  pxToPctW,
  pxToPctH,
  pctToPxW,
  pctToPxH,
  ZONE_TYPE_LABELS,
  ZONE_TYPE_COLORS,
  CARD_TEMPLATES,
  CARD_TEMPLATE_LABELS,
  ELEMENT_KINDS,
  ELEMENT_KIND_LABELS,
  FONT_OPTIONS,
  BADGE_STYLES,
  BADGE_STYLE_LABELS,
  BADGE_POSITIONS,
  BADGE_POSITION_LABELS,
  FONT_SIZES,
  STYLE_DEFAULTS,
  BG_PATTERNS,
  BG_PATTERN_LABELS,
  BG_DEFAULTS,
  PRESETS,
  RESIZE_HANDLES,
  EL_RESIZE_HANDLES,
} from './canvas/constants'
import { TORN_CLIP } from './canvas/tornPaper'
import {
  overlaps,
  clamp,
  gpt,
  computeSeamsAdmin,
  seamLabel,
  backgroundCss,
  trimTransparentPadding,
  findFreePosition,
  validateLayoutForPublish,
  defaultShowPrice,
  zoneShowsPrice,
} from './canvas/canvasUtils'
import {
  cardLayoutFor,
  hasOwnCardLayout,
  pruneCardLayouts,
  sanitizeBackgroundStyle,
} from './canvas/cardLayout'

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
  const [previewMode, setPreviewMode] = useState(false)

  const [bgOpen, setBgOpen] = useState(false)
  const [bgForm, setBgForm] = useState(null)
  const [bgUploading, setBgUploading] = useState(false)
  const [bgSaving, setBgSaving] = useState(false)
  const [zoneImgUploading, setZoneImgUploading] = useState(false)

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
  const [libraryFonts, setLibraryFonts] = useState([])
  // T10 — éditeur de carte personnalisée : { zoneId, itemId | null }
  const [cardDesigner, setCardDesigner] = useState(null)
  const [cardSaving, setCardSaving] = useState(false)
  const [cardError, setCardError] = useState('')
  const [libraryCategories, setLibraryCategories] = useState([])
  const [libraryCatId, setLibraryCatId] = useState(null)
  const [bgLibraryOpen, setBgLibraryOpen] = useState(false)
  const [bgLibraryCatId, setBgLibraryCatId] = useState(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState('produits')
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dropZoneId, setDropZoneId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [zoneDrag, setZoneDrag] = useState(false)
  const [trashOver, setTrashOver] = useState(false)

  // Free-floating decorative elements (layout.settings.elements)
  const [elements, setElements] = useState([])
  const [selectedElementId, setSelectedElementId] = useState(null)
  const [elGesture, setElGesture] = useState(null)
  // Live rect while dragging/resizing an element — kept OUT of elGesture so
  // updating it doesn't re-run the pointermove-listener effect below on every
  // pixel of movement (that used to tear down + re-add window listeners per
  // frame, which is what made dragging feel heavy).
  const [elDragRect, setElDragRect] = useState(null)
  const [elUploading, setElUploading] = useState(false)
  const elAddInputRef = useRef(null)
  const elChangeInputRef = useRef(null)
  const elAddTypeRef = useRef('image')

  // Sub-zone (T9) — the pencil/trash toggle above a selected grid/list/carousel
  // zone, plus the drag state for repositioning+resizing its product container
  // within the zone. Only one zone can be in edit mode at a time.
  const [subzoneEditId, setSubzoneEditId] = useState(null)
  const [subzoneGesture, setSubzoneGesture] = useState(null)
  const [subzoneDragRect, setSubzoneDragRect] = useState(null)
  const subzoneAreaRef = useRef(null)

  const canvasRef = useRef(null)
  const zonesRef = useRef([])
  zonesRef.current = layout?.zones || []
  const elementsRef = useRef([])
  elementsRef.current = elements
  // Debounced auto-save timers: live edits (typing a zone name, dragging px,
  // rotation, …) update state immediately but the network PUT is deferred so a
  // keystroke never blocks the UI. Trailing debounce merges bursts into one call.
  const zonePatchTimers = useRef({})
  const zonePatchQueue = useRef({})
  const elementSaveTimer = useRef(null)

  useEffect(() => {
    return () => {
      Object.values(zonePatchTimers.current).forEach(clearTimeout)
      clearTimeout(elementSaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = () => {
    setLoading(true)
    setError('')
    setNotice('')
    setDirty(false)
    setUndoZone(null)
    Promise.all([
      api.get(`/screens/${id}`).then((r) => r.data),
      // preview=1: the builder edits the draft; the TV endpoint serves published only
      api.get(`/screens/${id}/layout?preview=1`).then((r) => r.data),
      api.get('/categories').then((r) => r.data),
      api.get('/menu').then((r) => r.data),
      api
        .get('/library/categories')
        .then((r) => r.data)
        .catch(() => []),
    ])
      .then(([scr, lay, cats, menu, libCats]) => {
        setScreen(scr)
        setLayout(lay)
        setElements(lay?.settings?.elements || [])
        setCategories(Array.isArray(cats) ? cats : [])
        setItems(Array.isArray(menu) ? menu : [])
        const libArr = Array.isArray(libCats) ? libCats : []
        const fonts = libArr
          .filter((c) => c.type === 'font')
          .flatMap((c) => c.assets || [])
          .filter((a) => a.name)
        setLibraryFonts(fonts)
        setLibraryCategories(libArr.filter((c) => c.type !== 'font'))
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

  // Elements are NOT grid-locked — free float percentages of the canvas
  const pctFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    }
  }

  const startElMove = (e, el) => {
    if (e.button !== 0) return
    e.preventDefault()
    const pt = pctFromEvent(e)
    setElGesture({
      elId: el.id,
      mode: 'move',
      grab: { x: pt.x - el.x, y: pt.y - el.y },
      start: pt,
      orig: { x: el.x, y: el.y, w: el.w, h: el.h },
    })
  }

  const startElResize = (e, el, dir) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const pt = pctFromEvent(e)
    setElGesture({
      elId: el.id,
      mode: 'resize',
      dir,
      start: pt,
      orig: { x: el.x, y: el.y, w: el.w, h: el.h },
    })
  }

  // Sub-zone (T9) — pointer position as % of the content-area DOM node itself
  // (not the canvas): that node's real rect already excludes the zone's header,
  // so this stays correct no matter how tall the title/banner ends up being.
  const subzonePctFromEvent = (e) => {
    const rect = subzoneAreaRef.current.getBoundingClientRect()
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    }
  }

  const startSubzoneMove = (e, zone) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const box = zone.backgroundStyle?.contentBox || DEFAULT_CONTENT_BOX
    const pt = subzonePctFromEvent(e)
    setSubzoneGesture({
      zoneId: zone.id,
      mode: 'move',
      grab: { x: pt.x - box.x, y: pt.y - box.y },
      orig: box,
    })
  }

  const startSubzoneResize = (e, zone, dir) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const box = zone.backgroundStyle?.contentBox || DEFAULT_CONTENT_BOX
    setSubzoneGesture({
      zoneId: zone.id,
      mode: 'resize',
      dir,
      start: subzonePctFromEvent(e),
      orig: box,
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
        setPanelTab('zone')
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

  useEffect(() => {
    if (!elGesture) return

    const { mode, dir, grab, start, orig } = elGesture
    let rafId = null
    let latestRect = orig

    const computeRect = (e) => {
      const pt = pctFromEvent(e)
      let rect = { ...orig }

      if (mode === 'move') {
        rect.x = clamp(pt.x - grab.x, 0, 100 - orig.w)
        rect.y = clamp(pt.y - grab.y, 0, 100 - orig.h)
      } else {
        const dx = pt.x - start.x
        const dy = pt.y - start.y
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
        rect.w = Math.max(2, rect.w)
        rect.h = Math.max(2, rect.h)
        rect.x = clamp(rect.x, 0, 100 - rect.w)
        rect.y = clamp(rect.y, 0, 100 - rect.h)
      }
      return rect
    }

    // Throttle to one React update per animation frame — raw pointermove
    // fires far more often than the screen can repaint, and each update used
    // to re-render the whole canvas (all zones + elements), which is what
    // made dragging feel heavy.
    const onMove = (e) => {
      latestRect = computeRect(e)
      if (rafId == null) {
        rafId = requestAnimationFrame(() => {
          rafId = null
          setElDragRect(latestRect)
        })
      }
    }

    const onUp = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      const g = elGesture
      setElGesture(null)
      setElDragRect(null)
      const changed =
        latestRect.x !== g.orig.x || latestRect.y !== g.orig.y || latestRect.w !== g.orig.w || latestRect.h !== g.orig.h
      if (!changed) {
        setSelectedElementId(g.elId)
        return
      }
      const next = elementsRef.current.map((el) => (el.id === g.elId ? { ...el, ...latestRect } : el))
      setElements(next)
      saveElements(next)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elGesture])

  useEffect(() => {
    if (!subzoneGesture) return
    const { mode, dir, grab, start, orig } = subzoneGesture
    let rafId = null
    let latestRect = orig

    const computeRect = (e) => {
      const pt = subzonePctFromEvent(e)
      let rect = { ...orig }
      if (mode === 'move') {
        rect.x = clamp(pt.x - grab.x, 0, 100 - orig.w)
        rect.y = clamp(pt.y - grab.y, 0, 100 - orig.h)
      } else {
        const dx = pt.x - start.x
        const dy = pt.y - start.y
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
        // Borne haute aussi, pas seulement basse : sans elle, tirer une
        // poignée au-delà du bord donnait w/h > 100, une valeur que le backend
        // refuse — et la zone devenait impossible à modifier ensuite.
        rect.w = clamp(rect.w, CONTENT_BOX_MIN, 100)
        rect.h = clamp(rect.h, CONTENT_BOX_MIN, 100)
        rect.x = clamp(rect.x, 0, 100 - rect.w)
        rect.y = clamp(rect.y, 0, 100 - rect.h)
      }
      return rect
    }

    const onMove = (e) => {
      latestRect = computeRect(e)
      if (rafId == null) {
        rafId = requestAnimationFrame(() => {
          rafId = null
          setSubzoneDragRect(latestRect)
        })
      }
    }

    const onUp = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      const g = subzoneGesture
      setSubzoneGesture(null)
      setSubzoneDragRect(null)
      const changed =
        latestRect.x !== g.orig.x || latestRect.y !== g.orig.y || latestRect.w !== g.orig.w || latestRect.h !== g.orig.h
      if (!changed) return
      const zone = zonesRef.current.find((z) => z.id === g.zoneId)
      if (!zone) return
      patchZone(zone.id, { backgroundStyle: { ...(zone.backgroundStyle || {}), contentBox: latestRect } })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subzoneGesture])

  const resetSubzoneBox = (zone) => {
    if (!zone.backgroundStyle?.contentBox) return
    const { contentBox, ...rest } = zone.backgroundStyle
    patchZone(zone.id, { backgroundStyle: rest })
  }

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

  const flushZonePending = async (zoneId) => {
    const patch = zonePatchQueue.current[zoneId]
    if (!patch) return
    zonePatchQueue.current[zoneId] = null
    try {
      await api.put(`/zones/${zoneId}`, patch)
      setDirty(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour la zone')
      await load()
    }
  }

  const patchZone = (zoneId, patch) => {
    setError('')
    setLayout((l) =>
      l
        ? { ...l, zones: l.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)) }
        : l
    )
    zonePatchQueue.current[zoneId] = { ...(zonePatchQueue.current[zoneId] || {}), ...patch }
    clearTimeout(zonePatchTimers.current[zoneId])
    zonePatchTimers.current[zoneId] = setTimeout(() => flushZonePending(zoneId), 500)
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
        badgeConfig: z.badgeConfig,
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
          qty: it.qty,
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
          badgeConfig: s.badgeConfig,
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
            qty: it.qty,
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
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
    }))

    // Placement libre : pas de case à trouver, le produit arrive sur une tuile
    // décalée des précédentes et se déplace ensuite à la souris.
    if (isFreeZone(zone)) {
      items.push({
        itemId,
        row: null,
        col: null,
        index: items.length,
        order: items.length,
        ...defaultFreeItemBox(items.length),
      })
      await putZoneItems(zone, items)
      return
    }

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

  const removeZoneItem = async (zoneId, itemId) => {
    if (!isAdmin) return
    const zone = layout?.zones?.find((z) => z.id === zoneId)
    if (!zone) return
    const isList = zone.zoneType === 'list' || zone.zoneType === 'carousel'
    let items = (zone.items || []).filter((it) => it.itemId !== itemId)
    if (items.length === (zone.items?.length ?? 0)) return
    if (isList) {
      items = items.map((it, i) => ({
        itemId: it.itemId,
        row: null,
        col: null,
        index: i,
        order: i,
      }))
    }
    await putZoneItems(zone, items)
    // Le produit part : sa carte personnalisée n'a plus de sujet, on la retire
    // du JSON au lieu de la laisser traîner pour toujours. Après
    // putZoneItems, qui réécrit la zone avec la réponse du serveur.
    const pruned = pruneCardLayouts(zone.backgroundStyle, items.map((it) => it.itemId))
    if (pruned !== zone.backgroundStyle) patchZone(zone.id, { backgroundStyle: pruned })
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
          badgeConfig: z.badgeConfig,
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
            qty: it.qty,
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
  const selectedElement = elements.find((e) => e.id === selectedElementId) || null
  const publishIssues = isAdmin ? validateLayoutForPublish(layout) : []

  const filteredItems = items.filter((it) => {
    if (catFilter !== 'all' && Number(it.categoryId) !== Number(catFilter)) return false
    if (search && !it.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const setGridField = (zone, field, value) => {
    const n = Math.max(1, parseInt(value, 10) || 1)
    const gc = zone.gridConfig || {}
    patchZone(zone.id, { gridConfig: { rows: gc.rows || 1, cols: gc.cols || 1, [field]: n } })
  }

  // T7.3 — badge editing: merge into the zone's badgeConfig and always send a
  // valid payload (drop empty text/price so the backend never rejects it).
  const badge = selected?.badgeConfig || {}
  const patchBadge = (patch) => {
    const merged = { ...badge, ...patch }
    const cfg = {}
    if (merged.text) cfg.text = merged.text
    const priceNum = Number(merged.price)
    if (Number.isFinite(priceNum) && priceNum >= 0 && merged.price !== '') cfg.price = priceNum
    if (BADGE_STYLES.includes(merged.style)) cfg.style = merged.style
    if (BADGE_POSITIONS.includes(merged.position)) cfg.position = merged.position
    if (cfg.text === undefined && cfg.price === undefined) {
      patchZone(selected.id, { badgeConfig: null })
      return
    }
    patchZone(selected.id, { badgeConfig: cfg })
  }
  const toggleBadge = (on) => {
    if (on) {
      patchZone(selected.id, { badgeConfig: { text: 'PROMO', style: 'torn-paper', position: 'top-right' } })
    } else {
      patchZone(selected.id, { badgeConfig: null })
    }
  }

  // T7.4 — zone style overrides stored in backgroundStyle JSON
  const styleCfg = selected?.backgroundStyle || {}
  const patchStyle = (patch) => {
    patchZone(selected.id, { backgroundStyle: { ...styleCfg, ...patch } })
  }
  const resetStyle = () => {
    patchZone(selected.id, { backgroundStyle: styleCfg.dark !== undefined ? { dark: styleCfg.dark } : {} })
  }

  // T10 — carte personnalisée. Le dessin de la zone vit dans
  // backgroundStyle.cardLayout ; un produit qui a son propre dessin le range
  // dans backgroundStyle.cardLayouts[itemId] et retombe sur celui de la zone
  // dès qu'on le retire.
  const designerZone = cardDesigner ? layout?.zones?.find((z) => z.id === cardDesigner.zoneId) : null
  const designerItem =
    designerZone && cardDesigner?.itemId != null
      ? designerZone.items?.find((it) => it.itemId === cardDesigner.itemId) || null
      : null

  // Images proposées au designer de carte : celles de la Bibliothèque (les
  // catégories non-police), à plat.
  const libraryImages = libraryCategories.flatMap((c) => c.assets || []).filter((a) => a?.url)

  const uploadCardImage = async (file) => {
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', await trimTransparentPadding(file))
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.url
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l’upload de l’image')
      return null
    }
  }

  // Écriture directe (pas la file d'attente différée de patchZone) : le dessin
  // représente un vrai travail, on doit savoir s'il est parti avant de fermer.
  // Une erreur laissait sinon la fenêtre se fermer, puis le rechargement
  // silencieux du layout effaçait le dessin sans un mot.
  const putZoneBackgroundStyle = async (zone, backgroundStyleIn, extra = null) => {
    let backgroundStyle = backgroundStyleIn
    setCardSaving(true)
    setCardError('')
    // Répare au passage une contentBox héritée hors bornes : sinon le backend
    // refuse toute écriture sur cette zone et le dessin ne part jamais.
    backgroundStyle = sanitizeBackgroundStyle(backgroundStyle)
    try {
      await api.put(`/zones/${zone.id}`, { ...(extra || {}), backgroundStyle })
      setLayout((l) =>
        l
          ? {
              ...l,
              zones: l.zones.map((z) =>
                z.id === zone.id ? { ...z, ...(extra || {}), backgroundStyle } : z
              ),
            }
          : l
      )
      setDirty(true)
      setCardDesigner(null)
      return true
    } catch (err) {
      setCardError(err.response?.data?.error || 'Impossible d’enregistrer la carte')
      return false
    } finally {
      setCardSaving(false)
    }
  }

  const saveCardLayout = (cardLayout) => {
    if (!designerZone) return
    const bs = designerZone.backgroundStyle || {}
    const backgroundStyle =
      cardDesigner.itemId != null
        ? {
            ...bs,
            cardLayouts: { ...(bs.cardLayouts || {}), [String(cardDesigner.itemId)]: cardLayout },
          }
        : { ...bs, cardLayout }
    return putZoneBackgroundStyle(designerZone, backgroundStyle)
  }

  // T10 (confort) — copier le dessin ouvert vers une autre zone. La zone cible
  // passe en template "Personnalisé" et reçoit le dessin tel quel : les slots
  // sont en % et les tailles de police dans le repère refW, donc la carte se
  // remet d'elle-même à l'échelle de la cellule de la zone d'arrivée.
  const copyCardLayoutTo = async (targetZoneId, cardLayout) => {
    const target = layout?.zones?.find((z) => z.id === targetZoneId)
    if (!target) return false
    const backgroundStyle = sanitizeBackgroundStyle({ ...(target.backgroundStyle || {}), cardLayout })
    setCardSaving(true)
    setCardError('')
    try {
      await api.put(`/zones/${target.id}`, { cardTemplate: 'custom', backgroundStyle })
      setLayout((l) =>
        l
          ? {
              ...l,
              zones: l.zones.map((z) =>
                z.id === target.id ? { ...z, cardTemplate: 'custom', backgroundStyle } : z
              ),
            }
          : l
      )
      setDirty(true)
      return true
    } catch (err) {
      setCardError(err.response?.data?.error || 'Impossible de copier le dessin')
      return false
    } finally {
      setCardSaving(false)
    }
  }

  // Depuis le dessin d'un produit : en faire le dessin de toute la zone, et
  // retirer au passage la surcharge de ce produit (sinon il garderait une copie
  // figée qui ne suivrait plus les retouches faites au niveau de la zone).
  const applyCardLayoutToZone = (cardLayout) => {
    if (!designerZone) return
    const bs = designerZone.backgroundStyle || {}
    const rest = { ...(bs.cardLayouts || {}) }
    if (cardDesigner?.itemId != null) delete rest[String(cardDesigner.itemId)]
    const backgroundStyle = { ...bs, cardLayout }
    if (Object.keys(rest).length === 0) delete backgroundStyle.cardLayouts
    else backgroundStyle.cardLayouts = rest
    // La zone doit passer en "Personnalisé", sinon le dessin qu'on vient d'y
    // appliquer ne serait jamais rendu.
    return putZoneBackgroundStyle(designerZone, backgroundStyle, { cardTemplate: 'custom' })
  }

  const clearCardOverride = () => {
    if (!designerZone || cardDesigner?.itemId == null) return
    const bs = designerZone.backgroundStyle || {}
    const next = { ...(bs.cardLayouts || {}) }
    delete next[String(cardDesigner.itemId)]
    const backgroundStyle = { ...bs }
    if (Object.keys(next).length === 0) delete backgroundStyle.cardLayouts
    else backgroundStyle.cardLayouts = next
    return putZoneBackgroundStyle(designerZone, backgroundStyle)
  }

  // T7.6 — screen background editor (layout.settings.background)
  const screenBg = layout?.settings?.background || null
  const openBg = () => {
    setBgForm(
      screenBg
        ? {
            ...screenBg,
            seamsEnabled: screenBg.seamsEnabled !== false,
            hiddenSeams: Array.isArray(screenBg.hiddenSeams) ? screenBg.hiddenSeams : [],
          }
        : { ...BG_DEFAULTS }
    )
    setBgOpen(true)
    setError('')
  }
  const saveBackground = async () => {
    if (!layout) return
    setBgSaving(true)
    setError('')
    try {
      const settings = { ...(layout.settings || {}) }
      // Image present -> full image background. No image but torn-paper texture
      // selected -> texture-only background (torn dividers between zones).
      // Otherwise the background is simply removed.
      const pattern = BG_PATTERNS.includes(bgForm?.pattern) ? bgForm.pattern : 'none'
      const seamFields = {
        seamsEnabled: bgForm?.seamsEnabled !== false,
        hiddenSeams: Array.isArray(bgForm?.hiddenSeams) ? bgForm.hiddenSeams : [],
      }
      settings.background = bgForm?.imageUrl
        ? {
            type: 'image',
            imageUrl: bgForm.imageUrl,
            pattern,
            patternColor: bgForm.patternColor || BG_DEFAULTS.patternColor,
            ...seamFields,
          }
        : pattern === 'torn-paper'
          ? { pattern, patternColor: bgForm.patternColor || BG_DEFAULTS.patternColor, ...seamFields }
          : null
      await api.put(`/screens/${id}/layout`, { settings })
      await load()
      setBgOpen(false)
      setNotice('Fond de l’écran enregistré.')
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’enregistrer le fond')
    } finally {
      setBgSaving(false)
    }
  }
  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBgUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBgForm((prev) => ({
        ...(prev || BG_DEFAULTS),
        type: 'image',
        imageUrl: data.url,
      }))
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l’upload de l’image')
    } finally {
      setBgUploading(false)
      e.target.value = ''
    }
  }
  // T7.9b — per-zone background image (upload -> backgroundStyle.bgImage)
  const handleZoneImgUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    setZoneImgUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      patchStyle({ bgImage: data.url })
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l’upload de l’image')
    } finally {
      setZoneImgUploading(false)
      e.target.value = ''
    }
  }
  // T8 — free-floating decorative elements (layout.settings.elements)
  const newElementId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `el_${Date.now()}`
  const nextElementZ = () => {
    const maxZ = elementsRef.current.reduce((m, e) => Math.max(m, e.zIndex ?? 10), 0)
    return maxZ === 0 ? 10 : maxZ + 1
  }
  const saveElements = (nextElements) => {
    setError('')
    setElements(nextElements)
    elementsRef.current = nextElements
    setLayout((l) =>
      l ? { ...l, settings: { ...(l.settings || {}), elements: nextElements } } : l
    )
    clearTimeout(elementSaveTimer.current)
    elementSaveTimer.current = setTimeout(() => flushElementsSave(), 600)
  }
  const flushElementsSave = async () => {
    elementSaveTimer.current = null
    try {
      await api.put(`/screens/${id}/layout`, {
        settings: { elements: elementsRef.current },
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’enregistrer les éléments')
      await load()
    }
  }
  const addElementToState = async (el) => {
    const next = [...elementsRef.current, el]
    setSelectedElementId(el.id)
    setElements(next)
    await saveElements(next)
  }
  const addTextElement = () => {
    const el = {
      id: newElementId(),
      type: 'text',
      kind: 'plain',
      x: 35,
      y: 45,
      w: 30,
      h: 10,
      zIndex: nextElementZ(),
      text: 'Nouveau texte',
      fontSize: 24,
      color: '#FFFFFF',
      dark: true,
    }
    addElementToState(el)
  }
  const openElAddPicker = (type) => {
    elAddTypeRef.current = type
    elAddInputRef.current?.click()
  }
  // Image, logo ou icône : même élément, seuls les réglages de départ changent.
  // Une icône naît carrée (une icône étirée n'a pas de sens) et recolorée en
  // blanc, ce qui la rend visible tout de suite sur un fond sombre.
  const newDrawnElement = (type, url) => {
    const square = type === 'icon'
    return {
      id: newElementId(),
      type,
      x: 40,
      y: 40,
      w: square ? pxToPctW(ICON_START_PX) : 20,
      h: square ? pxToPctH(ICON_START_PX) : 20,
      zIndex: nextElementZ(),
      imageUrl: url,
      ...(square ? ICON_DEFAULTS : {}),
    }
  }
  // Gallery of every image already used by a free element on this layout —
  // lets the user drop the same logo/image on canvas again without
  // re-uploading the file.
  const elementImageGallery = Array.from(
    new Set(elements.filter((el) => el.imageUrl).map((el) => el.imageUrl))
  )
  const addElementFromGalleryUrl = (url) => {
    addElementToState(newDrawnElement('image', url))
  }
  // Same mechanism as addElementFromGalleryUrl — the asset's URL is already
  // hosted, so no upload step needed. Jump to the "Éléments" tab afterward:
  // that's what activates the on-canvas drag/select overlay for it (see the
  // `panelTab === 'elements'` overlay below) instead of duplicating that
  // logic for a second tab.
  const addElementFromLibraryAsset = (asset) => {
    addElementToState(newDrawnElement('image', asset.url))
    setPanelTab('elements')
  }
  const handleElAddUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setElUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', await trimTransparentPadding(file))
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await addElementToState(newDrawnElement(elAddTypeRef.current, data.url))
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l’upload de l’image')
    } finally {
      setElUploading(false)
      e.target.value = ''
    }
  }
  const handleElChangeUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedElementId) return
    setElUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', await trimTransparentPadding(file))
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      patchElementById(selectedElementId, { imageUrl: data.url })
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l’upload de l’image')
    } finally {
      setElUploading(false)
      e.target.value = ''
    }
  }
  const patchElementById = (elId, patch) => {
    const next = elementsRef.current.map((el) => (el.id === elId ? { ...el, ...patch } : el))
    saveElements(next)
  }
  const deleteElement = async (elId) => {
    const next = elementsRef.current.filter((el) => el.id !== elId)
    if (selectedElementId === elId) setSelectedElementId(null)
    setElements(next)
    await saveElements(next)
  }
  const sendElementToFront = (elId) => {
    const maxZ = elementsRef.current.reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10)
    patchElementById(elId, { zIndex: maxZ + 1 })
  }
  const sendElementToBack = (elId) => {
    const minZ = elementsRef.current.reduce(
      (m, e) => Math.min(m, e.zIndex ?? 10),
      Number.MAX_SAFE_INTEGER
    )
    patchElementById(elId, { zIndex: minZ - 1 })
  }
  const removeBackground = async () => {
    if (!layout) return
    setBgSaving(true)
    setError('')
    try {
      const settings = { ...(layout.settings || {}) }
      settings.background = null
      await api.put(`/screens/${id}/layout`, { settings })
      await load()
      setBgOpen(false)
      setNotice('Fond de l’écran retiré.')
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de retirer le fond')
    } finally {
      setBgSaving(false)
    }
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
                onClick={() => {
                  setPanelOpen(true)
                  setPanelTab('produits')
                }}
              >
                <ListIcon className="size-4" />
                Produits
              </Button>
            )}
            {isAdmin && layout && (
              <Button size="sm" variant="outline" onClick={openBg} title="Fond et découpe de l’écran">
                <span className="size-3 rounded-full border border-current" style={{ background: screenBg ? undefined : 'transparent' }} />
                Fond
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
        {isAdmin && screen && layout && panelOpen && (
          <aside className="flex max-h-[75vh] min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white lg:sticky lg:top-24 lg:w-72 lg:max-h-[calc(100vh-7rem)] lg:flex-none dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex border-b border-gray-100 dark:border-gray-800">
              <div className="flex min-w-0 flex-1 overflow-x-auto">
                {[
                    { key: 'produits', label: 'Produits' },
                    { key: 'presets', label: 'Presets' },
                    { key: 'zone', label: 'Config' },
                    { key: 'style', label: 'Style' },
                    { key: 'elements', label: 'Éléments' },
                    { key: 'library', label: 'Bibliothèque' },
                  ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPanelTab(t.key)}
                  className={`flex flex-none items-center justify-center gap-1.5 whitespace-nowrap px-2.5 py-2.5 text-sm font-medium transition-colors ${
                    panelTab === t.key
                      ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {t.label}
                  {t.key === 'zone' && selected && (
                    <span className="size-1.5 rounded-full bg-brand-500" />
                  )}
                </button>
              ))}
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                title="Masquer le panneau"
                className="flex-none px-3 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-200"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            {panelTab === 'produits' && (
              <>
                <div className="space-y-3 border-b border-gray-100 p-4 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Glissez un produit vers une zone</p>
                    <Badge size="sm" color="light">{filteredItems.length}</Badge>
                  </div>
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
                        <p className="text-xs text-gray-400">{item.price != null ? `${Number(item.price).toFixed(2)} CHF` : '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {panelTab === 'presets' && (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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
            )}

            {panelTab === 'zone' &&
              (selected ? (
                <>
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
                        title="Désélectionner"
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                      >
                        <CloseIcon className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
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

                    <div>
                      <Label htmlFor="zone-cfg-zonepreset">Disposition de la zone</Label>
                      <select
                        id="zone-cfg-zonepreset"
                        value={selected.backgroundStyle?.zoneLayout?.preset || ''}
                        onChange={(e) => {
                          const key = e.target.value
                          if (!key) {
                            // Retour à l'agencement d'origine : on retire la
                            // disposition au lieu d'en enregistrer une copie.
                            const { zoneLayout: _drop, ...rest } = styleCfg
                            patchZone(selected.id, { backgroundStyle: rest })
                            return
                          }
                          const next = presetZoneLayout(key)
                          if (next) patchStyle({ zoneLayout: { ...next, preset: key } })
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                      >
                        <option value="">Origine — titre en haut, produits dessous</option>
                        {ZONE_PRESETS.map((zp) => (
                          <option key={zp.key} value={zp.key}>
                            {zp.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {resolveZoneLayout(selected)
                          ? ZONE_PRESETS.find((zp) => zp.key === selected.backgroundStyle?.zoneLayout?.preset)?.description ||
                            'Disposition personnalisée.'
                          : 'Le titre et les produits gardent l’agencement d’origine.'}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="zone-cfg-layoutmode">Disposition des produits</Label>
                      <select
                        id="zone-cfg-layoutmode"
                        value={selected.layoutMode || 'auto'}
                        onChange={(e) => patchZone(selected.id, { layoutMode: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                      >
                        {ZONE_LAYOUT_MODES.map((m) => (
                          <option key={m} value={m}>
                            {ZONE_LAYOUT_MODE_LABELS[m] || m}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {isFreeZone(selected)
                          ? 'Chaque produit se déplace et se redimensionne à la souris sur le tableau.'
                          : 'Les produits remplissent la grille ou la liste de la zone.'}
                      </p>
                    </div>

                    {!isFreeZone(selected) && REQUIRES_GRID.includes(selected.zoneType) && (
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

                      {/* T9b — le prix ne dépendait que du template choisi (seule
                          la carte « Image + détails » en portait un). Cette case
                          le rend indépendant : un produit sans description peut
                          garder son prix, et une carte détaillée peut le masquer. */}
                      <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={zoneShowsPrice(selected)}
                          onChange={(e) => patchStyle({ showPrice: e.target.checked })}
                          className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        Afficher le prix
                      </label>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {styleCfg.showPrice === undefined
                          ? `Par défaut pour ce template : ${defaultShowPrice(selected) ? 'affiché' : 'masqué'}.`
                          : 'Choix manuel — indépendant du template et du réglage global de l’écran.'}
                      </p>

                      {/* T10 — le template « Personnalisé » n'a pas de disposition
                          codée : elle se dessine ici, et s'applique à tous les
                          produits de la zone (un produit peut ensuite avoir la
                          sienne via l'icône stylo sur sa vignette). */}
                      {selected.cardTemplate !== 'custom' && (
                        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                          Un seul produit peut quand même avoir sa carte à lui : icône stylo sur sa
                          vignette dans le canvas.
                        </p>
                      )}

                      {selected.cardTemplate === 'custom' && (
                        <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-500/30 dark:bg-brand-500/10">
                          <button
                            type="button"
                            onClick={() => setCardDesigner({ zoneId: selected.id, itemId: null })}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                          >
                            <PencilIcon className="size-4" />
                            Perso — dessiner la carte
                          </button>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {selected.backgroundStyle?.cardLayout
                              ? 'Dessin enregistré pour cette zone.'
                              : 'Aucun dessin : la carte par défaut est utilisée en attendant.'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={Boolean(selected.badgeConfig)}
                          onChange={(e) => toggleBadge(e.target.checked)}
                          className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        Afficher un badge / label
                      </label>

                      {selected.badgeConfig ? (
                        <div className="mt-3 space-y-3">
                          <div>
                            <Label htmlFor="zone-badge-text">Texte</Label>
                            <Input
                              id="zone-badge-text"
                              type="text"
                              value={selected.badgeConfig.text || ''}
                              onChange={(e) => patchBadge({ text: e.target.value })}
                              placeholder="Ex : PROMO, NOUVEAU..."
                            />
                          </div>

                          <div>
                            <Label htmlFor="zone-badge-price">Prix</Label>
                            <Input
                              id="zone-badge-price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={selected.badgeConfig.price ?? ''}
                              onChange={(e) => patchBadge({ price: e.target.value })}
                              placeholder="Ex : 8.50"
                            />
                          </div>

                          <div>
                            <Label htmlFor="zone-badge-style">Style</Label>
                            <select
                              id="zone-badge-style"
                              value={selected.badgeConfig.style || 'torn-paper'}
                              onChange={(e) => patchBadge({ style: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                            >
                              {BADGE_STYLES.map((s) => (
                                <option key={s} value={s}>
                                  {BADGE_STYLE_LABELS[s] || s}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="zone-badge-position">Position</Label>
                            <select
                              id="zone-badge-position"
                              value={selected.badgeConfig.position || 'top-right'}
                              onChange={(e) => patchBadge({ position: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                            >
                              {BADGE_POSITIONS.map((p) => (
                                <option key={p} value={p}>
                                  {BADGE_POSITION_LABELS[p] || p}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-400">
                          Badge désactivé. Activez pour afficher un label (texte et/ou prix) sur la zone.
                        </p>
                      )}
                    </div>

                    {(selected.zoneType === 'banner' || selected.zoneType === 'hero') && (
                      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                        <div className="mb-2 flex items-center justify-between">
                          <Label>Paliers de prix (ex : 1/2/3 viandes)</Label>
                          <button
                            type="button"
                            onClick={() => {
                              const tiers = [...(selected.badgeConfig?.tiers || []), { label: '', price: 0 }]
                              patchZone(selected.id, { badgeConfig: { ...(selected.badgeConfig || {}), tiers } })
                            }}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                          >
                            + Ajouter
                          </button>
                        </div>
                        {(selected.badgeConfig?.tiers || []).map((tier, i) => (
                          <div key={i} className="mb-2 flex items-center gap-2">
                            <Input
                              type="text"
                              value={tier.label}
                              placeholder="1 Meat"
                              onChange={(e) => {
                                const tiers = selected.badgeConfig.tiers.map((t, idx) =>
                                  idx === i ? { ...t, label: e.target.value } : t
                                )
                                patchZone(selected.id, { badgeConfig: { ...selected.badgeConfig, tiers } })
                              }}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={tier.price}
                              placeholder="8.50"
                              onChange={(e) => {
                                const tiers = selected.badgeConfig.tiers.map((t, idx) =>
                                  idx === i ? { ...t, price: Number(e.target.value) || 0 } : t
                                )
                                patchZone(selected.id, { badgeConfig: { ...selected.badgeConfig, tiers } })
                              }}
                              className="w-24"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const tiers = selected.badgeConfig.tiers.filter((_, idx) => idx !== i)
                                const nextBadge = { ...selected.badgeConfig }
                                if (tiers.length > 0) nextBadge.tiers = tiers
                                else delete nextBadge.tiers
                                patchZone(selected.id, { badgeConfig: Object.keys(nextBadge).length > 0 ? nextBadge : null })
                              }}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
                            >
                              <CloseIcon className="size-4" />
                            </button>
                          </div>
                        ))}
                        {(!selected.badgeConfig?.tiers || selected.badgeConfig.tiers.length === 0) && (
                          <p className="text-xs text-gray-400">Aucun palier. Cliquez sur « + Ajouter ».</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="min-h-0 flex-1 p-4 text-sm text-gray-400">
                  Cliquez sur une zone du canvas pour la configurer.
                </div>
              ))}

            {panelTab === 'style' &&
              (selected ? (
                <>
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Style zone</p>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      title="Désélectionner"
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                    >
                      <CloseIcon className="size-4" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                    <div>
                      <Label>Fond</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => patchStyle({ dark: false, bg: undefined, text: undefined })}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            styleCfg.dark
                              ? 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                              : 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                          }`}
                        >
                          Clair
                        </button>
                        <button
                          type="button"
                          onClick={() => patchStyle({ dark: true, bg: undefined, text: undefined })}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            styleCfg.dark
                              ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                              : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                          }`}
                        >
                          Sombre
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Clair = image/fond clair → texte foncé. Sombre = image/fond sombre → texte clair.
                      </p>
                    </div>

                    <div>
                      <Label>Aperçu du contraste</Label>
                      <div
                        className="flex items-center gap-3 overflow-hidden rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                        style={{ background: styleCfg.bg || (styleCfg.dark ? STYLE_DEFAULTS.bgDark : STYLE_DEFAULTS.bgLight) }}
                      >
                        <span
                          className="size-8 flex-none rounded-full border-2 border-dashed"
                          style={{ borderColor: styleCfg.accent || STYLE_DEFAULTS.accent, background: 'rgba(255,255,255,0.6)' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-bold uppercase tracking-wide"
                            style={{ color: styleCfg.accent || STYLE_DEFAULTS.accent, fontSize: 13 }}
                          >
                            {selected?.name || 'Titre de la zone'}
                          </p>
                          <p
                            className="truncate text-xs font-semibold"
                            style={{ color: styleCfg.text || (styleCfg.dark ? STYLE_DEFAULTS.textDark : STYLE_DEFAULTS.textLight) }}
                          >
                            Nom du produit 12,50€
                          </p>
                          <p
                            className="truncate text-[10px]"
                            style={{
                              color:
                                (styleCfg.text || (styleCfg.dark ? STYLE_DEFAULTS.textDark : STYLE_DEFAULTS.textLight)) ===
                                STYLE_DEFAULTS.textDark
                                  ? '#EEEEEE'
                                  : '#8A8A8A',
                            }}
                          >
                            Description détaillée du produit
                          </p>
                        </div>
                        <span
                          className="flex-none rounded px-2 py-0.5 font-bold uppercase"
                          style={{
                            background: '#FFFFFF',
                            color: '#0D0D0D',
                            fontSize: 9,
                            clipPath: TORN_CLIP,
                          }}
                        >
                          {selected?.badgeConfig?.text || 'PROMO'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="zone-style-bgimage">Image de fond (remplit toute la zone)</Label>
                      <div className="flex items-center gap-3">
                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-400 ${
                            zoneImgUploading ? 'opacity-60' : ''
                          }`}
                        >
                          {zoneImgUploading ? 'Upload...' : styleCfg.bgImage ? 'Changer l’image' : 'Importer une image'}
                          <input
                            id="zone-style-bgimage"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleZoneImgUpload}
                            disabled={zoneImgUploading}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setBgLibraryCatId(null)
                            setBgLibraryOpen((v) => !v)
                          }}
                          className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-400"
                        >
                          Bibliothèque
                        </button>
                        {styleCfg.bgImage ? (
                          <button
                            type="button"
                            onClick={() => patchStyle({ bgImage: null })}
                            className="text-sm font-medium text-error-600 hover:text-error-700 dark:text-error-400"
                          >
                            Retirer
                          </button>
                        ) : null}
                      </div>
                      {styleCfg.bgImage ? (
                        <img
                          src={styleCfg.bgImage}
                          alt="Fond de la zone"
                          className="mt-2 h-24 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                        />
                      ) : null}

                      {bgLibraryOpen && (
                        <div className="mt-2 space-y-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                          {libraryCategories.length === 0 ? (
                            <p className="text-xs text-gray-400">Bibliothèque vide.</p>
                          ) : bgLibraryCatId == null ? (
                            <div className="space-y-1">
                              {libraryCategories.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setBgLibraryCatId(cat.id)}
                                  className="flex w-full items-center justify-between rounded-md border border-gray-200 px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                                >
                                  <span>{cat.name}</span>
                                  <span className="text-gray-400">{(cat.assets || []).length}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            (() => {
                              const cat = libraryCategories.find((c) => c.id === bgLibraryCatId)
                              const assets = cat?.assets || []
                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setBgLibraryCatId(null)}
                                    className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400"
                                  >
                                    <ChevronLeftIcon className="size-3.5" />
                                    {cat?.name}
                                  </button>
                                  {assets.length === 0 ? (
                                    <p className="text-xs text-gray-400">Vide.</p>
                                  ) : (
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {assets.map((asset) => (
                                        <button
                                          key={asset.id}
                                          type="button"
                                          onClick={() => {
                                            patchStyle({ bgImage: asset.url })
                                            setBgLibraryOpen(false)
                                          }}
                                          title={asset.name || ''}
                                          className="aspect-square overflow-hidden rounded-md border border-gray-200 bg-white transition-colors hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900"
                                        >
                                          <img src={asset.url} alt="" className="h-full w-full object-cover" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )
                            })()
                          )}
                        </div>
                      )}
                    </div>

                    {[
                      { key: 'bg', label: 'Couleur fond' },
                      { key: 'text', label: 'Couleur texte' },
                      { key: 'accent', label: 'Couleur accent' },
                    ].map(({ key, label }) => {
                      const defaultValue =
                        key === 'bg'
                          ? styleCfg.dark
                            ? STYLE_DEFAULTS.bgDark
                            : STYLE_DEFAULTS.bgLight
                          : key === 'text'
                            ? styleCfg.dark
                              ? STYLE_DEFAULTS.textDark
                              : STYLE_DEFAULTS.textLight
                            : STYLE_DEFAULTS.accent
                      return (
                        <div key={key}>
                          <Label htmlFor={`zone-style-${key}`}>{label}</Label>
                          <div className="flex items-center gap-2">
                            <input
                              id={`zone-style-${key}`}
                              type="color"
                              value={styleCfg[key] || defaultValue}
                              onChange={(e) => patchStyle({ [key]: e.target.value })}
                              className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                            />
                            <button
                              type="button"
                              onClick={() => patchStyle({ [key]: undefined })}
                              className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400"
                            >
                              Défaut
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    <div>
                      <Label htmlFor="zone-style-font">Taille de police</Label>
                      <select
                        id="zone-style-font"
                        value={styleCfg.fontSize || ''}
                        onChange={(e) =>
                          patchStyle({ fontSize: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                      >
                        <option value="">Par défaut</option>
                        {FONT_SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s}px
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="zone-style-banner">Style du titre</Label>
                      <select
                        id="zone-style-banner"
                        value={styleCfg.banner || 'default'}
                        onChange={(e) =>
                          patchStyle({ banner: e.target.value === 'default' ? undefined : e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                      >
                        <option value="default">Par défaut</option>
                        <option value="ribbon">Ruban</option>
                        <option value="underline">Soulignement</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="zone-style-extraprice">Prix "Extra" (optionnel)</Label>
                      <Input
                        id="zone-style-extraprice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={styleCfg.extraPrice ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          patchStyle({ extraPrice: raw === '' ? undefined : Math.max(0, Number(raw)) })
                        }}
                        placeholder="Ex : 1.00"
                      />
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Affiche un badge prix à côté du titre de la zone (ex : "Extra +1,00€").
                      </p>
                    </div>

                    {/* Vaut pour le prix Extra, les paliers (1/2/3 viandes) rendus par
                        TierPricingHeader dans une zone bannière, ET pour le badge prix
                        de chaque produit dans une zone grille/liste. */}
                    <BadgeTypePicker
                      value={styleCfg.badgeType}
                      dark={styleCfg.dark !== false}
                      onChange={(t) => patchStyle({ badgeType: t })}
                    />

                    <div>
                      <Label htmlFor="zone-style-badge">Style du badge</Label>
                      <select
                        id="zone-style-badge"
                        value={badge.style || 'torn-paper'}
                        onChange={(e) => patchBadge({ style: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                      >
                        {BADGE_STYLES.map((s) => (
                          <option key={s} value={s}>
                            {BADGE_STYLE_LABELS[s] || s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {Object.keys(styleCfg).some((k) => k !== 'dark' && styleCfg[k] !== undefined && styleCfg[k] !== null) ||
                    styleCfg.dark !== undefined ? (
                      <button
                        type="button"
                        onClick={resetStyle}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-error-300 hover:text-error-600 dark:border-gray-700 dark:text-gray-300"
                      >
                        Réinitialiser le style
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="min-h-0 flex-1 p-4 text-sm text-gray-400">
                  Sélectionnez une zone pour la styler.
                </div>
              ))}

            {panelTab === 'elements' && (
              <>
                <div className="space-y-3 border-b border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-xs text-gray-400">
                    Éléments libres flottants (position en %, hors grille)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addTextElement}
                      className="flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                    >
                      Texte
                    </button>
                    <button
                      type="button"
                      disabled={elUploading}
                      onClick={() => openElAddPicker('image')}
                      className="flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                    >
                      {elUploading ? 'Upload...' : 'Image'}
                    </button>
                    <button
                      type="button"
                      disabled={elUploading}
                      onClick={() => openElAddPicker('icon')}
                      title="SVG de préférence : net à toute taille et recolorable"
                      className="flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                    >
                      Icône
                    </button>
                  </div>
                  {/* .svg listé en plus de image/* : certains systèmes ne
                      déclarent pas le type MIME des .svg dans le sélecteur de
                      fichiers, et le fichier apparaîtrait alors grisé. */}
                  <input
                    ref={elAddInputRef}
                    type="file"
                    accept="image/*,.svg"
                    className="hidden"
                    onChange={handleElAddUpload}
                  />

                  {elementImageGallery.length > 0 && (
                    <div>
                      <Label>Galerie (images déjà utilisées)</Label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {elementImageGallery.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => addElementFromGalleryUrl(url)}
                            title="Ajouter cette image au canvas"
                            className="aspect-square overflow-hidden rounded-md border border-gray-200 bg-white transition-colors hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900"
                          >
                            <img src={url} alt="" className="h-full w-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {elements.length === 0 && (
                    <p className="text-sm text-gray-400">Aucun élément.</p>
                  )}
                  {elements.map((el) => (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${
                        selectedElementId === el.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {el.type === 'text' ? (
                        <span className="flex h-9 w-9 flex-none items-center justify-center rounded text-[10px] font-bold uppercase">
                          Tx
                        </span>
                      ) : el.imageUrl ? (
                        // Fond sombre : une icône recolorée en blanc serait
                        // invisible sur la vignette claire par défaut.
                        <span className="h-9 w-9 flex-none overflow-hidden rounded bg-gray-800 p-0.5">
                          <ElementVisual el={el} />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 flex-none items-center justify-center rounded text-xs font-bold text-gray-500 dark:text-gray-400">
                          {el.type.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                          {ELEMENT_TYPE_LABELS[el.type] || el.type}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {el.type === 'text' ? el.text : el.imageUrl || '—'}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400">z{el.zIndex ?? 10}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteElement(el.id)
                        }}
                        title="Supprimer l'élément"
                        className="flex-none rounded-md p-1.5 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
                      >
                        <TrashBinIcon className="size-4" />
                      </button>
                    </div>
                  ))}

                  {selectedElement && (
                    <div className="space-y-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Éditer ({ELEMENT_TYPE_LABELS[selectedElement.type] || selectedElement.type})
                      </p>
                      {selectedElement.type === 'text' ? (
                        <>
                          <div>
                            <Label>Type</Label>
                            <div className="flex flex-wrap gap-2">
                              {ELEMENT_KINDS.map((k) => (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() =>
                                    patchElementById(selectedElement.id, {
                                      kind: k,
                                      ...(k === 'price' &&
                                      (selectedElement.price === undefined ||
                                        selectedElement.price === null ||
                                        Number.isNaN(selectedElement.price))
                                        ? { price: 5 }
                                        : {}),
                                    })
                                  }
                                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                    (selectedElement.kind || 'plain') === k
                                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                                      : 'border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {ELEMENT_KIND_LABELS[k]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(selectedElement.kind || 'plain') === 'price' ? (
                            <div>
                              <Label htmlFor={`el-price-${selectedElement.id}`}>Prix</Label>
                              <Input
                                id={`el-price-${selectedElement.id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={selectedElement.price ?? ''}
                                onChange={(e) =>
                                  patchElementById(selectedElement.id, { price: Number(e.target.value) || 0 })
                                }
                                placeholder="Ex : 12.90"
                              />
                            </div>
                          ) : (
                            <div>
                              <Label htmlFor={`el-text-${selectedElement.id}`}>Texte</Label>
                              <Input
                                id={`el-text-${selectedElement.id}`}
                                type="text"
                                value={selectedElement.text || ''}
                                onChange={(e) => patchElementById(selectedElement.id, { text: e.target.value })}
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor={`el-size-${selectedElement.id}`}>Taille (px)</Label>
                              <Input
                                id={`el-size-${selectedElement.id}`}
                                type="number"
                                min="8"
                                max="200"
                                value={selectedElement.fontSize ?? 24}
                                onChange={(e) =>
                                  patchElementById(selectedElement.id, {
                                    fontSize: Math.min(200, Number(e.target.value) || 24),
                                  })
                                }
                              />
                            </div>
                            {['plain', 'hero', 'divider'].includes(selectedElement.kind) && (
                              <div>
                                <Label htmlFor={`el-color-${selectedElement.id}`}>Couleur</Label>
                                <input
                                  id={`el-color-${selectedElement.id}`}
                                  type="color"
                                  value={selectedElement.color || '#FFFFFF'}
                                  onChange={(e) => patchElementById(selectedElement.id, { color: e.target.value })}
                                  className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                                />
                              </div>
                            )}
                          </div>

                          {['plain', 'hero'].includes(selectedElement.kind || 'plain') && (
                            <div>
                              <Label htmlFor={`el-font-${selectedElement.id}`}>Police</Label>
                              <select
                                id={`el-font-${selectedElement.id}`}
                                value={selectedElement.fontFamily || ''}
                                onChange={(e) =>
                                  patchElementById(selectedElement.id, { fontFamily: e.target.value || undefined })
                                }
                                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                              >
                                {FONT_OPTIONS.map((f) => (
                                  <option key={f.value} value={f.value}>
                                    {f.label}
                                  </option>
                                ))}
                                {libraryFonts.length > 0 && (
                                  <optgroup label="Bibliothèque">
                                    {libraryFonts.map((f) => (
                                      <option key={f.id} value={f.name}>
                                        {f.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>
                          )}

                          {['banner', 'price'].includes(selectedElement.kind) && (
                            <div>
                              <Label>Fond</Label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => patchElementById(selectedElement.id, { dark: false })}
                                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                                    selectedElement.dark === false
                                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                                      : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                                  }`}
                                >
                                  Clair
                                </button>
                                <button
                                  type="button"
                                  onClick={() => patchElementById(selectedElement.id, { dark: true })}
                                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                                    selectedElement.dark !== false
                                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                                      : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                                  }`}
                                >
                                  Sombre
                                </button>
                              </div>
                            </div>
                          )}

                          {(selectedElement.kind || 'plain') === 'price' && (
                            <BadgeTypePicker
                              value={selectedElement.badgeType}
                              dark={selectedElement.dark !== false}
                              onChange={(t) => patchElementById(selectedElement.id, { badgeType: t })}
                            />
                          )}

                          {/* Accent only drives banner elements — hero titles and
                              dividers are styled via the generic Couleur picker. */}
                          {(selectedElement.kind || 'plain') === 'banner' && (
                            <div>
                              <Label htmlFor={`el-accent-${selectedElement.id}`}>Couleur accent</Label>
                              <div className="flex items-center gap-2">
                                <input
                                  id={`el-accent-${selectedElement.id}`}
                                  type="color"
                                  value={selectedElement.accent || '#FF5A1F'}
                                  onChange={(e) => patchElementById(selectedElement.id, { accent: e.target.value })}
                                  className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                                />
                                <button
                                  type="button"
                                  onClick={() => patchElementById(selectedElement.id, { accent: undefined })}
                                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400"
                                >
                                  Défaut
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          {/* Aperçu sur fond sombre et avec les mêmes styles que
                              la TV : une icône recolorée en blanc doit se voir
                              telle qu'elle s'affichera, pas en couleurs
                              d'origine sur du blanc. */}
                          {selectedElement.imageUrl ? (
                            <div className="h-24 w-full rounded-lg border border-gray-200 bg-gray-800 p-2 dark:border-gray-700">
                              <ElementVisual el={selectedElement} />
                            </div>
                          ) : null}
                          <label
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-400 ${
                              elUploading ? 'opacity-60' : ''
                            }`}
                          >
                            {elUploading
                              ? 'Upload...'
                              : selectedElement.imageUrl
                                ? 'Changer le fichier'
                                : 'Importer un fichier'}
                            <input
                              ref={elChangeInputRef}
                              type="file"
                              accept="image/*,.svg"
                              className="hidden"
                              onChange={handleElChangeUpload}
                              disabled={elUploading}
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor={`el-w-${selectedElement.id}`}>Largeur (px, max {EL_IMAGE_MAX_PX})</Label>
                              <Input
                                id={`el-w-${selectedElement.id}`}
                                type="number"
                                min="1"
                                max={EL_IMAGE_MAX_PX}
                                value={pctToPxW(selectedElement.w)}
                                onChange={(e) => {
                                  const px = clamp(Number(e.target.value) || 1, 1, EL_IMAGE_MAX_PX)
                                  patchElementById(selectedElement.id, { w: pxToPctW(px) })
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`el-h-${selectedElement.id}`}>Hauteur (px, max {EL_IMAGE_MAX_PX})</Label>
                              <Input
                                id={`el-h-${selectedElement.id}`}
                                type="number"
                                min="1"
                                max={EL_IMAGE_MAX_PX}
                                value={pctToPxH(selectedElement.h)}
                                onChange={(e) => {
                                  const px = clamp(Number(e.target.value) || 1, 1, EL_IMAGE_MAX_PX)
                                  patchElementById(selectedElement.id, { h: pxToPctH(px) })
                                }}
                              />
                            </div>
                          </div>

                          {/* Sans réglage enregistré, un élément dessiné garde
                              son comportement historique : étiré sur toute sa
                              boîte (voir elementVisualStyle). */}
                          <div>
                            <Label>Dans la boîte</Label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {ELEMENT_FITS.map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => patchElementById(selectedElement.id, { fit: f })}
                                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                                    (selectedElement.fit || 'fill') === f
                                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                                      : 'border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400'
                                  }`}
                                >
                                  {ELEMENT_FIT_LABELS[f]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Recoloration : le fichier sert de pochoir, sa
                              couleur d'origine est remplacée par un aplat.
                              Marche sur un SVG comme sur un PNG détouré ; sur
                              une photo à fond plein ça donne un rectangle de
                              couleur, d'où le bouton retour aux couleurs
                              d'origine. */}
                          <div>
                            <Label htmlFor={`el-icolor-${selectedElement.id}`}>Couleur du dessin</Label>
                            <div className="flex items-center gap-2">
                              <input
                                id={`el-icolor-${selectedElement.id}`}
                                type="color"
                                value={selectedElement.color || ICON_DEFAULTS.color}
                                onChange={(e) => patchElementById(selectedElement.id, { color: e.target.value })}
                                className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                              />
                              <button
                                type="button"
                                onClick={() => patchElementById(selectedElement.id, { color: undefined })}
                                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                  selectedElement.color
                                    ? 'border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400'
                                    : 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                                }`}
                              >
                                Couleurs d’origine
                              </button>
                            </div>
                          </div>

                          <div>
                            <Label>Pastille de fond</Label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {ELEMENT_BG_SHAPES.map((sh) => (
                                <button
                                  key={sh}
                                  type="button"
                                  onClick={() => patchElementById(selectedElement.id, { bgShape: sh })}
                                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                                    (selectedElement.bgShape || 'none') === sh
                                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                                      : 'border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400'
                                  }`}
                                >
                                  {ELEMENT_BG_SHAPE_LABELS[sh]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(selectedElement.bgShape || 'none') !== 'none' && (
                            <div>
                              <Label htmlFor={`el-bgcolor-${selectedElement.id}`}>Couleur de la pastille</Label>
                              <input
                                id={`el-bgcolor-${selectedElement.id}`}
                                type="color"
                                value={selectedElement.bgColor || ICON_DEFAULTS.bgColor}
                                onChange={(e) => patchElementById(selectedElement.id, { bgColor: e.target.value })}
                                className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor={`el-pad-${selectedElement.id}`}>
                                Marge (%, max {EL_PADDING_MAX})
                              </Label>
                              <Input
                                id={`el-pad-${selectedElement.id}`}
                                type="number"
                                min="0"
                                max={EL_PADDING_MAX}
                                value={selectedElement.padding ?? 0}
                                onChange={(e) =>
                                  patchElementById(selectedElement.id, {
                                    padding: clamp(Number(e.target.value) || 0, 0, EL_PADDING_MAX),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor={`el-op-${selectedElement.id}`}>Opacité (%)</Label>
                              <Input
                                id={`el-op-${selectedElement.id}`}
                                type="number"
                                min="0"
                                max="100"
                                value={Math.round((selectedElement.opacity ?? 1) * 100)}
                                onChange={(e) =>
                                  patchElementById(selectedElement.id, {
                                    opacity: clamp(Number(e.target.value) || 0, 0, 100) / 100,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`el-z-${selectedElement.id}`}>Calque (z-index)</Label>
                          <Input
                            id={`el-z-${selectedElement.id}`}
                            type="number"
                            value={selectedElement.zIndex ?? 10}
                            onChange={(e) =>
                              patchElementById(selectedElement.id, { zIndex: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`el-rot-${selectedElement.id}`}>Rotation (°)</Label>
                          <Input
                            id={`el-rot-${selectedElement.id}`}
                            type="number"
                            min="-180"
                            max="180"
                            value={selectedElement.rotation ?? 0}
                            onChange={(e) =>
                              patchElementById(selectedElement.id, { rotation: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => sendElementToFront(selectedElement.id)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                        >
                          Premier plan
                        </button>
                        <button
                          type="button"
                          onClick={() => sendElementToBack(selectedElement.id)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                        >
                          Arrière-plan
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteElement(selectedElement.id)}
                        className="w-full rounded-lg border border-error-200 px-3 py-2 text-sm font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                      >
                        Supprimer cet élément
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {panelTab === 'library' && (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                <p className="text-xs text-gray-400">
                  Images/textures de la Bibliothèque — un clic les ajoute comme élément libre sur le canvas.
                </p>

                {libraryCategories.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Bibliothèque vide. Ajoutez des catégories depuis la page Bibliothèque.
                  </p>
                ) : libraryCatId == null ? (
                  <div className="space-y-1.5">
                    {libraryCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setLibraryCatId(cat.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                      >
                        <span>{cat.name}</span>
                        <span className="text-xs text-gray-400">{(cat.assets || []).length}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  (() => {
                    const cat = libraryCategories.find((c) => c.id === libraryCatId)
                    const assets = cat?.assets || []
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setLibraryCatId(null)}
                          className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400"
                        >
                          <ChevronLeftIcon className="size-4" />
                          {cat?.name}
                        </button>
                        {assets.length === 0 ? (
                          <p className="text-sm text-gray-400">Aucun élément dans cette catégorie.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5">
                            {assets.map((asset) => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => addElementFromLibraryAsset(asset)}
                                title="Ajouter au canvas"
                                className="aspect-square overflow-hidden rounded-md border border-gray-200 bg-white transition-colors hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900"
                              >
                                <img src={asset.url} alt={asset.name || ''} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()
                )}
              </div>
            )}
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
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    !previewMode
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Wireframe
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    previewMode
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Aperçu
                </button>
              </div>
              <Badge size="sm" color="light">
                {layout.zones?.length ?? 0} zone{(layout.zones?.length ?? 0) > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>

          <div className="p-6">
            <div
              ref={canvasRef}
              onPointerDown={(e) => {
                if (e.target === canvasRef.current) setSelectedId(null)
              }}
              className="relative w-full select-none overflow-hidden border-2 border-gray-300 bg-gray-900 shadow-xl dark:border-gray-700"
              style={{
                aspectRatio: '16 / 9',
                ...(screenBg ? backgroundCss(screenBg) : {}),
              }}
            >
              {screenBg?.pattern === 'torn-paper' && (
                <ZoneSeamMarkers
                  zones={layout.zones || []}
                  color={screenBg.patternColor || '#FFFFFF'}
                  seamsEnabled={screenBg.seamsEnabled}
                  hiddenSeams={screenBg.hiddenSeams}
                />
              )}
              {(layout.zones || []).map((zone) => {
                const active = gesture?.zoneId === zone.id
                const rect = active ? gesture.rect : zone
                const clash = active
                  ? (layout.zones || []).some((z) => z.id !== zone.id && overlaps(rect, z))
                  : false
                const isFree = isFreeZone(zone)
                const isGrid = !isFree && zone.zoneType === 'grid'
                const isList = !isFree && (zone.zoneType === 'list' || zone.zoneType === 'carousel')
                const rows = zone.gridConfig?.rows || 1
                const cols = zone.gridConfig?.cols || 1

                // Sub-zone (T9) — the product container's own box within the
                // zone, live-updated from subzoneDragRect while its handles are
                // being dragged so the content repositions in real time.
                const isEditingSubzone = subzoneEditId === zone.id
                const activeContentBox =
                  (isEditingSubzone && subzoneDragRect) || zone.backgroundStyle?.contentBox || DEFAULT_CONTENT_BOX
                const contentBoxStyle = {
                  left: `${activeContentBox.x}%`,
                  top: `${activeContentBox.y}%`,
                  width: `${activeContentBox.w}%`,
                  height: `${activeContentBox.h}%`,
                }

                const zoneEmpty =
                  CONTENT_ZONE_TYPES.includes(zone.zoneType) && (zone.items?.length ?? 0) === 0
                const zoneOverflow =
                  !isFree &&
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

                // T7.4 — live style preview from the zone's backgroundStyle JSON
                const zStyle = zone.backgroundStyle || {}
                const zAccent = zStyle.accent || STYLE_DEFAULTS.accent
                // zone without explicit background is transparent -> screen bg shows through
                const zBg = zStyle.bgImage ? undefined : zStyle.bg
                const zText = zStyle.text || (zStyle.dark ? STYLE_DEFAULTS.textDark : STYLE_DEFAULTS.textLight)
                const zFontSize = zStyle.fontSize || null
                const zShowPrice = zoneShowsPrice(zone)

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

                return previewMode ? (
                  <div
                    key={zone.id}
                    className="absolute flex flex-col overflow-hidden rounded-md border border-gray-700 p-1"
                    style={{
                      left: pct(zone.x),
                      top: pct(zone.y),
                      width: pct(zone.w),
                      height: pct(zone.h),
                      backgroundColor: zStyle.bgImage ? undefined : zBg,
                      color: zText,
                      fontSize: zFontSize || 12,
                    }}
                  >
                    {zStyle.bgImage ? (
                      <img
                        src={zStyle.bgImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                      {(zone.zoneType === 'grid' || zone.zoneType === 'list' || zone.zoneType === 'menu' || zone.zoneType === 'carousel') &&
                      zone.name ? (
                        <span
                          className="mb-0.5 truncate font-bold uppercase tracking-wide"
                          style={{ color: zAccent, fontSize: '0.9em' }}
                        >
                          {zone.name}
                        </span>
                      ) : null}
                      <StyledZoneContent zone={zone} accent={zAccent} text={zText} />
                    </div>
                    <ZoneBadgePreview config={zone.badgeConfig} accent={zAccent} />
                  </div>
                ) : (
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
                        : 'border-gray-700'
                    } ${isAdmin ? 'cursor-move touch-none' : ''} ${
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
                      backgroundColor: clash ? undefined : zBg,
                      color: zText,
                      fontSize: zFontSize || 12,
                    }}
                  >
                    <div className="flex flex-none items-start justify-between gap-1">
                      <p
                        className="truncate font-semibold"
                        style={{ color: zAccent }}
                      >
                        {zone.name || `Zone #${zone.id}`}
                      </p>
                      <div className="flex flex-none items-center gap-1">
                        <span className="rounded px-1 py-px text-[9px] font-medium uppercase text-gray-600 dark:text-gray-300" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                          {ZONE_TYPE_LABELS[zone.zoneType] || zone.zoneType}
                        </span>
                        {zoneWarnLabel && (
                          <span className="rounded bg-warning-500/20 px-1 py-px text-[9px] font-medium text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
                            {zoneWarnLabel}
                          </span>
                        )}
                        {isAdmin && (isGrid || isList) && selectedId === zone.id && (
                          <>
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSubzoneEditId((cur) => (cur === zone.id ? null : zone.id))
                              }}
                              title="Personnaliser la zone de contenu"
                              className={`flex size-4 flex-none items-center justify-center rounded ${
                                isEditingSubzone
                                  ? 'bg-brand-500 text-white'
                                  : 'bg-black/15 text-gray-700 hover:bg-brand-500/30 hover:text-brand-700 dark:text-gray-200'
                              }`}
                            >
                              <PencilIcon className="size-2.5" />
                            </button>
                            {zone.backgroundStyle?.contentBox && (
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  resetSubzoneBox(zone)
                                }}
                                title="Réinitialiser la zone de contenu"
                                className="flex size-4 flex-none items-center justify-center rounded bg-black/15 text-gray-700 hover:bg-error-500/30 hover:text-error-700 dark:text-gray-200"
                              >
                                <TrashBinIcon className="size-2.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <ZoneBadgePreview config={zone.badgeConfig} accent={zAccent} />

                    <div
                      ref={isEditingSubzone ? subzoneAreaRef : undefined}
                      className="relative min-h-0 flex-1"
                    >
                    <div className="absolute flex flex-col" style={contentBoxStyle}>
                    {isFree ? (
                      <FreeItemsLayer
                        zone={zone}
                        isAdmin={isAdmin}
                        accent={zAccent}
                        text={zText}
                        showPrice={zShowPrice}
                        onCommit={(items) => putZoneItems(zone, items)}
                        onRemove={(itemId) => removeZoneItem(zone.id, itemId)}
                        onEditCard={(zi) => setCardDesigner({ zoneId: zone.id, itemId: zi.itemId })}
                      />
                    ) : (isGrid || isList) && (zone.items?.length ?? 0) > 0 ? (
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
                                    setZoneDrag(true)
                                    e.dataTransfer.setData(
                                      'text/plain',
                                      JSON.stringify({ source: 'zone', type: 'item', id: item.itemId, zoneId: zone.id })
                                    )
                                    e.dataTransfer.effectAllowed = 'move'
                                  }}
                                  onDragEnd={() => setZoneDrag(false)}
                                  {...slotDnD(key, { targetRow: r, targetCol: c }, false)}
                                  title={item.item?.name}
                                  className={`group relative min-w-0 rounded border text-[9px] font-medium leading-tight ${
                                    slotActive(key)
                                      ? 'border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-400'
                                      : 'border-gray-300 dark:border-gray-600'
                                  } ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                  style={
                                    slotActive(key)
                                      ? undefined
                                      : { backgroundColor: zStyle.dark ? '#434343' : '#F3F4F6', color: zStyle.dark ? '#FFFFFF' : '#374151' }
                                  }
                                >
                                  <CardTemplatePreview
                                    template={
                                      hasOwnCardLayout(zone, item.itemId) ? 'custom' : zone.cardTemplate
                                    }
                                    name={item.item?.name}
                                    accent={zAccent}
                                    text={zText}
                                    showPrice={zShowPrice}
                                    price={item.item?.price}
                                    layout={
                                      zone.cardTemplate === 'custom' || hasOwnCardLayout(zone, item.itemId)
                                        ? cardLayoutFor(zone, item.itemId)
                                        : null
                                    }
                                  />
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCardDesigner({ zoneId: zone.id, itemId: item.itemId })
                                      }}
                                      title={
                                        hasOwnCardLayout(zone, item.itemId)
                                          ? 'Carte personnalisée pour ce produit'
                                          : 'Personnaliser la carte de ce produit'
                                      }
                                      className={`absolute -left-1 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-brand-500 text-white shadow transition-opacity hover:bg-brand-600 ${
                                        hasOwnCardLayout(zone, item.itemId)
                                          ? 'opacity-100'
                                          : 'opacity-0 group-hover:opacity-100'
                                      }`}
                                    >
                                      <PencilIcon className="size-2" />
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeZoneItem(zone.id, item.itemId)
                                      }}
                                      title="Retirer le produit"
                                      className="absolute -right-1 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold leading-none text-white opacity-0 shadow transition-opacity hover:bg-error-600 group-hover:opacity-100"
                                    >
                                      ×
                                    </button>
                                  )}
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
                                  setZoneDrag(true)
                                  e.dataTransfer.setData(
                                    'text/plain',
                                    JSON.stringify({ source: 'zone', type: 'item', id: item.itemId, zoneId: zone.id })
                                  )
                                  e.dataTransfer.effectAllowed = 'move'
                                }}
                                onDragEnd={() => setZoneDrag(false)}
                                {...slotDnD(key, { targetIndex: item.index }, true)}
                                title={item.item?.name}
                                className={`group relative min-w-0 rounded border text-[9px] font-medium ${
                                  slotActive(key)
                                    ? 'border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-400'
                                    : 'border-gray-300 dark:border-gray-600'
                                } ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                style={
                                  slotActive(key)
                                    ? undefined
                                    : { backgroundColor: zStyle.dark ? '#434343' : '#F3F4F6', color: zStyle.dark ? '#FFFFFF' : '#374151' }
                                }
                              >
                                <div className="h-5 min-w-0">
                                  <CardTemplatePreview
                                    template={
                                      hasOwnCardLayout(zone, item.itemId) ? 'custom' : zone.cardTemplate
                                    }
                                    name={item.item?.name}
                                    accent={zAccent}
                                    text={zText}
                                    showPrice={zShowPrice}
                                    price={item.item?.price}
                                    layout={
                                      zone.cardTemplate === 'custom' || hasOwnCardLayout(zone, item.itemId)
                                        ? cardLayoutFor(zone, item.itemId)
                                        : null
                                    }
                                  />
                                </div>
                                {isAdmin && (
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty ?? ''}
                                    placeholder="—"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const raw = e.target.value
                                      const qty = raw === '' ? null : Math.max(1, parseInt(raw, 10) || 1)
                                      const items = zone.items.map((it) => ({
                                        itemId: it.itemId,
                                        row: it.row,
                                        col: it.col,
                                        index: it.index,
                                        order: it.order,
                                        qty: it.itemId === item.itemId ? qty : it.qty,
                                      }))
                                      putZoneItems(zone, items)
                                    }}
                                    className="absolute -left-1 -top-1 z-10 h-4 w-8 rounded border border-gray-400 bg-white text-[8px] text-gray-800 dark:bg-gray-800 dark:text-white/90"
                                  />
                                )}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setCardDesigner({ zoneId: zone.id, itemId: item.itemId })
                                    }}
                                    title={
                                      hasOwnCardLayout(zone, item.itemId)
                                        ? 'Carte personnalisée pour ce produit'
                                        : 'Personnaliser la carte de ce produit'
                                    }
                                    className={`absolute -right-6 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-brand-500 text-white shadow transition-opacity hover:bg-brand-600 ${
                                      hasOwnCardLayout(zone, item.itemId)
                                        ? 'opacity-100'
                                        : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                  >
                                    <PencilIcon className="size-2" />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeZoneItem(zone.id, item.itemId)
                                    }}
                                    title="Retirer le produit"
                                    className="absolute -right-1 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold leading-none text-white opacity-0 shadow transition-opacity hover:bg-error-600 group-hover:opacity-100"
                                  >
                                    ×
                                  </button>
                                )}
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
                    </div>

                    {isAdmin && isEditingSubzone && (
                      <div
                        onPointerDown={(e) => startSubzoneMove(e, zone)}
                        className="absolute z-20 cursor-move touch-none rounded-sm ring-2 ring-brand-500/80"
                        style={contentBoxStyle}
                      >
                        {RESIZE_HANDLES.map(({ dir, cls }) => (
                          <span
                            key={dir}
                            onPointerDown={(e) => startSubzoneResize(e, zone, dir)}
                            className={`absolute z-20 size-2.5 touch-none rounded-sm border border-white bg-brand-500 ${cls}`}
                          />
                        ))}
                      </div>
                    )}
                    </div>

                    {isAdmin &&
                      RESIZE_HANDLES.map(({ dir, cls }) => (
                        <span
                          key={dir}
                          onPointerDown={(e) => startResize(e, zone, dir)}
                          className={`absolute z-10 size-2.5 touch-none rounded-sm border border-white bg-brand-500 ${cls}`}
                        />
                      ))}
                  </div>
                )
              })}

              {/* T8 — free-floating elements overlay (editor-only, shown in the
                  "Éléments" tab so it doesn't clutter zone editing). Editor z-index
                  is offset by +100 so handles always sit above zone wireframes; the
                  TV renders the raw el.zIndex. */}
              {panelTab === 'elements' &&
                elements.map((el) => {
                  const active = elGesture?.elId === el.id
                  const rect = active && elDragRect ? elDragRect : el
                  return (
                    <div
                      key={el.id}
                      onPointerDown={(e) => isAdmin && startElMove(e, el)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedElementId(el.id)
                      }}
                      className={`absolute outline-2 outline-dashed outline-offset-[7.5px] ${
                        selectedElementId === el.id
                          ? 'outline-brand-500'
                          : 'outline-transparent hover:outline-brand-300'
                      } ${isAdmin ? 'cursor-move touch-none' : ''}`}
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.w}%`,
                        height: `${rect.h}%`,
                        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                        zIndex: 100 + (el.zIndex ?? 10),
                      }}
                    >
                      {el.type === 'text' ? (
                        <div
                          className="flex h-full w-full items-center justify-center overflow-hidden text-center"
                          style={{ color: el.color || '#fff', fontSize: Math.min(el.fontSize || 24, 48) }}
                        >
                          {el.text}
                        </div>
                      ) : el.imageUrl ? (
                        <ElementVisual el={el} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-700/50 text-[10px] text-gray-300">
                          {el.type}
                        </div>
                      )}
                      {isAdmin && (
                        <>
                          {EL_RESIZE_HANDLES.map(({ dir, cls }) => (
                            <span
                              key={dir}
                              onPointerDown={(e) => startElResize(e, el, dir)}
                              className={`absolute z-10 size-2.5 touch-none rounded-sm border border-white bg-brand-500 ${cls}`}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}

              {isAdmin && (
                <div
                  onDragOver={(e) => {
                    if (!zoneDrag) return
                    e.preventDefault()
                    setTrashOver(true)
                  }}
                  onDragLeave={() => setTrashOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setTrashOver(false)
                    let payload = null
                    try {
                      payload = JSON.parse(e.dataTransfer.getData('text/plain'))
                    } catch {
                      return
                    }
                    if (payload?.type === 'item' && payload.source === 'zone') {
                      removeZoneItem(payload.zoneId, payload.id)
                    }
                  }}
                  title="Glissez un produit ici pour le retirer de la zone"
                  className={`absolute bottom-2 right-2 z-20 flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                    trashOver
                      ? 'scale-105 border-error-500 bg-error-500 text-white shadow-lg ring-2 ring-error-500/30'
                      : zoneDrag
                        ? 'border-dashed border-error-400/80 bg-error-500/10 text-error-500'
                        : 'pointer-events-none opacity-0'
                  }`}
                >
                  <TrashBinIcon className="size-4" />
                  Retirer
                </div>
              )}

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

      <Modal isOpen={bgOpen} onClose={() => setBgOpen(false)} className="max-w-lg p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Fond de l’écran
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Image plein écran derrière toutes les zones, avec une texture papier déchiré en
          option. Le fond de chaque zone se règle indépendamment (cliquez une zone dans
          l’aperçu).
        </p>

        <div className="space-y-5">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="absolute inset-0" style={backgroundCss(bgForm)} />
            {bgForm?.pattern === 'torn-paper' && (
              <ZoneSeamMarkers
                zones={layout?.zones || []}
                color={bgForm?.patternColor || '#FFFFFF'}
                seamsEnabled={bgForm?.seamsEnabled}
                hiddenSeams={bgForm?.hiddenSeams || []}
                onToggle={(key) =>
                  setBgForm((prev) => {
                    const hidden = prev?.hiddenSeams || []
                    return {
                      ...(prev || BG_DEFAULTS),
                      hiddenSeams: hidden.includes(key)
                        ? hidden.filter((k) => k !== key)
                        : [...hidden, key],
                    }
                  })
                }
              />
            )}
            {(layout?.zones || []).map((z) => {
              const bs = z.backgroundStyle || {}
              const miniBg = bs.bg
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => {
                    setBgOpen(false)
                    setSelectedId(z.id)
                    setPanelTab('style')
                  }}
                  title={`Cliquer pour régler le fond de « ${z.name || `Zone ${z.id}`} »`}
                  className="absolute cursor-pointer overflow-hidden border border-dashed border-brand-400/80 text-left transition-colors hover:border-brand-500 hover:bg-brand-500/10"
                  style={{ left: gpt(z.x), top: gpt(z.y), width: gpt(z.w), height: gpt(z.h), backgroundColor: miniBg || undefined }}
                >
                  {bs.bgImage ? (
                    <img src={bs.bgImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                  ) : null}
                  <span className="absolute right-0 top-0 rounded-bl bg-black/50 px-1 text-[9px] font-medium leading-tight text-white">
                    {z.name || `Zone ${z.id}`}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="-mt-3 text-xs text-gray-400 dark:text-gray-500">
            Cliquez une zone pour régler son fond (couleur, image, texte). Une zone sans
            fond reste transparente : on voit le fond d’écran derrière.
          </p>

          <div>
            <Label>Image de fond</Label>
            <div className="flex items-center gap-3">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-brand-400 ${
                  bgUploading ? 'opacity-60' : ''
                }`}
              >
                {bgUploading ? 'Upload...' : 'Importer une image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={bgUploading} />
              </label>
              {bgForm?.imageUrl && (
                <button
                  type="button"
                  onClick={() => setBgForm((prev) => ({ ...prev, imageUrl: null }))}
                  className="text-sm font-medium text-error-600 hover:text-error-700 dark:text-error-400"
                >
                  Retirer l’image
                </button>
              )}
            </div>
            {bgForm?.imageUrl && (
              <img
                src={bgForm.imageUrl}
                alt="Aperçu du fond"
                className="mt-2 h-24 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bg-pattern">Texture</Label>
              <select
                id="bg-pattern"
                value={bgForm?.pattern || 'none'}
                onChange={(e) => setBgForm((prev) => ({ ...(prev || BG_DEFAULTS), pattern: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
              >
                {BG_PATTERNS.map((p) => (
                  <option key={p} value={p}>
                    {BG_PATTERN_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            {bgForm?.pattern === 'torn-paper' && (
              <div>
                <Label>Couleur de la déchirure</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgForm?.patternColor || BG_DEFAULTS.patternColor}
                    onChange={(e) => setBgForm((prev) => ({ ...(prev || BG_DEFAULTS), patternColor: e.target.value }))}
                    className="size-9 cursor-pointer rounded border border-gray-300 bg-transparent p-0.5 dark:border-gray-700"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{bgForm?.patternColor || BG_DEFAULTS.patternColor}</span>
                </div>
              </div>
            )}
          </div>

          {bgForm?.pattern === 'torn-paper' && (
            <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Lignes papier déchiré</Label>
                  <p className="text-xs text-gray-400">Jointures entre zones adjacentes</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBgForm((prev) => ({ ...(prev || BG_DEFAULTS), seamsEnabled: prev?.seamsEnabled !== false ? false : true }))
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${bgForm?.seamsEnabled !== false ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  title={bgForm?.seamsEnabled !== false ? 'Masquer toutes les lignes' : 'Afficher toutes les lignes'}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${bgForm?.seamsEnabled !== false ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </button>
              </div>
              {(() => {
                const { v, h } = computeSeamsAdmin(layout?.zones || [])
                const all = [...v, ...h]
                if (all.length === 0)
                  return (
                    <p className="text-xs text-gray-400">
                      Aucune zone adjacente : les lignes apparaîtront dès que deux zones se toucheront.
                    </p>
                  )
                const hidden = bgForm?.hiddenSeams || []
                return (
                  <ul className="space-y-1.5">
                    {all.map((s) => {
                      const isHidden = hidden.includes(s.key)
                      return (
                        <li key={s.key} className="flex items-center justify-between gap-2">
                          <span className={`text-xs ${isHidden ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-white/80'}`}>
                            {seamLabel(s)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setBgForm((prev) => {
                                const hid = prev?.hiddenSeams || []
                                return {
                                  ...(prev || BG_DEFAULTS),
                                  hiddenSeams: isHidden ? hid.filter((k) => k !== s.key) : [...hid, s.key],
                                }
                              })
                            }
                            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isHidden ? 'bg-gray-300 dark:bg-gray-600' : 'bg-brand-600'}`}
                            title={isHidden ? 'Afficher la ligne' : 'Masquer la ligne'}
                          >
                            <span
                              className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${isHidden ? 'left-0.5' : 'left-[18px]'}`}
                            />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )
              })()}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {screenBg ? (
            <Button type="button" variant="outline" onClick={removeBackground} disabled={bgSaving}>
              Retirer le fond
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setBgOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={saveBackground} disabled={bgSaving}>
              {bgSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>

      {designerZone && (
        <CardDesigner
          open
          zone={designerZone}
          item={designerItem}
          layout={cardLayoutFor(designerZone, cardDesigner?.itemId ?? null)}
          fonts={libraryFonts}
          images={libraryImages}
          onUploadImage={uploadCardImage}
          onSave={saveCardLayout}
          onCopyTo={copyCardLayoutTo}
          onApplyToZone={cardDesigner?.itemId != null ? applyCardLayoutToZone : null}
          zones={(layout?.zones || []).filter((z) => z.id !== designerZone.id)}
          saving={cardSaving}
          error={cardError}
          onClearOverride={
            cardDesigner?.itemId != null && hasOwnCardLayout(designerZone, cardDesigner.itemId)
              ? clearCardOverride
              : null
          }
          onClose={() => {
            setCardError('')
            setCardDesigner(null)
          }}
        />
      )}
    </div>
  )
}

export default ScreenLayoutCanvas
