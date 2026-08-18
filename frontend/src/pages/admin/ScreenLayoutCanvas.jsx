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

const CARD_TEMPLATES = ['default', 'compact', 'large', 'minimal', 'media', 'icon-label', 'text-only', 'image-title-desc-price']
const CARD_TEMPLATE_LABELS = {
  default: 'Par défaut',
  compact: 'Compact',
  large: 'Grand',
  minimal: 'Minimal',
  media: 'Média',
  'icon-label': 'Icône + libellé',
  'text-only': 'Texte seul',
  'image-title-desc-price': 'Image + détails',
}

// T7.3 — zone badge/label config (plain JSON on the zone)
const BADGE_STYLES = ['torn-paper', 'ribbon', 'circle-stamp']
const BADGE_STYLE_LABELS = {
  'torn-paper': 'Papier déchiré',
  ribbon: 'Ruban',
  'circle-stamp': 'Cachet rond',
}
const BADGE_POSITIONS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']
const BADGE_POSITION_LABELS = {
  'top-left': 'Haut gauche',
  'top-center': 'Haut centre',
  'top-right': 'Haut droite',
  'bottom-left': 'Bas gauche',
  'bottom-center': 'Bas centre',
  'bottom-right': 'Bas droite',
}

// T7.4 — zone style overrides (backgroundStyle JSON on the zone)
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28]
const STYLE_DEFAULTS = {
  bgDark: '#121212',
  bgLight: '#F5F3EF',
  textDark: '#FFFFFF',
  textLight: '#1A1A1A',
  accent: '#FF5A1F',
}

// T7.6 — screen-level background (stored in layout.settings.background)
const BG_PATTERNS = ['none', 'torn-paper']
const BG_PATTERN_LABELS = {
  none: 'Aucun',
  'torn-paper': 'Papier déchiré',
}
const BG_DEFAULTS = {
  type: 'image',
  dark: '#121212',
  light: '#F5F3EF',
  angle: 0,
  pattern: 'none',
  patternColor: '#FFFFFF',
}

// Subtle paper grain overlay (SVG feTurbulence -> monochrome alpha noise)
const PAPER_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0.55 0'/></filter><rect width='140' height='140' filter='url(#n)'/></svg>"
)}")`

// Torn paper band used along the split divider (color-injectable)
function tornStripDataUri(color) {
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='40'><path d='M0 8 L5 13 L10 6 L16 14 L22 5 L28 13 L34 7 L40 14 L46 6 L52 13 L57 8 L63 13 L64 13 L64 27 L58 33 L52 26 L46 34 L40 27 L34 33 L28 26 L22 34 L16 27 L10 33 L5 26 L0 31 Z' fill='${color}'/></svg>`
  )}")`
}

const gpt = (g) => `${(g * 100) / 12}%`

