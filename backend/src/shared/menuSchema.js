// ⚠️  FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
//
// Original : shared/menu-schema.js
// Regénérer : npm run sync:schema   (format : CommonJS)
//
// Toute modification faite ici sera écrasée à la prochaine synchro.

// ============================================================================
// SCHÉMA DU MENU BOARD — SOURCE UNIQUE DE VÉRITÉ
// ============================================================================
//
// Ce fichier décrit *tout* le modèle de données d'un layout d'écran : le
// vocabulaire (types de zone, gabarits de carte, types de slot...), les
// limites, les valeurs par défaut, et la validation. Backend et frontends
// partagent exactement ces règles.
//
// ⚠️  NE JAMAIS ÉDITER LES COPIES. Ce fichier est l'original ; les copies
//     sont générées par `node scripts/sync-schema.mjs` :
//
//       shared/menu-schema.js   (ICI — le seul qu'on modifie)
//         ├─→ backend/src/shared/menuSchema.cjs     (converti en CommonJS)
//         ├─→ frontend/src/shared/menuSchema.js     (copie)
//         └─→ frontend-tv/src/shared/menuSchema.js  (copie)
//
//     Après chaque modification :  npm run sync:schema  (à la racine)
//     Le test backend `tests/schema-sync.test.js` échoue si une copie a dérivé.
//
// Contraintes d'écriture (le convertisseur CommonJS en dépend) :
//   - uniquement `export const` et `export function` (pas d'`export default`,
//     pas de `export { ... }` en fin de fichier)
//   - aucun `import` : ce fichier ne dépend de rien
// ============================================================================


// ============================================================================
// 1. GÉOMÉTRIE
// ============================================================================

// La maquette de référence : tout est positionné dans ce repère 16:9, puis mis
// à l'échelle de la TV réelle par ScreenRenderer.
const DESIGN_W = 1920
const DESIGN_H = 1080

// Grille globale de l'écran : une zone occupe x/y/w/h cases sur 12x12.
const GRID = 12


// ============================================================================
// 2. VOCABULAIRE
// ============================================================================

const ZONE_TYPES = ['menu', 'grid', 'list', 'carousel', 'banner', 'hero', 'highlight']

const ZONE_TYPE_LABELS = {
  menu: 'Menu',
  grid: 'Grille',
  list: 'Liste',
  carousel: 'Carrousel',
  banner: 'Bannière',
  hero: 'Héro',
  highlight: 'Mise en avant',
}

// Zones qui placent des produits dans une grille interne (rows x cols).
const REQUIRES_GRID_CONFIG = ['grid', 'list', 'carousel']

// Zones censées contenir des produits : une zone de contenu vide bloque la
// publication (voir validatePublishableLayout côté backend).
const CONTENT_ZONE_TYPES = ['menu', 'grid', 'list', 'carousel']

const CARD_TEMPLATES = [
  'default',
  'compact',
  'large',
  'minimal',
  'media',
  'icon-label',
  'text-only',
  'image-title-desc-price',
  'custom',
]

const CARD_TEMPLATE_LABELS = {
  default: 'Par défaut',
  compact: 'Compact',
  large: 'Grand',
  minimal: 'Minimal',
  media: 'Média',
  'icon-label': 'Icône + libellé',
  'text-only': 'Texte seul',
  'image-title-desc-price': 'Image + détails',
  custom: 'Personnalisé',
}

// Un slot = un morceau de la carte, positionné en % de la carte.
const CARD_SLOT_TYPES = ['image', 'name', 'desc', 'price', 'qty', 'zoneBadge', 'text', 'shape', 'asset']

const CARD_SLOT_LABELS = {
  image: 'Photo du produit',
  name: 'Nom du produit',
  desc: 'Description',
  price: 'Badge prix',
  qty: 'Quantité',
  zoneBadge: 'Badge / label',
  text: 'Texte libre',
  shape: 'Forme / trait',
  asset: 'Image libre',
}

// Slots liés au produit : un seul exemplaire par carte (on ne duplique pas la
// photo ou le prix). Texte libre, formes et images libres sont illimités.
const SINGLETON_SLOTS = ['image', 'name', 'desc', 'price', 'qty', 'zoneBadge']

// Slots dont le contenu est du texte : ils partagent les mêmes réglages
// (police, taille, gras, italique, majuscules, alignement).
const TEXT_SLOTS = ['name', 'desc', 'text']

const CARD_ALIGNS = ['left', 'center', 'right']
const CARD_VALIGNS = ['start', 'center', 'end']
const CARD_SHAPES = ['rect', 'line']
const CARD_FITS = ['contain', 'cover']

// À quoi la taille de police d'un slot se rapporte. `fontSize` reste toujours
// exprimée en px du repère de dessin (refW) ; l'unité décide seulement de la
// dimension de la carte à laquelle ce ratio s'applique au rendu :
//   cqw   — % de la LARGEUR de la carte (défaut, comportement d'origine)
//   cqmin — % du PLUS PETIT côté : le texte rétrécit aussi quand la carte
//           s'aplatit, ce que font les vignettes et les icônes+libellé
//   px    — taille fixe, ne suit pas la carte (à réserver aux cas précis)
const FONT_UNITS = ['cqw', 'cqmin', 'px']

// Badge de zone (T7.3) : JSON posé sur la zone, pas de table dédiée.
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

// Les deux designs de badge prix (frontend-tv/src/theme/designTokens.js).
// Indépendant du couple sombre/clair : 2 types x 2 fonds = 4 rendus.
const BADGE_TYPES = ['type1', 'type2']
const BADGE_TYPE_LABELS = {
  type1: 'Type 1 — sticker',
  type2: 'Type 2 — ticket déchiré',
}

// Fond de l'écran (T7.6), stocké dans layout.settings.background.
const BACKGROUND_TYPES = ['image', 'split']
const BG_PATTERNS = ['none', 'torn-paper']
const BG_PATTERN_LABELS = {
  none: 'Aucun',
  'torn-paper': 'Papier déchiré (entre zones)',
}

