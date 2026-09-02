// Static lookup tables for the screen-layout canvas: zone/card/element
// vocabularies, their French labels, style defaults and the layout presets.
// Extracted verbatim from ScreenLayoutCanvas.jsx — values unchanged.

export const GRID = 12
export const REQUIRES_GRID = ['grid', 'list', 'carousel']
export const CONTENT_ZONE_TYPES = ['menu', 'grid', 'list', 'carousel']

// Sub-zone (T9): the product grid/list container's own position+size inside
// its zone, as % of the space left under the zone's header — independent of
// the zone's own box. Undefined/null on a zone's backgroundStyle means "fill
// that whole space", matching the layout every zone had before this control
// existed, so old zones render unchanged.
export const DEFAULT_CONTENT_BOX = { x: 0, y: 0, w: 100, h: 100 }
export const CONTENT_BOX_MIN = 10

// Free elements (T8) are stored as % of the 1920x1080 TV design canvas — see
// frontend-tv/src/components/layout/FreeElementsLayer.jsx. Image elements are
// edited in px in this admin UI, so convert both ways against that canvas.
export const EL_DESIGN_W = 1920
export const EL_DESIGN_H = 1080
export const EL_IMAGE_MAX_PX = 1000
export const pxToPctW = (px) => (px / EL_DESIGN_W) * 100
export const pxToPctH = (px) => (px / EL_DESIGN_H) * 100
export const pctToPxW = (pct) => Math.round((pct / 100) * EL_DESIGN_W)
export const pctToPxH = (pct) => Math.round((pct / 100) * EL_DESIGN_H)

export const ZONE_TYPE_LABELS = {
  menu: 'Menu',
  grid: 'Grille',
  list: 'Liste',
  carousel: 'Carrousel',
  banner: 'Bannière',
  hero: 'Héro',
  highlight: 'Mise en avant',
}

export const ZONE_TYPE_COLORS = {
  menu: 'info',
  grid: 'primary',
  list: 'success',
  carousel: 'light',
  banner: 'info',
  hero: 'primary',
  highlight: 'success',
}

export const CARD_TEMPLATES = ['default', 'compact', 'large', 'minimal', 'media', 'icon-label', 'text-only', 'image-title-desc-price']
export const CARD_TEMPLATE_LABELS = {
  default: 'Par défaut',
  compact: 'Compact',
  large: 'Grand',
  minimal: 'Minimal',
  media: 'Média',
  'icon-label': 'Icône + libellé',
  'text-only': 'Texte seul',
  'image-title-desc-price': 'Image + détails',
}

// T8b — free element "kind" presets pour les textes (Éléments tab)
export const ELEMENT_KINDS = ['plain', 'banner', 'hero', 'divider', 'price']
export const ELEMENT_KIND_LABELS = {
  plain: 'Texte simple',
  banner: 'Bannière catégorie',
  hero: 'Titre héro',
  divider: 'Séparateur',
  price: 'Badge prix',
}

// Self-hosted families only (frontend-tv/src/fonts.css) — never a live Google
// Fonts URL, so a TV that boots offline still has a font to fall back on.
// Empty value = no override, uses the kind's own default (font-menu-header).
export const FONT_OPTIONS = [
  { value: '', label: 'Par défaut' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Roboto Flex', label: 'Roboto Flex' },
]

// Les deux designs de badge prix (frontend-tv/src/theme/designTokens.js).
// Indépendant du couple sombre/clair : 2 types x 2 fonds = 4 rendus.
export const BADGE_TYPES = ['type1', 'type2']
export const BADGE_TYPE_LABELS = {
  type1: 'Type 1 — sticker',
  type2: 'Type 2 — ticket déchiré',
}

// T7.3 — zone badge/label config (plain JSON on the zone)
export const BADGE_STYLES = ['torn-paper', 'ribbon', 'circle-stamp']
export const BADGE_STYLE_LABELS = {
  'torn-paper': 'Papier déchiré',
  ribbon: 'Ruban',
  'circle-stamp': 'Cachet rond',
}
export const BADGE_POSITIONS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']
export const BADGE_POSITION_LABELS = {
  'top-left': 'Haut gauche',
  'top-center': 'Haut centre',
  'top-right': 'Haut droite',
  'bottom-left': 'Bas gauche',
  'bottom-center': 'Bas centre',
  'bottom-right': 'Bas droite',
}

// T7.4 — zone style overrides (backgroundStyle JSON on the zone)
export const FONT_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 24, 28]
export const STYLE_DEFAULTS = {
  bgDark: '#121212',
  bgLight: '#F5F3EF',
  textDark: '#FFFFFF',
  textLight: '#1A1A1A',
  accent: '#FF5A1F',
}

// T7.6 — screen-level background (stored in layout.settings.background)
export const BG_PATTERNS = ['none', 'torn-paper']
export const BG_PATTERN_LABELS = {
  none: 'Aucun',
  'torn-paper': 'Papier déchiré (entre zones)',
}
export const BG_DEFAULTS = {
  type: 'image',
  dark: '#121212',
  light: '#F5F3EF',
  angle: 0,
  pattern: 'none',
  patternColor: '#FFFFFF',
  seamsEnabled: true,
  hiddenSeams: [],
}

export const TYPE_SWATCH = {
  menu: 'bg-blue-light-500',
  grid: 'bg-brand-500',
  list: 'bg-success-500',
  carousel: 'bg-gray-400',
  banner: 'bg-blue-light-500',
  hero: 'bg-brand-500',
  highlight: 'bg-success-500',
}

export const PRESETS = [
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

export const RESIZE_HANDLES = [
  { dir: 'nw', cls: '-left-0.5 -top-0.5 cursor-nwse-resize' },
  { dir: 'ne', cls: '-right-0.5 -top-0.5 cursor-nesw-resize' },
  { dir: 'sw', cls: '-bottom-0.5 -left-0.5 cursor-nesw-resize' },
  { dir: 'se', cls: '-bottom-0.5 -right-0.5 cursor-nwse-resize' },
]

// Free elements: the selection frame floats outline-offset-[7.5px] away from
// the actual element on EACH side (see the "Éléments" overlay below), so the
// frame's own width/height end up exactly element size + 15px total (e.g. a
// 500x400 element gets a ~515x415 frame) instead of touching the image/text
// bounds. Handles are nudged out to sit on that same ring (7.5px offset +
// ~1px half the outline's own stroke + half the handle's own 10px size).
export const EL_RESIZE_HANDLES = [
  { dir: 'nw', cls: '-left-[13.5px] -top-[13.5px] cursor-nwse-resize' },
  { dir: 'ne', cls: '-right-[13.5px] -top-[13.5px] cursor-nesw-resize' },
  { dir: 'sw', cls: '-bottom-[13.5px] -left-[13.5px] cursor-nesw-resize' },
  { dir: 'se', cls: '-bottom-[13.5px] -right-[13.5px] cursor-nwse-resize' },
]

export const BADGE_POS_PX = {
  'top-left': { top: 2, left: 2 },
  'top-center': { top: 2, left: '50%', translateX: true },
  'top-right': { top: 2, right: 2 },
  'bottom-left': { bottom: 2, left: 2 },
  'bottom-center': { bottom: 2, left: '50%', translateX: true },
  'bottom-right': { bottom: 2, right: 2 },
}