function backgroundCss(bg) {
  if (!bg) return null
  if (bg.type === 'image' && bg.imageUrl) {
    return {
      backgroundImage: `url("${bg.imageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  if (bg.type === 'split') {
    const dark = bg.dark || BG_DEFAULTS.dark
    const light = bg.light || BG_DEFAULTS.light
    const angle = Number(bg.angle) || 0
    return {
      backgroundImage: `linear-gradient(${angle + 90}deg, ${dark} 50%, ${light} 50%)`,
    }
  }
  return null
}

// Screen background extras: optional torn-paper texture (grain + jagged divider).
function BackgroundOverlays({ bg }) {
  if (!bg || bg.pattern !== 'torn-paper') return null
  const color = bg.patternColor || BG_DEFAULTS.patternColor
  const isSplit = bg.type === 'split'
  const angle = Number(bg.angle) || 0
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: PAPER_GRAIN, backgroundRepeat: 'repeat', opacity: 0.14 }}
      />
      {isSplit && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={{
            width: '300%',
            height: 40,
            transform: `translate(-50%, -50%) rotate(${angle - 90}deg)`,
            transformOrigin: 'center',
            backgroundImage: tornStripDataUri(color),
            backgroundRepeat: 'repeat-x',
            backgroundSize: '64px 40px',
            opacity: 0.9,
          }}
        />
      )}
    </>
  )
}

// Compact live badge preview rendered inside the canvas zone boxes
const TORN_CLIP =
  'polygon(0% 0%, 2.4% 7%, 4.6% 1.5%, 8% 9%, 10.5% 2%, 14% 8%, 16.8% 0.5%, 20% 7%, 23% 2.5%, 26.5% 9.5%, 29% 1.5%, 32.5% 7.5%, 35% 0%, 100% 0%, 100% 100%, 0% 100%)'
const BADGE_POS_PX = {
  'top-left': { top: 2, left: 2 },
  'top-center': { top: 2, left: '50%', translateX: true },
  'top-right': { top: 2, right: 2 },
  'bottom-left': { bottom: 2, left: 2 },
  'bottom-center': { bottom: 2, left: '50%', translateX: true },
  'bottom-right': { bottom: 2, right: 2 },
}

function ZoneBadgePreview({ config, accent }) {
  if (!config) return null
  const style = BADGE_STYLES.includes(config.style) ? config.style : 'torn-paper'
  const pos = BADGE_POS_PX[config.position] || BADGE_POS_PX['top-right']
  const transform = (pos.translateX ? 'translateX(-50%) ' : '') + (style === 'circle-stamp' ? 'rotate(-6deg)' : style === 'torn-paper' ? 'rotate(-1.5deg)' : '')
  const accentColor = accent || STYLE_DEFAULTS.accent
  const label =
    config.text ||
    (config.price != null ? `${Number(config.price).toFixed(2).replace('.', ',')}€` : '')
  const common = {
    position: 'absolute',
    zIndex: 20,
    ...pos,
    transform: transform || undefined,
  }
  if (style === 'circle-stamp') {
    return (
      <span
        style={{
          ...common,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 9999,
          border: `2px dashed ${accentColor}`,
          background: '#FFFFFF',
          color: accentColor,
          fontSize: 6,
          fontWeight: 700,
          textAlign: 'center',
          textTransform: 'uppercase',
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
    )
  }
  if (style === 'ribbon') {
    return (
      <span
        style={{
          ...common,
          background: accentColor,
          color: '#FFFFFF',
          fontSize: 6,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '2px 6px',
          transform: `skewX(-10deg)`,
        }}
      >
        <span style={{ display: 'inline-block', transform: 'skewX(10deg)' }}>{label}</span>
      </span>
    )
  }
  return (
    <span
      style={{
        ...common,
        background: '#FFFFFF',
        color: '#0D0D0D',
        fontSize: 6,
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '2px 5px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        clipPath: TORN_CLIP,
      }}
    >
      {label}
    </span>
  )
}

// T7.5 — mini card-template mockup shown in canvas slots (wireframe + styled)
function CardTemplatePreview({ template, name, accent, text }) {
  const t = CARD_TEMPLATES.includes(template) ? template : 'default'
  const a = accent || STYLE_DEFAULTS.accent
  // open templates (transparent bg) take the zone text color so they flip with
  // the fond (→.text-menu-text). Templates with an inner light chip keep the
  // accent name so it stays readable on the white chip.
  const open = ['compact', 'minimal', 'icon-label', 'text-only'].includes(t)
  const nameColor = open && text ? text : a
  const imgBlock = <div className="min-h-0 flex-1 bg-gray-400/60" />

  if (t === 'compact') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden">
        <div className="size-4 flex-none rounded bg-white/85 shadow-sm" />
        <span className="max-w-full truncate text-[8px] font-semibold uppercase leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
      </div>
    )
  }
  if (t === 'large') {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white/75 shadow-sm">
        {imgBlock}
        <div className="p-0.5">
          <span className="block truncate text-[8px] font-semibold leading-tight" style={{ color: a }}>
            {name}
          </span>
        </div>
      </div>
    )
  }
  if (t === 'minimal') {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden">
        <span className="truncate text-[8px] font-semibold uppercase leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
        <div className="h-0.5 w-3/4 rounded bg-white/40" />
      </div>
    )
  }
  if (t === 'media') {
    return (
      <div className="flex h-full w-full items-center gap-1 overflow-hidden rounded bg-white/75 shadow-sm">
        <div className="h-full w-1/4 flex-none bg-gray-400/60" />
        <span className="min-w-0 flex-1 truncate text-[8px] font-semibold leading-tight" style={{ color: a }}>
          {name}
        </span>
      </div>
    )
  }
  if (t === 'icon-label') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden">
        <div className="size-4 flex-none rounded-full bg-white/85 shadow-sm" />
        <span className="max-w-full truncate text-center text-[8px] font-semibold uppercase leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
      </div>
    )
  }
  if (t === 'text-only') {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden px-0.5">
        <span className="truncate text-[8px] font-bold uppercase leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
        <div className="h-0.5 w-full rounded bg-white/30" />
        <div className="h-0.5 w-2/3 rounded bg-white/20" />
      </div>
    )
  }
  if (t === 'image-title-desc-price') {
    return (
      <div className="flex h-full w-full items-center gap-1 overflow-hidden rounded bg-white/75 px-0.5 shadow-sm">
        <div className="size-3.5 flex-none rounded bg-gray-400/60" />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[8px] font-semibold leading-tight" style={{ color: a }}>
            {name}
          </span>
          <div className="mt-0.5 h-0.5 w-full rounded bg-white/40" />
          <div className="mt-0.5 h-0.5 w-2/3 rounded bg-white/30" />
        </div>
      </div>
    )
  }
  // default: small thumb + title + desc line
  return (
    <div className="flex h-full w-full items-center gap-1 overflow-hidden rounded bg-white/75 shadow-sm">
      <div className="size-3.5 flex-none rounded bg-gray-400/60" />
      <div className="min-w-0">
        <span className="block truncate text-[8px] font-semibold leading-tight" style={{ color: a }}>
          {name}
        </span>
        <div className="mt-0.5 h-0.5 w-2/3 rounded bg-white/40" />
      </div>
    </div>
  )
}

// T7.5 — final "styled" content of a zone (used in preview mode)
function StyledZoneContent({ zone, accent, text }) {
  const items = zone.items || []
  const t = zone.cardTemplate || 'default'

  if (zone.zoneType === 'banner' || zone.zoneType === 'hero') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25))' }}>
        {zone.name ? (
          <span className="px-1 text-center font-bold uppercase leading-tight" style={{ color: accent, fontSize: '1.2em' }}>
            {zone.name}
          </span>
        ) : null}
        <div className="h-0.5 w-2/3 rounded bg-white/30" />
      </div>
    )
  }

  if (zone.zoneType === 'grid') {
    const rows = zone.gridConfig?.rows || 1
    const cols = zone.gridConfig?.cols || 1
    return (
      <div className="grid min-h-0 flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          const item = items.find((it) => it.row === r && it.col === c)
          return item ? (
            <div key={i} className="min-h-0 min-w-0 overflow-hidden rounded">
              <CardTemplatePreview template={t} name={item.item?.name} accent={accent} text={text} />
            </div>
          ) : (
            <div key={i} className="min-h-0 min-w-0 rounded border border-current opacity-25" />
          )
        })}
      </div>
    )
  }

  // list / carousel / menu
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
      {items.length === 0 ? (
        <div className="m-auto text-[9px] uppercase tracking-wide opacity-50">Vide</div>
      ) : (
        items.slice(0, 12).map((it) => (
          <div key={it.itemId} className="h-5 flex-none">
            <CardTemplatePreview template={t} name={it.item?.name} accent={accent} text={text} />
          </div>
        ))
      )}
    </div>
  )
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
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState('produits')
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dropZoneId, setDropZoneId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [zoneDrag, setZoneDrag] = useState(false)
  const [trashOver, setTrashOver] = useState(false)

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

  // T7.6 — screen background editor (layout.settings.background)
  const screenBg = layout?.settings?.background || null
  const openBg = () => {
    setBgForm(screenBg ? { ...screenBg } : { ...BG_DEFAULTS })
    setBgOpen(true)
    setError('')
  }
  const saveBackground = async () => {
    if (!layout) return
    setBgSaving(true)
    setError('')
    try {
      const settings = { ...(layout.settings || {}) }
      // Only a real image is a valid screen background (image type);
      // without one the background is simply removed.
      settings.background = bgForm?.imageUrl
        ? {
            type: 'image',
            imageUrl: bgForm.imageUrl,
            pattern: BG_PATTERNS.includes(bgForm.pattern) ? bgForm.pattern : 'none',
            patternColor: bgForm.patternColor || BG_DEFAULTS.patternColor,
          }
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
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white lg:w-72 lg:flex-none dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex border-b border-gray-100 dark:border-gray-800">
              {[
                { key: 'produits', label: 'Produits' },
                { key: 'presets', label: 'Presets' },
                { key: 'zone', label: 'Config' },
                { key: 'style', label: 'Style' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPanelTab(t.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium transition-colors ${
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
                          onClick={() => patchStyle({ dark: false, bg: undefined })}
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
                          onClick={() => patchStyle({ dark: true, bg: undefined })}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            styleCfg.dark
                              ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                              : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                          }`}
                        >
                          Sombre
                        </button>
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
              className="relative w-full select-none overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-900 shadow-xl dark:border-gray-700"
              style={{
                aspectRatio: '16 / 9',
                ...(screenBg ? backgroundCss(screenBg) : {}),
              }}
            >
              <BackgroundOverlays bg={screenBg} />
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

                // T7.4 — live style preview from the zone's backgroundStyle JSON
                const zStyle = zone.backgroundStyle || {}
                const zAccent = zStyle.accent || STYLE_DEFAULTS.accent
                // zone without explicit background is transparent -> screen bg shows through
                const zBg = zStyle.bgImage ? undefined : zStyle.bg
                const zText = zStyle.text || (zStyle.dark ? STYLE_DEFAULTS.textDark : STYLE_DEFAULTS.textLight)
                const zFontSize = zStyle.fontSize || null

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
                      <span className="rounded px-1 py-px text-[9px] font-medium uppercase text-gray-600 dark:text-gray-300" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                        {ZONE_TYPE_LABELS[zone.zoneType] || zone.zoneType}
                      </span>
                      {zoneWarnLabel && (
                        <span className="rounded bg-warning-500/20 px-1 py-px text-[9px] font-medium text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
                          {zoneWarnLabel}
                        </span>
                      )}
                    </div>

                    <ZoneBadgePreview config={zone.badgeConfig} accent={zAccent} />

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
                                    template={zone.cardTemplate}
                                    name={item.item?.name}
                                    accent={zAccent}
                                    text={zText}
                                  />
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
                                    template={zone.cardTemplate}
                                    name={item.item?.name}
                                    accent={zAccent}
                                    text={zText}
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
            <BackgroundOverlays bg={bgForm} />
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
    </div>
  )
}

export default ScreenLayoutCanvas