// Couche décorative libre (T8), stockée dans layout.settings.elements.
const ELEMENT_TYPES = ['image', 'text', 'logo']
const ELEMENT_KINDS = ['plain', 'banner', 'hero', 'divider', 'price']
const ELEMENT_KIND_LABELS = {
  plain: 'Texte simple',
  banner: 'Bannière catégorie',
  hero: 'Titre héro',
  divider: 'Séparateur',
  price: 'Badge prix',
}

// Familles auto-hébergées uniquement (frontend-tv/src/fonts.css) — jamais une
// URL Google Fonts en direct, pour qu'une TV qui démarre hors ligne ait
// toujours une police. Valeur vide = pas de surcharge (police du gabarit).
const FONT_OPTIONS = [
  { value: '', label: 'Par défaut' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Roboto Flex', label: 'Roboto Flex' },
]


// ============================================================================
// 3. LIMITES
// ============================================================================

const CARD_SLOTS_MAX = 40
const CARD_LAYOUTS_MAX = 200
const FONT_SIZE_MIN = 8
const FONT_SIZE_MAX = 128
const FONT_SIZE_MAX_TEXT = 200
const BACKGROUND_ANGLE_MAX = 180
const IMAGE_URL_MAX = 2048
const CONTENT_BOX_MIN = 10
const EL_IMAGE_MAX_PX = 1000

// Couleur : hex (#abc → #aabbccdd), rgb(a)/hsl(a), un mot-clé CSS, ou un jeton
// du thème — var(--menu-accent), var(--menu-text-muted)... Les jetons laissent
// un dessin suivre les couleurs de sa zone au lieu de les figer, ce dont les
// modèles de carte ci-dessous ont besoin.
const HEX_OR_CSS_COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|var\(--[A-Za-z0-9_-]+\)|[a-zA-Z]+)$/


// ============================================================================
// 4. VALEURS PAR DÉFAUT
// ============================================================================

const STYLE_DEFAULTS = {
  bgDark: '#121212',
  bgLight: '#F5F3EF',
  textDark: '#FFFFFF',
  textLight: '#1A1A1A',
  accent: '#FF5A1F',
}

const BG_DEFAULTS = {
  type: 'image',
  dark: '#121212',
  light: '#F5F3EF',
  angle: 0,
  pattern: 'none',
  patternColor: '#FFFFFF',
  seamsEnabled: true,
  hiddenSeams: [],
}

// Sous-zone (T9) : la boîte du conteneur de produits à l'intérieur de la zone,
// en % de l'espace restant sous le titre. Absente = remplit tout cet espace.
const DEFAULT_CONTENT_BOX = { x: 0, y: 0, w: 100, h: 100 }

const FONT_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 24, 28]

// Disposition de départ d'une carte : ce que fait la carte « Par défaut » côté
// TV (photo en haut, nom dessous, badge prix collé au coin haut-droit) plus la
// description sous le nom. Tous les slots partent visibles : un produit sans
// description n'affiche rien à cet endroit de toute façon, alors qu'un slot
// masqué par défaut donne l'impression que la description ne marche pas.
const DEFAULT_CARD_SLOTS = [
  { id: 'image', type: 'image', x: 8, y: 4, w: 84, h: 56, fit: 'contain', zIndex: 1 },
  { id: 'name', type: 'name', x: 4, y: 62, w: 92, h: 20, fontSize: 30, align: 'center', valign: 'center', uppercase: true, bold: true, zIndex: 2 },
  { id: 'desc', type: 'desc', x: 4, y: 82, w: 92, h: 16, fontSize: 18, align: 'center', valign: 'start', zIndex: 2 },
  { id: 'price', type: 'price', x: 62, y: 0, w: 38, h: 22, align: 'right', valign: 'start', zIndex: 3 },
]

// Largeur de référence supposée quand un dessin n'en déclare pas : les tailles
// de police de DEFAULT_CARD_SLOTS sont exprimées dans ce repère.
const CARD_REF_W_FALLBACK = 400

// Repère commun des modèles ci-dessous : leurs tailles de police sont écrites
// dans une carte large de 400px. presetCardLayout() les remet à l'échelle de la
// cellule réelle de la zone.
const PRESET_REF_W = 400

// ---------------------------------------------------------------------------
// MODÈLES DE CARTE
// ---------------------------------------------------------------------------
//
// Une mise en page de carte est une donnée, pas du code : chaque modèle est une
// liste de slots, exactement ce que l'éditeur produit quand on dessine à la
// main. Ajouter un modèle = ajouter une entrée ici, jamais un composant.
//
// Les couleurs utilisent les jetons du thème (var(--menu-accent), ...) pour que
// le même modèle s'adapte à une zone claire comme à une zone sombre.
const CARD_PRESETS = [
  {
    key: 'thumb',
    label: 'Vignette',
    description: 'Photo en grand, nom dessous — les grilles de produits.',
    slots: [
      { id: 'image', type: 'image', x: 4, y: 2, w: 92, h: 68, fit: 'contain', zIndex: 1 },
      {
        id: 'name',
        type: 'name',
        x: 2, y: 72, w: 96, h: 26,
        fontSize: 26, fontUnit: 'cqmin', fontMin: 11, fontMax: 30,
        align: 'center', valign: 'start', uppercase: true, bold: true, lineClamp: 2, zIndex: 2,
      },
    ],
  },
  {
    key: 'icon-label',
    label: 'Icône + libellé',
    description: 'Photo carrée cadrée serré, libellé en capitales dessous.',
    slots: [
      { id: 'image', type: 'image', x: 16, y: 4, w: 68, h: 64, fit: 'cover', zIndex: 1 },
      {
        id: 'name',
        type: 'name',
        x: 2, y: 72, w: 96, h: 24,
        fontSize: 34, fontUnit: 'cqmin', fontMin: 10, fontMax: 32,
        align: 'center', valign: 'start', uppercase: true, bold: true, lineClamp: 2, zIndex: 2,
      },
    ],
  },
  {
    key: 'text-only',
    label: 'Texte seul',
    description: 'Titre en couleur d’accent puis description — sans photo.',
    slots: [
      {
        id: 'name',
        type: 'name',
        x: 3, y: 6, w: 94, h: 26,
        fontSize: 30, color: 'var(--menu-accent)',
        align: 'left', valign: 'center', uppercase: true, bold: true, lineClamp: 2, zIndex: 2,
      },
      {
        id: 'desc',
        type: 'desc',
        x: 3, y: 36, w: 94, h: 58,
        fontSize: 22, align: 'left', valign: 'start', lineClamp: 4, zIndex: 2,
      },
    ],
  },
  {
    key: 'image-details',
    label: 'Image + détails',
    description: 'Photo à gauche, nom / description / prix à droite.',
    slots: [
      { id: 'image', type: 'image', x: 2, y: 8, w: 34, h: 84, fit: 'contain', zIndex: 1 },
      {
        id: 'name',
        type: 'name',
        x: 39, y: 10, w: 59, h: 24,
        fontSize: 30, align: 'left', valign: 'center', uppercase: true, bold: true, lineClamp: 2, zIndex: 2,
      },
      {
        id: 'desc',
        type: 'desc',
        x: 39, y: 36, w: 59, h: 34,
        fontSize: 19, align: 'left', valign: 'start', lineClamp: 3, zIndex: 2,
      },
      { id: 'price', type: 'price', x: 39, y: 72, w: 40, h: 24, fontSize: 30, align: 'left', valign: 'center', zIndex: 3 },
    ],
  },
  {
    key: 'list-row',
    label: 'Ligne de liste',
    description: 'Miniature, nom, quantité, prix à droite, trait de séparation.',
    slots: [
      { id: 'image', type: 'image', x: 1, y: 10, w: 14, h: 76, fit: 'contain', zIndex: 1 },
      {
        id: 'name',
        type: 'name',
        x: 17, y: 22, w: 44, h: 52,
        fontSize: 24, align: 'left', valign: 'center', uppercase: true, bold: true, lineClamp: 2, zIndex: 2,
      },
      { id: 'qty', type: 'qty', x: 63, y: 30, w: 10, h: 36, fontSize: 18, align: 'center', valign: 'center', zIndex: 2 },
      { id: 'price', type: 'price', x: 74, y: 24, w: 25, h: 48, fontSize: 28, align: 'right', valign: 'center', zIndex: 3 },
      {
        id: 'rule',
        type: 'shape',
        shape: 'line',
        x: 0, y: 97, w: 100, h: 2,
        bg: 'var(--menu-text-muted)', opacity: 0.25, zIndex: 0,
      },
    ],
  },
  {
    key: 'full-bleed',
    label: 'Plein cadre',
    description: 'Photo qui remplit la carte, nom et prix posés dessus.',
    slots: [
      { id: 'image', type: 'image', x: 0, y: 0, w: 100, h: 100, fit: 'cover', zIndex: 1 },
      { id: 'veil', type: 'shape', shape: 'rect', x: 0, y: 55, w: 100, h: 45, bg: '#000000', opacity: 0.55, zIndex: 2 },
      {
        id: 'name',
        type: 'name',
        x: 4, y: 62, w: 62, h: 22,
        fontSize: 30, color: '#FFFFFF',
        align: 'left', valign: 'center', uppercase: true, bold: true, lineClamp: 2, zIndex: 3,
      },
      { id: 'price', type: 'price', x: 62, y: 66, w: 36, h: 26, fontSize: 30, align: 'right', valign: 'center', zIndex: 4 },
    ],
  },
]

const CARD_PRESET_KEYS = CARD_PRESETS.map((p) => p.key)

// Le modèle mis à l'échelle de la cellule réelle de la zone : les positions
// sont déjà en %, seules les tailles de police ont besoin du repère.
function presetCardLayout(key, zone) {
  const preset = CARD_PRESETS.find((p) => p.key === key)
  if (!preset) return null
  const { w, h } = cardCellSize(zone)
  const base = Math.max(120, Math.min(w, 1200))
  const k = base / PRESET_REF_W
  return {
    refW: base,
    refH: Math.max(80, Math.round(h * (base / Math.max(1, w)))),
    slots: preset.slots.map((s) =>
      s.fontSize === undefined ? { ...s } : { ...s, fontSize: Math.max(6, Math.round(s.fontSize * k)) }
    ),
  }
}


// ============================================================================
// 5. MODÈLE DE LA CARTE
// ============================================================================

// Taille réelle (en px de la maquette 1920x1080) d'une carte de cette zone :
// une cellule de la grille, ou une ligne de la liste. Sert de repère aux
// tailles de police ET de format à la zone de dessin, pour que l'éditeur
// montre exactement les proportions de l'écran.
function cardCellSize(zone) {
  const zoneW = ((zone?.w || 1) / GRID) * DESIGN_W
  const zoneH = ((zone?.h || 1) / GRID) * DESIGN_H
  if (zone?.zoneType === 'grid') {
    const rows = zone?.gridConfig?.rows || 1
    const cols = zone?.gridConfig?.cols || 1
    return { w: Math.round(zoneW / cols), h: Math.round(zoneH / rows) }
  }
  if (zone?.zoneType === 'list' || zone?.zoneType === 'carousel' || zone?.zoneType === 'menu') {
    const count = Math.max(1, zone?.items?.length || 1)
    return { w: Math.round(zoneW), h: Math.round(zoneH / count) }
  }
  return { w: Math.round(zoneW), h: Math.round(zoneH) }
}

// Dessin de départ, mis à l'échelle de la cellule réelle de la zone.
function defaultCardLayout(zone) {
  const { w, h } = cardCellSize(zone)
  const base = Math.max(120, Math.min(w, 1200))
  return {
    refW: base,
    refH: Math.max(80, Math.round(h * (base / Math.max(1, w)))),
    slots: [
      { id: 'image', type: 'image', x: 8, y: 4, w: 84, h: 56, fit: 'contain', zIndex: 1 },
      {
        id: 'name',
        type: 'name',
        x: 4,
        y: 62,
        w: 92,
        h: 20,
        fontSize: Math.max(10, Math.round(base * 0.075)),
        align: 'center',
        valign: 'center',
        uppercase: true,
        bold: true,
        zIndex: 2,
      },
      {
        id: 'desc',
        type: 'desc',
        x: 4,
        y: 82,
        w: 92,
        h: 16,
        fontSize: Math.max(8, Math.round(base * 0.045)),
        align: 'center',
        valign: 'start',
        zIndex: 2,
      },
      { id: 'price', type: 'price', x: 62, y: 0, w: 38, h: 22, align: 'right', valign: 'start', zIndex: 3 },
    ],
  }
}

// Valeurs par défaut d'un slot fraîchement ajouté depuis la barre d'outils.
function newSlot(type, index = 0) {
  const id = SINGLETON_SLOTS.includes(type) ? type : `${type}-${Date.now().toString(36)}${index}`
  const common = { id, type, x: 20, y: 35 + (index % 4) * 6, w: 60, h: 18, zIndex: 4 }
  if (type === 'image') return { ...common, x: 10, y: 10, w: 80, h: 50, fit: 'contain', zIndex: 1 }
  if (type === 'text') return { ...common, text: 'Texte', fontSize: 18, align: 'center', valign: 'center' }
  if (type === 'shape') return { ...common, shape: 'rect', h: 6, bg: '#FF5A1F', radius: 4, zIndex: 0 }
  // Image libre : posée vide, on choisit ensuite le fichier (appareil ou
  // bibliothèque) dans le panneau de droite.
  if (type === 'asset') return { ...common, x: 30, y: 30, w: 40, h: 30, fit: 'contain', zIndex: 4 }
  if (type === 'price') return { ...common, x: 60, y: 0, w: 40, h: 22, align: 'right', valign: 'start' }
  if (type === 'qty') return { ...common, x: 2, y: 2, w: 20, h: 16, align: 'left', valign: 'start' }
  // Le badge porte son propre libellé : il n'a plus besoin que la zone ait un
  // badge activé pour s'afficher sur la carte.
  if (type === 'zoneBadge')
    return { ...common, x: 2, y: 2, w: 34, h: 16, align: 'left', valign: 'start', text: 'PROMO' }
  return { ...common, fontSize: 16, align: 'center', valign: 'center' }
}

// Surcharge propre à un produit (icône stylo sur ce produit), s'il en a une.
function ownCardLayout(zone, itemId) {
  const own = itemId != null ? zone?.backgroundStyle?.cardLayouts?.[String(itemId)] : null
  return own && Array.isArray(own.slots) ? own : null
}

function hasOwnCardLayout(zone, itemId) {
  return ownCardLayout(zone, itemId) !== null
}

// Dessin qui s'applique à ce produit : sa surcharge, sinon celui de la zone,
// sinon `null` (l'appelant décide du repli — le TV rend DEFAULT_CARD_SLOTS,
// l'éditeur ouvre defaultCardLayout).
function resolveCardLayout(zone, itemId) {
  const own = ownCardLayout(zone, itemId)
  if (own) return own
  const zoneLayout = zone?.backgroundStyle?.cardLayout
  return zoneLayout && Array.isArray(zoneLayout.slots) ? zoneLayout : null
}

// Nettoie les surcharges des produits qui ne sont plus dans la zone (sinon
// elles resteraient dans le JSON pour toujours).
function pruneCardLayouts(backgroundStyle, itemIds) {
  const map = backgroundStyle?.cardLayouts
  if (!map) return backgroundStyle
  const keep = new Set(itemIds.map(String))
  const next = {}
  for (const [key, value] of Object.entries(map)) {
    if (keep.has(key)) next[key] = value
  }
  if (Object.keys(next).length === Object.keys(map).length) return backgroundStyle
  const out = { ...backgroundStyle }
  if (Object.keys(next).length === 0) delete out.cardLayouts
  else out.cardLayouts = next
  return out
}

function clampPct(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(v * 10) / 10))
}

// Répare un backgroundStyle avant écriture. Des dessins de sous-zone plus
// anciens ont pu enregistrer une contentBox hors bornes (w/h > 100) : le
// backend la refuse désormais, ce qui bloquait toute modification de la zone.
// On la ramène dans les clous au lieu de renvoyer l'erreur à l'utilisateur.
function sanitizeBackgroundStyle(backgroundStyle) {
  const box = backgroundStyle?.contentBox
  if (!box) return backgroundStyle
  const num = (v, min, max, fallback) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, n))
  }
  const fixed = {
    x: num(box.x, 0, 100, 0),
    y: num(box.y, 0, 100, 0),
    w: num(box.w, CONTENT_BOX_MIN, 100, 100),
    h: num(box.h, CONTENT_BOX_MIN, 100, 100),
  }
  const same = ['x', 'y', 'w', 'h'].every((k) => fixed[k] === box[k])
  return same ? backgroundStyle : { ...backgroundStyle, contentBox: fixed }
}


// ============================================================================
// 6. VALIDATION
// ============================================================================
//
// Chaque fonction renvoie un tableau de messages d'erreur (vide = valide).
// Le backend les remonte en 400 ; le frontend peut les afficher avant d'appeler
// l'API. Fonctions pures : aucune dépendance à Prisma ni au DOM.

const isNum = (n) => typeof n === 'number' && Number.isFinite(n)
const isColor = (v) => HEX_OR_CSS_COLOR.test(String(v).trim())

function validateGridConfig(gridConfig) {
  if (!gridConfig || typeof gridConfig !== 'object' || Array.isArray(gridConfig)) {
    return ['gridConfig must be an object with rows and cols']
  }
  const { rows, cols } = gridConfig
  const ok = (n) => Number.isInteger(n) && n >= 1
  if (!ok(rows) || !ok(cols)) {
    return ['gridConfig.rows and gridConfig.cols must be positive integers']
  }
  return []
}

// Badge de zone : texte / prix / paliers, plus son style et sa position.
function validateBadgeConfig(badgeConfig) {
  if (badgeConfig === null) return []
  if (!badgeConfig || typeof badgeConfig !== 'object' || Array.isArray(badgeConfig)) {
    return ['badgeConfig must be an object']
  }
  const errors = []
  if (badgeConfig.text !== undefined) {
    if (typeof badgeConfig.text !== 'string' || badgeConfig.text.trim().length === 0) {
      errors.push('badgeConfig.text must be a non-empty string')
    }
  }
  if (badgeConfig.price !== undefined) {
    if (typeof badgeConfig.price !== 'number' || !Number.isFinite(badgeConfig.price) || badgeConfig.price < 0) {
      errors.push('badgeConfig.price must be a non-negative number')
    }
  }
  if (badgeConfig.style !== undefined && !BADGE_STYLES.includes(badgeConfig.style)) {
    errors.push(`badgeConfig.style must be one of ${BADGE_STYLES.join(', ')}`)
  }
  if (badgeConfig.position !== undefined && !BADGE_POSITIONS.includes(badgeConfig.position)) {
    errors.push(`badgeConfig.position must be one of ${BADGE_POSITIONS.join(', ')}`)
  }
  if (badgeConfig.tiers !== undefined) {
    if (!Array.isArray(badgeConfig.tiers) || badgeConfig.tiers.length === 0) {
      errors.push('badgeConfig.tiers must be a non-empty array')
    } else {
      badgeConfig.tiers.forEach((tier, i) => {
        if (!tier || typeof tier !== 'object') {
          errors.push(`badgeConfig.tiers[${i}] must be an object`)
          return
        }
        if (typeof tier.label !== 'string' || tier.label.trim().length === 0) {
          errors.push(`badgeConfig.tiers[${i}].label must be a non-empty string`)
        }
        if (typeof tier.price !== 'number' || !Number.isFinite(tier.price) || tier.price < 0) {
          errors.push(`badgeConfig.tiers[${i}].price must be a non-negative number`)
        }
      })
    }
  }
  if (badgeConfig.text === undefined && badgeConfig.price === undefined && badgeConfig.tiers === undefined) {
    errors.push('badgeConfig needs at least text, price, or tiers')
  }
  return errors
}

// Fond de l'écran — split (sombre/clair 50-50, angle réglable) ou une image
// téléversée, plus une éventuelle trame papier déchiré par-dessus.
function validateBackgroundConfig(bg) {
  if (bg === undefined || bg === null) return []
  if (typeof bg !== 'object' || Array.isArray(bg)) {
    return ['settings.background must be an object']
  }
  const errors = []
  if (bg.type !== undefined && !BACKGROUND_TYPES.includes(bg.type)) {
    errors.push(`settings.background.type must be one of ${BACKGROUND_TYPES.join(', ')}`)
  }
  if (bg.type === 'image' && !bg.imageUrl) {
    errors.push('settings.background.imageUrl is required for an image background')
  }
  if (bg.imageUrl !== undefined && (typeof bg.imageUrl !== 'string' || bg.imageUrl.trim() === '')) {
    errors.push('settings.background.imageUrl must be a non-empty string')
  }
  for (const key of ['dark', 'light', 'patternColor']) {
    if (bg[key] !== undefined && !isColor(bg[key])) {
      errors.push(`settings.background.${key} must be a valid color`)
    }
  }
  if (bg.angle !== undefined) {
    const n = Number(bg.angle)
    if (!Number.isFinite(n) || n < 0 || n > BACKGROUND_ANGLE_MAX) {
      errors.push(`settings.background.angle must be a number between 0 and ${BACKGROUND_ANGLE_MAX}`)
    }
  }
  if (bg.pattern !== undefined && !BG_PATTERNS.includes(bg.pattern)) {
    errors.push(`settings.background.pattern must be one of ${BG_PATTERNS.join(', ')}`)
  }
  return errors
}

// Surcharges de style d'une zone : couleurs, taille de police, image de fond,
// sous-zone, et les dessins de carte (zone + par produit).
function validateBackgroundStyle(style) {
  if (style === undefined || style === null) return []
  if (typeof style !== 'object' || Array.isArray(style)) {
    return ['backgroundStyle must be an object']
  }
  const errors = []
  if (style.dark !== undefined && typeof style.dark !== 'boolean') {
    errors.push('backgroundStyle.dark must be a boolean')
  }
  for (const key of ['bg', 'text', 'accent']) {
    if (style[key] !== undefined && !isColor(style[key])) {
      errors.push(`backgroundStyle.${key} must be a valid color`)
    }
  }
  // Image de fond propre à la zone (null l'enlève).
  if (style.bgImage !== undefined && style.bgImage !== null) {
    if (typeof style.bgImage !== 'string' || style.bgImage.trim() === '') {
      errors.push('backgroundStyle.bgImage must be a non-empty string or null')
    }
  }
  if (style.badgeType !== undefined && !BADGE_TYPES.includes(style.badgeType)) {
    errors.push(`backgroundStyle.badgeType must be one of ${BADGE_TYPES.join(', ')}`)
  }
  if (style.cardLayout !== undefined) {
    errors.push(...validateCardLayout(style.cardLayout, 'backgroundStyle.cardLayout'))
  }
  if (style.cardLayouts !== undefined) {
    errors.push(...validateCardLayouts(style.cardLayouts, 'backgroundStyle.cardLayouts'))
  }
  // « Afficher le prix » par zone. undefined = comportement par défaut du
  // gabarit de carte, true/false = choix explicite de l'admin.
  if (style.showPrice !== undefined && style.showPrice !== null && typeof style.showPrice !== 'boolean') {
    errors.push('backgroundStyle.showPrice must be a boolean')
  }
  if (style.fontSize !== undefined) {
    const n = Number(style.fontSize)
    if (!Number.isFinite(n) || n < FONT_SIZE_MIN || n > FONT_SIZE_MAX) {
      errors.push(`backgroundStyle.fontSize must be a number between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX}px`)
    }
  }
  // Sous-zone : en % de l'espace restant sous le titre. null l'enlève (la zone
  // remplit alors tout cet espace, comme avant l'existence de ce réglage).
  if (style.contentBox !== undefined && style.contentBox !== null) {
    const cb = style.contentBox
    if (!cb || typeof cb !== 'object' || Array.isArray(cb)) {
      errors.push('backgroundStyle.contentBox must be an object')
    } else {
      for (const key of ['x', 'y']) {
        const n = Number(cb[key])
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          errors.push(`backgroundStyle.contentBox.${key} must be a number between 0 and 100`)
        }
      }
      for (const key of ['w', 'h']) {
        const n = Number(cb[key])
        if (!Number.isFinite(n) || n <= 0 || n > 100) {
          errors.push(`backgroundStyle.contentBox.${key} must be a number between 0 (exclusive) and 100`)
        }
      }
    }
  }
  return errors
}

// Dessin d'une carte. refW/refH = taille de référence en px (celle de la
// cellule au moment du dessin) : les tailles de police sont exprimées dans ce
// repère, le rendu TV les remet à l'échelle de la cellule réelle. x/y/w/h sont
// des % de la carte, jamais des px.
function validateCardLayout(layout, path) {
  if (layout === undefined || layout === null) return []
  if (typeof layout !== 'object' || Array.isArray(layout)) return [`${path} must be an object`]
  const errors = []
  for (const f of ['refW', 'refH']) {
    if (layout[f] !== undefined && (!isNum(layout[f]) || layout[f] < 20 || layout[f] > 4000)) {
      errors.push(`${path}.${f} must be a number between 20 and 4000`)
    }
  }
  // clip : rogner ce qui dépasse du cadre de la carte (overflow hidden).
  if (layout.clip !== undefined && typeof layout.clip !== 'boolean') {
    errors.push(`${path}.clip must be a boolean`)
  }
  if (!Array.isArray(layout.slots)) {
    errors.push(`${path}.slots must be an array`)
    return errors
  }
  if (layout.slots.length > CARD_SLOTS_MAX) {
    errors.push(`${path}.slots is limited to ${CARD_SLOTS_MAX} entries`)
  }
  const seenIds = new Set()
  layout.slots.forEach((slot, i) => {
    const p = `${path}.slots[${i}]`
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
      errors.push(`${p} must be an object`)
      return
    }
    if (typeof slot.id !== 'string' || slot.id.trim() === '') {
      errors.push(`${p}.id must be a non-empty string`)
    } else if (seenIds.has(slot.id)) {
      errors.push(`${path}.slots contains duplicate id "${slot.id}"`)
    } else {
      seenIds.add(slot.id)
    }
    if (!CARD_SLOT_TYPES.includes(slot.type)) {
      errors.push(`${p}.type must be one of ${CARD_SLOT_TYPES.join(', ')}`)
    }
    for (const f of ['x', 'y']) {
      if (!isNum(slot[f]) || slot[f] < -50 || slot[f] > 150) {
        errors.push(`${p}.${f} must be a number between -50 and 150`)
      }
    }
    for (const f of ['w', 'h']) {
      if (!isNum(slot[f]) || slot[f] < 1 || slot[f] > 200) {
        errors.push(`${p}.${f} must be a number between 1 and 200`)
      }
    }
    if (slot.fontSize !== undefined && (!isNum(slot.fontSize) || slot.fontSize < 4 || slot.fontSize > FONT_SIZE_MAX_TEXT)) {
      errors.push(`${p}.fontSize must be a number between 4 and ${FONT_SIZE_MAX_TEXT}`)
    }
    if (slot.fontUnit !== undefined && !FONT_UNITS.includes(slot.fontUnit)) {
      errors.push(`${p}.fontUnit must be one of ${FONT_UNITS.join(', ')}`)
    }
    // Bornes en px réels du texte mis à l'échelle : évite qu'une carte minuscule
    // rende un texte illisible, ou qu'une carte plein écran l'affiche énorme.
    for (const f of ['fontMin', 'fontMax']) {
      if (slot[f] !== undefined && (!isNum(slot[f]) || slot[f] < 4 || slot[f] > FONT_SIZE_MAX_TEXT)) {
        errors.push(`${p}.${f} must be a number between 4 and ${FONT_SIZE_MAX_TEXT}`)
      }
    }
    if (isNum(slot.fontMin) && isNum(slot.fontMax) && slot.fontMin > slot.fontMax) {
      errors.push(`${p}.fontMin must not exceed ${p}.fontMax`)
    }
    if (slot.lineClamp !== undefined && (!Number.isInteger(slot.lineClamp) || slot.lineClamp < 1 || slot.lineClamp > 10)) {
      errors.push(`${p}.lineClamp must be an integer between 1 and 10`)
    }
    if (slot.borderWidth !== undefined && (!isNum(slot.borderWidth) || slot.borderWidth < 0 || slot.borderWidth > 20)) {
      errors.push(`${p}.borderWidth must be a number between 0 and 20`)
    }
    if (slot.rotation !== undefined && (!isNum(slot.rotation) || slot.rotation < -180 || slot.rotation > 180)) {
      errors.push(`${p}.rotation must be a number between -180 and 180`)
    }
    if (slot.zIndex !== undefined && !Number.isInteger(slot.zIndex)) {
      errors.push(`${p}.zIndex must be an integer`)
    }
    if (slot.opacity !== undefined && (!isNum(slot.opacity) || slot.opacity < 0 || slot.opacity > 1)) {
      errors.push(`${p}.opacity must be a number between 0 and 1`)
    }
    for (const f of ['color', 'bg', 'border']) {
      if (slot[f] !== undefined && slot[f] !== null && !isColor(slot[f])) {
        errors.push(`${p}.${f} must be a valid color`)
      }
    }
    if (slot.align !== undefined && !CARD_ALIGNS.includes(slot.align)) {
      errors.push(`${p}.align must be one of ${CARD_ALIGNS.join(', ')}`)
    }
    if (slot.valign !== undefined && !CARD_VALIGNS.includes(slot.valign)) {
      errors.push(`${p}.valign must be one of ${CARD_VALIGNS.join(', ')}`)
    }
    for (const f of ['uppercase', 'bold', 'italic', 'visible']) {
      if (slot[f] !== undefined && typeof slot[f] !== 'boolean') {
        errors.push(`${p}.${f} must be a boolean`)
      }
    }
    if (slot.fontFamily !== undefined && slot.fontFamily !== null && typeof slot.fontFamily !== 'string') {
      errors.push(`${p}.fontFamily must be a string`)
    }
    if (slot.badgeType !== undefined && !BADGE_TYPES.includes(slot.badgeType)) {
      errors.push(`${p}.badgeType must be one of ${BADGE_TYPES.join(', ')}`)
    }
    if (slot.type === 'text' && (typeof slot.text !== 'string' || slot.text.trim() === '')) {
      errors.push(`${p}.text is required for a "text" slot`)
    } else if (slot.text !== undefined && typeof slot.text !== 'string') {
      // Le badge de la zone porte désormais son propre libellé sur la carte.
      errors.push(`${p}.text must be a string`)
    }
    // Image libre (upload ou bibliothèque). imageUrl reste facultative : un
    // emplacement posé avant d'avoir choisi l'image doit pouvoir être
    // enregistré, il ne rend simplement rien.
    if (slot.imageUrl !== undefined && slot.imageUrl !== null) {
      if (typeof slot.imageUrl !== 'string' || slot.imageUrl.trim() === '') {
        errors.push(`${p}.imageUrl must be a non-empty string or null`)
      } else if (slot.imageUrl.length > IMAGE_URL_MAX) {
        errors.push(`${p}.imageUrl is too long`)
      }
    }
    if (slot.type === 'shape' && slot.shape !== undefined && !CARD_SHAPES.includes(slot.shape)) {
      errors.push(`${p}.shape must be one of ${CARD_SHAPES.join(', ')}`)
    }
    if (slot.radius !== undefined && (!isNum(slot.radius) || slot.radius < 0 || slot.radius > 100)) {
      errors.push(`${p}.radius must be a number between 0 and 100`)
    }
    if (slot.fit !== undefined && !CARD_FITS.includes(slot.fit)) {
      errors.push(`${p}.fit must be "contain" or "cover"`)
    }
  })
  return errors
}

// Dessins personnalisés par produit : { [itemId]: cardLayout }. Une valeur
// null retire la personnalisation et fait revenir le produit au dessin de la
// zone.
function validateCardLayouts(map, path) {
  if (map === undefined || map === null) return []
  if (typeof map !== 'object' || Array.isArray(map)) return [`${path} must be an object`]
  const errors = []
  const keys = Object.keys(map)
  if (keys.length > CARD_LAYOUTS_MAX) errors.push(`${path} is limited to ${CARD_LAYOUTS_MAX} entries`)
  for (const key of keys) {
    if (!/^\d+$/.test(key)) {
      errors.push(`${path} keys must be numeric item ids`)
      continue
    }
    errors.push(...validateCardLayout(map[key], `${path}.${key}`))
  }
  return errors
}

// Couche décorative libre posée par-dessus les zones. Les éléments vivent dans
// layout.settings.elements (JSON additif sur la colonne settings, pas de table
// en plus). Positionnement en pourcentage, jamais calé sur la grille.
function validateElementsConfig(elements) {
  if (elements === undefined || elements === null) return []
  if (!Array.isArray(elements)) return ['settings.elements must be an array']
  const errors = []
  const seenIds = new Set()
  elements.forEach((el, i) => {
    const p = `settings.elements[${i}]`
    if (!el || typeof el !== 'object' || Array.isArray(el)) {
      errors.push(`${p} must be an object`)
      return
    }
    if (typeof el.id !== 'string' || el.id.trim() === '') {
      errors.push(`${p}.id must be a non-empty string`)
    } else if (seenIds.has(el.id)) {
      errors.push(`settings.elements contains duplicate id "${el.id}"`)
    } else {
      seenIds.add(el.id)
    }
    if (el.type === undefined) {
      errors.push(`${p}.type is required and must be one of ${ELEMENT_TYPES.join(', ')}`)
    } else if (!ELEMENT_TYPES.includes(el.type)) {
      errors.push(`${p}.type must be one of ${ELEMENT_TYPES.join(', ')}`)
    }
    for (const f of ['x', 'y']) {
      if (!isNum(el[f]) || el[f] < 0 || el[f] > 100) {
        errors.push(`${p}.${f} must be a number between 0 and 100`)
      }
    }
    for (const f of ['w', 'h']) {
      if (!isNum(el[f]) || el[f] < 0.5 || el[f] > 100) {
        errors.push(`${p}.${f} must be a number between 0.5 and 100`)
      }
    }
    if (el.rotation !== undefined && (!isNum(el.rotation) || el.rotation < -180 || el.rotation > 180)) {
      errors.push(`${p}.rotation must be a number between -180 and 180`)
    }
    if (el.zIndex !== undefined && !Number.isInteger(el.zIndex)) {
      errors.push(`${p}.zIndex must be an integer`)
    }
    if ((el.type === 'image' || el.type === 'logo') && (typeof el.imageUrl !== 'string' || el.imageUrl.trim() === '')) {
      errors.push(`${p}.imageUrl is required for type "${el.type}"`)
    }
    if (el.type === 'text' && el.kind !== 'price' && (typeof el.text !== 'string' || el.text.trim() === '')) {
      errors.push(`${p}.text is required for type "text"`)
    }
    if (el.kind !== undefined && !ELEMENT_KINDS.includes(el.kind)) {
      errors.push(`${p}.kind must be one of ${ELEMENT_KINDS.join(', ')}`)
    }
    if (el.dark !== undefined && typeof el.dark !== 'boolean') {
      errors.push(`${p}.dark must be a boolean`)
    }
    if (el.badgeType !== undefined && !BADGE_TYPES.includes(el.badgeType)) {
      errors.push(`${p}.badgeType must be one of ${BADGE_TYPES.join(', ')}`)
    }
    if (el.accent !== undefined && !isColor(el.accent)) {
      errors.push(`${p}.accent must be a valid color`)
    }
    if (el.kind === 'price') {
      if (!isNum(el.price) || el.price < 0) {
        errors.push(`${p}.price must be a non-negative number when kind is "price"`)
      }
    } else if (el.price !== undefined && (!isNum(el.price) || el.price < 0)) {
      errors.push(`${p}.price must be a non-negative number`)
    }
    if (el.fontSize !== undefined && (!isNum(el.fontSize) || el.fontSize < FONT_SIZE_MIN || el.fontSize > FONT_SIZE_MAX_TEXT)) {
      errors.push(`${p}.fontSize must be a number between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX_TEXT}`)
    }
    if (el.color !== undefined && !isColor(el.color)) {
      errors.push(`${p}.color must be a valid color`)
    }
  })
  return errors
}

// Validation d'une zone complète (hors chevauchement avec ses voisines, qui se
// vérifie au niveau du layout, pas de la zone seule).
function validateZoneFields(body) {
  const errors = []
  const b = body || {}
  if (b.zoneType !== undefined && !ZONE_TYPES.includes(b.zoneType)) {
    errors.push(`zoneType must be one of ${ZONE_TYPES.join(', ')}`)
  }
  if (b.cardTemplate !== undefined && !CARD_TEMPLATES.includes(b.cardTemplate)) {
    errors.push(`cardTemplate must be one of ${CARD_TEMPLATES.join(', ')}`)
  }
  for (const f of ['x', 'y', 'w', 'h', 'order']) {
    if (b[f] !== undefined && (typeof b[f] !== 'number' || !Number.isFinite(b[f]))) {
      errors.push(`${f} must be a number`)
    }
  }
  for (const f of ['w', 'h']) {
    if (b[f] !== undefined && Number.isFinite(b[f]) && b[f] < 1) {
      errors.push(`${f} must be >= 1`)
    }
  }
  const type = b.zoneType
  if (type && REQUIRES_GRID_CONFIG.includes(type)) {
    if (b.gridConfig === undefined) {
      errors.push(`zoneType "${type}" requires a gridConfig (rows, cols)`)
    } else {
      errors.push(...validateGridConfig(b.gridConfig))
    }
  } else if (b.gridConfig !== undefined && b.gridConfig !== null && Object.keys(b.gridConfig).length > 0) {
    // Les types non-grille (hero, banner, ...) renvoient gridConfig à {} au GET
    // (repli de parseJson) : on traite ça comme « non fourni », pas invalide.
    errors.push(...validateGridConfig(b.gridConfig))
  }
  if (b.badgeConfig !== undefined) {
    errors.push(...validateBadgeConfig(b.badgeConfig))
  }
  if (b.backgroundStyle !== undefined) {
    errors.push(...validateBackgroundStyle(b.backgroundStyle))
  }
  return errors
}

module.exports = {
  DESIGN_W,
  DESIGN_H,
  GRID,
  ZONE_TYPES,
  ZONE_TYPE_LABELS,
  REQUIRES_GRID_CONFIG,
  CONTENT_ZONE_TYPES,
  CARD_TEMPLATES,
  CARD_TEMPLATE_LABELS,
  CARD_SLOT_TYPES,
  CARD_SLOT_LABELS,
  SINGLETON_SLOTS,
  TEXT_SLOTS,
  CARD_ALIGNS,
  CARD_VALIGNS,
  CARD_SHAPES,
  CARD_FITS,
  FONT_UNITS,
  BADGE_STYLES,
  BADGE_STYLE_LABELS,
  BADGE_POSITIONS,
  BADGE_POSITION_LABELS,
  BADGE_TYPES,
  BADGE_TYPE_LABELS,
  BACKGROUND_TYPES,
  BG_PATTERNS,
  BG_PATTERN_LABELS,
  ELEMENT_TYPES,
  ELEMENT_KINDS,
  ELEMENT_KIND_LABELS,
  FONT_OPTIONS,
  CARD_SLOTS_MAX,
  CARD_LAYOUTS_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_MAX_TEXT,
  BACKGROUND_ANGLE_MAX,
  IMAGE_URL_MAX,
  CONTENT_BOX_MIN,
  EL_IMAGE_MAX_PX,
  HEX_OR_CSS_COLOR,
  STYLE_DEFAULTS,
  BG_DEFAULTS,
  DEFAULT_CONTENT_BOX,
  FONT_SIZES,
  DEFAULT_CARD_SLOTS,
  CARD_REF_W_FALLBACK,
  CARD_PRESETS,
  CARD_PRESET_KEYS,
  presetCardLayout,
  cardCellSize,
  defaultCardLayout,
  newSlot,
  ownCardLayout,
  hasOwnCardLayout,
  resolveCardLayout,
  pruneCardLayouts,
  clampPct,
  sanitizeBackgroundStyle,
  validateGridConfig,
  validateBadgeConfig,
  validateBackgroundConfig,
  validateBackgroundStyle,
  validateCardLayout,
  validateCardLayouts,
  validateElementsConfig,
  validateZoneFields,
};
