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
//         ├─→ backend/src/shared/menuSchema.js      (converti en CommonJS)
//         ├─→ frontend/src/shared/menuSchema.js     (copie)
//         └─→ frontend-tv/src/shared/menuSchema.js  (copie)
//
//     Après chaque modification :  npm run sync:schema   (à la racine)
//     Pour vérifier sans rien écrire :  npm run check:schema  — sort en erreur
//     si une copie a dérivé. Rien ne le lance automatiquement (pas de CI) :
//     c'est à lancer à la main avant d'ouvrir une PR.
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
export const DESIGN_W = 1920
export const DESIGN_H = 1080

// Grille globale de l'écran : une zone occupe x/y/w/h cases sur 12x12.
export const GRID = 12


// ============================================================================
// 2. VOCABULAIRE
// ============================================================================

export const ZONE_TYPES = ['menu', 'grid', 'list', 'carousel', 'banner', 'hero', 'highlight']

export const ZONE_TYPE_LABELS = {
  menu: 'Menu',
  grid: 'Grille',
  list: 'Liste',
  carousel: 'Carrousel',
  banner: 'Bannière',
  hero: 'Héro',
  highlight: 'Mise en avant',
}

// Zones qui placent des produits dans une grille interne (rows x cols).
export const REQUIRES_GRID_CONFIG = ['grid', 'list', 'carousel']

// Comment les produits se placent DANS la zone.
//   auto — le type de la zone décide : une grille remplit ses rows x cols, une
//          liste empile dans l'ordre. C'est le seul comportement qui existait
//          avant, et le défaut : une zone déjà enregistrée ne bouge pas.
//   free — chaque produit porte sa propre boîte x/y/w/h en % de la zone, donc
//          la zone peut tenir une composition asymétrique (un gros produit à
//          gauche, trois petits empilés à droite).
//
// Le plan parlait aussi d'un mode « flow » : il existe déjà, ce sont les types
// de zone list / carousel. En ajouter un synonyme n'aurait rien débloqué.
export const ZONE_LAYOUT_MODES = ['auto', 'free']
export const ZONE_LAYOUT_MODE_LABELS = {
  auto: 'Automatique (grille / liste)',
  free: 'Libre — chaque produit a sa place',
}

// Zones censées contenir des produits : une zone de contenu vide bloque la
// publication (voir validatePublishableLayout côté backend).
export const CONTENT_ZONE_TYPES = ['menu', 'grid', 'list', 'carousel']

export const CARD_TEMPLATES = [
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

export const CARD_TEMPLATE_LABELS = {
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
export const CARD_SLOT_TYPES = ['image', 'name', 'desc', 'price', 'qty', 'zoneBadge', 'text', 'shape', 'asset']

export const CARD_SLOT_LABELS = {
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
export const SINGLETON_SLOTS = ['image', 'name', 'desc', 'price', 'qty', 'zoneBadge']

// Slots dont le contenu est du texte : ils partagent les mêmes réglages
// (police, taille, gras, italique, majuscules, alignement).
export const TEXT_SLOTS = ['name', 'desc', 'text']

export const CARD_ALIGNS = ['left', 'center', 'right']
export const CARD_VALIGNS = ['start', 'center', 'end']
export const CARD_SHAPES = ['rect', 'line']
export const CARD_FITS = ['contain', 'cover']

// À quoi la taille de police d'un slot se rapporte. `fontSize` reste toujours
// exprimée en px du repère de dessin (refW) ; l'unité décide seulement de la
// dimension de la carte à laquelle ce ratio s'applique au rendu :
//   cqw   — % de la LARGEUR de la carte (défaut, comportement d'origine)
//   cqmin — % du PLUS PETIT côté : le texte rétrécit aussi quand la carte
//           s'aplatit, ce que font les vignettes et les icônes+libellé
//   px    — taille fixe, ne suit pas la carte (à réserver aux cas précis)
export const FONT_UNITS = ['cqw', 'cqmin', 'px']

// ---------------------------------------------------------------------------
// SLOTS DE ZONE
// ---------------------------------------------------------------------------
//
// Une zone est un conteneur de slots, exactement comme une carte : mêmes règles
// de position (x/y/w/h en % de la zone), même moteur de rendu, un cran plus
// haut. Le slot `products` est le répéteur — c'est lui qui contient la grille,
// la liste ou le placement libre.
//
// Sans zoneLayout, la zone garde sa disposition d'origine (titre en haut,
// produits dessous) : aucune zone déjà enregistrée ne bouge.
export const ZONE_SLOT_TYPES = ['title', 'products', 'text', 'shape', 'asset']
export const ZONE_SLOT_LABELS = {
  title: 'Titre de la zone',
  products: 'Les produits',
  text: 'Texte libre',
  shape: 'Forme / trait',
  asset: 'Image libre',
}

// Un seul exemplaire par zone : le titre et le répéteur de produits.
export const ZONE_SINGLETON_SLOTS = ['title', 'products']

// Traitement visuel du titre. `divider` est le rendu historique — Playfair
// italique entre deux filets ; `banner` la pastille catégorie ; `plain` un
// titre nu qu'on style librement.
export const ZONE_TITLE_STYLES = ['divider', 'banner', 'plain']
export const ZONE_TITLE_STYLE_LABELS = {
  divider: 'Filets de part et d’autre',
  banner: 'Bandeau catégorie',
  plain: 'Titre simple',
}

// Badge de zone (T7.3) : JSON posé sur la zone, pas de table dédiée.
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

// Les deux designs de badge prix (frontend-tv/src/theme/designTokens.js).
// Indépendant du couple sombre/clair : 2 types x 2 fonds = 4 rendus.
export const BADGE_TYPES = ['type1', 'type2']
export const BADGE_TYPE_LABELS = {
  type1: 'Type 1 — sticker',
  type2: 'Type 2 — ticket déchiré',
}

// Fond de l'écran (T7.6), stocké dans layout.settings.background.
export const BACKGROUND_TYPES = ['image', 'split']
export const BG_PATTERNS = ['none', 'torn-paper', 'torn-edge']
export const BG_PATTERN_LABELS = {
  none: 'Aucun',
  'torn-paper': 'Papier déchiré (bande entre zones)',
  'torn-edge': 'Bord déchiré (zones collées)',
}

// Deux façons de traiter une jointure :
//   'band' — une bande de papier déchiré posée PAR-DESSUS la jointure ; les
//            zones se coupent sur son axe et la bande cache le raccord.
//   'edge' — pas de bande du tout : les deux zones se touchent directement, et
//            c'est leur frontière elle-même qui est déchirée. Une zone mord
//            dans l'autre, comme deux feuilles déchirées mises bout à bout.
export function seamModeOf(pattern) {
  if (pattern === 'torn-paper') return 'band'
  if (pattern === 'torn-edge') return 'edge'
  return null
}

// Couche décorative libre (T8), stockée dans layout.settings.elements.
// 'logo' est l'ancien nom de 'icon' : les deux se dessinent et s'éditent
// exactement pareil, on garde le mot pour ne pas casser les layouts déjà
// enregistrés.
export const ELEMENT_TYPES = ['image', 'text', 'logo', 'icon']
export const ELEMENT_TYPE_LABELS = {
  image: 'Image',
  text: 'Texte',
  logo: 'Logo',
  icon: 'Icône',
}
export const ELEMENT_KINDS = ['plain', 'banner', 'hero', 'divider', 'price']
export const ELEMENT_KIND_LABELS = {
  plain: 'Texte simple',
  banner: 'Bannière catégorie',
  hero: 'Titre héro',
  divider: 'Séparateur',
  price: 'Badge prix',
}

// Familles auto-hébergées uniquement (frontend-tv/src/fonts.css) — jamais une
// URL Google Fonts en direct, pour qu'une TV qui démarre hors ligne ait
// toujours une police. Valeur vide = pas de surcharge (police du gabarit).
export const FONT_OPTIONS = [
  { value: '', label: 'Par défaut' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Roboto Flex', label: 'Roboto Flex' },
]

// Les polices téléversées dans la Bibliothèque (catégorie de type "font")
// s'ajoutent aux familles embarquées. LibraryFontFaces les déclare en
// @font-face des deux côtés ; ici on ne fabrique que la liste du sélecteur,
// pour que tous les sélecteurs de police de l'admin proposent la même chose.
export function fontOptionsWith(libraryFonts) {
  const extra = (Array.isArray(libraryFonts) ? libraryFonts : [])
    .filter((f) => f && typeof f.name === 'string' && f.name.trim() !== '')
    .map((f) => ({ value: f.name, label: f.name, library: true }))
  const seen = new Set(FONT_OPTIONS.map((f) => f.value))
  return [...FONT_OPTIONS, ...extra.filter((f) => !seen.has(f.value) && seen.add(f.value))]
}

// ---------------------------------------------------------------------------
// DÉCOR DE ZONE
// ---------------------------------------------------------------------------
//
// Une décoration est une image de la Bibliothèque posée sur un bord de la zone
// (ou sur toute sa surface). C'est ce qui remplace « un seul effet possible » :
// papier déchiré, néon, bois, grunge — c'est un téléversement, pas un commit.
//
// Le papier déchiré ENTRE zones (ZoneSeams) reste à part : il se dessine sur la
// couture partagée par deux zones, pas sur le bord d'une seule.
export const ZONE_DECORATION_EDGES = ['top', 'right', 'bottom', 'left', 'full']
export const ZONE_DECORATION_EDGE_LABELS = {
  top: 'Bord haut',
  right: 'Bord droit',
  bottom: 'Bord bas',
  left: 'Bord gauche',
  full: 'Toute la zone',
}

export const ZONE_DECORATION_REPEATS = ['repeat', 'stretch']
export const ZONE_DECORATION_REPEAT_LABELS = {
  repeat: 'Répéter le motif',
  stretch: 'Étirer une fois',
}

export const ZONE_DECORATIONS_MAX = 8
export const DECORATION_SIZE_MIN = 2
export const DECORATION_SIZE_MAX = 400
export const DECORATION_SIZE_FALLBACK = 40

// La boîte et le fond CSS d'une décoration. Un seul endroit les calcule, pour
// que l'aperçu du builder ne puisse pas montrer autre chose que la TV.
export function decorationStyle(dec) {
  const size = typeof dec?.size === 'number' && Number.isFinite(dec.size) ? dec.size : DECORATION_SIZE_FALLBACK
  const stretch = dec?.repeat === 'stretch'
  const box = { position: 'absolute', pointerEvents: 'none', opacity: dec?.opacity ?? 1 }
  const bg = { backgroundImage: dec?.imageUrl ? `url("${dec.imageUrl}")` : undefined }

  if (dec?.edge === 'full') {
    Object.assign(box, { inset: 0 })
    bg.backgroundRepeat = stretch ? 'no-repeat' : 'repeat'
    bg.backgroundSize = stretch ? '100% 100%' : `${size}px auto`
    return { ...box, ...bg }
  }

  const horizontal = dec?.edge === 'top' || dec?.edge === 'bottom'
  if (horizontal) {
    Object.assign(box, { left: 0, right: 0, height: size, [dec.edge]: 0 })
    bg.backgroundRepeat = stretch ? 'no-repeat' : 'repeat-x'
    bg.backgroundSize = stretch ? '100% 100%' : `auto ${size}px`
  } else {
    Object.assign(box, { top: 0, bottom: 0, width: size, [dec?.edge === 'right' ? 'right' : 'left']: 0 })
    bg.backgroundRepeat = stretch ? 'no-repeat' : 'repeat-y'
    bg.backgroundSize = stretch ? '100% 100%' : `${size}px auto`
  }
  return { ...box, ...bg }
}

// Réglages d'un élément dessiné (image, logo, icône).
//   fit     — le dessin garde ses proportions dans sa boîte, ou l'étire.
//   bgShape — la pastille posée derrière le dessin (badge catégorie).
export const ELEMENT_FITS = ['contain', 'fill']
export const ELEMENT_FIT_LABELS = {
  contain: 'Proportions',
  fill: 'Étirer',
}
export const ELEMENT_BG_SHAPES = ['none', 'circle', 'square']
export const ELEMENT_BG_SHAPE_LABELS = {
  none: 'Aucune',
  circle: 'Cercle',
  square: 'Carré',
}

// Alignement horizontal d'un élément texte. Même vocabulaire que les slots de
// carte (CARD_ALIGNS) : un seul mot pour la même idée dans tout le modèle.
export const ELEMENT_ALIGN_LABELS = {
  left: 'Gauche',
  center: 'Centre',
  right: 'Droite',
}


// ============================================================================
// 3. LIMITES
// ============================================================================

export const CARD_SLOTS_MAX = 40
export const CARD_LAYOUTS_MAX = 200
export const FONT_SIZE_MIN = 8
export const FONT_SIZE_MAX = 128
export const FONT_SIZE_MAX_TEXT = 200
export const BACKGROUND_ANGLE_MAX = 180
export const IMAGE_URL_MAX = 2048
export const CONTENT_BOX_MIN = 10
export const EL_IMAGE_MAX_PX = 1000

// Boîte d'un produit en placement libre, en % de la zone. Elle peut mordre un
// peu au-delà des bords (une photo détourée qui dépasse fait partie du style
// des boards), mais pas au point de sortir de l'écran.
export const FREE_ITEM_MIN = 2
export const FREE_ITEM_MAX = 150
export const FREE_ITEM_POS_MIN = -25
export const FREE_ITEM_POS_MAX = 125

// Réglages de mise en forme d'une zone, en px de la maquette 1920x1080. Chacun
// remplace une valeur qui était écrite en dur dans le rendu TV : tant que la
// zone n'en fixe aucun, elle rend exactement comme avant.
//
//   padding   marge intérieure de la zone            (était ZONE_PAD = 10)
//   gap       espace entre les produits              (était gap-5 = 20px)
//   titleGap  espace sous le titre                   (était mb-6 = 24px)
//   radius    arrondi des coins de la zone           (n'existait pas)
//   border    filet autour de la zone                (n'existait pas)
//   shadow    portée de l'ombre portée               (n'existait pas)
//   textMuted couleur du texte secondaire   (était déduite de `dark`, 2 valeurs)
export const ZONE_STYLE_LIMITS = {
  padding: { min: 0, max: 200, fallback: 10 },
  gap: { min: 0, max: 120, fallback: 20 },
  titleGap: { min: 0, max: 200, fallback: 24 },
  radius: { min: 0, max: 200, fallback: 0 },
  borderWidth: { min: 0, max: 20, fallback: 2 },
  shadow: { min: 0, max: 80, fallback: 0 },
}

// Marge intérieure minimale sur un bord qui porte une couture papier déchiré :
// ZoneSeams dessine sa bande 25px à l'intérieur de la zone, le contenu doit la
// dégager. Une marge plus grande choisie par l'admin l'emporte.
export const ZONE_PAD_SEAM = 25

// Valeur effective d'un réglage de zone : celle de la zone, sinon celle qui
// était codée en dur. Un seul endroit décide, pour que le rendu TV et l'aperçu
// du builder ne puissent pas répondre différemment.
export function zoneStyleValue(backgroundStyle, key) {
  const limits = ZONE_STYLE_LIMITS[key]
  if (!limits) return undefined
  const v = backgroundStyle?.[key]
  if (typeof v !== 'number' || !Number.isFinite(v)) return limits.fallback
  return Math.min(limits.max, Math.max(limits.min, v))
}
// Marge intérieure d'un élément dessiné, en % de sa boîte. Plafonnée bien
// avant 50% : à 50% le dessin n'a plus aucune place et disparaît.
export const EL_PADDING_MAX = 45

// Couleur : hex (#abc → #aabbccdd), rgb(a)/hsl(a), un mot-clé CSS, ou un jeton
// du thème — var(--menu-accent), var(--menu-text-muted)... Les jetons laissent
// un dessin suivre les couleurs de sa zone au lieu de les figer, ce dont les
// modèles de carte ci-dessous ont besoin.
export const HEX_OR_CSS_COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|var\(--[A-Za-z0-9_-]+\)|[a-zA-Z]+)$/


// ============================================================================
// 4. VALEURS PAR DÉFAUT
// ============================================================================

export const STYLE_DEFAULTS = {
  bgDark: '#121212',
  bgLight: '#F5F3EF',
  textDark: '#FFFFFF',
  textLight: '#1A1A1A',
  accent: '#FF5A1F',
}

// Épaisseur de la bande, en pixels de la maquette (réglable dans le dialogue
// « Fond »), et amplitude du déplacement des poignées, en % de l'écran.
export const SEAM_THICKNESS_DEFAULT = 26
export const SEAM_THICKNESS_MIN = 8
export const SEAM_THICKNESS_MAX = 140
export const SEAM_BEND_MAX = 35

export const BG_DEFAULTS = {
  type: 'image',
  dark: '#121212',
  light: '#F5F3EF',
  angle: 0,
  pattern: 'none',
  patternColor: '#FFFFFF',
  seamsEnabled: true,
  hiddenSeams: [],
  seamThickness: SEAM_THICKNESS_DEFAULT,
  seamShape: {},
}

// Sous-zone (T9) : la boîte du conteneur de produits à l'intérieur de la zone,
// en % de l'espace restant sous le titre. Absente = remplit tout cet espace.
export const DEFAULT_CONTENT_BOX = { x: 0, y: 0, w: 100, h: 100 }

// Valeurs de départ d'une icône fraîchement posée sur le canvas. Elles ne
// servent QU'À la création : le rendu, lui, retombe sur les défauts hérités
// (voir elementVisualStyle) pour qu'un vieil élément ne bouge pas.
export const ICON_DEFAULTS = {
  color: '#FFFFFF',
  fit: 'contain',
  bgShape: 'none',
  bgColor: '#FF5A1F',
  padding: 0,
  opacity: 1,
}

export const FONT_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 24, 28]

// Disposition de départ d'une carte : ce que fait la carte « Par défaut » côté
// TV (photo en haut, nom dessous, badge prix collé au coin haut-droit) plus la
// description sous le nom. Tous les slots partent visibles : un produit sans
// description n'affiche rien à cet endroit de toute façon, alors qu'un slot
// masqué par défaut donne l'impression que la description ne marche pas.
export const DEFAULT_CARD_SLOTS = [
  { id: 'image', type: 'image', x: 8, y: 4, w: 84, h: 56, fit: 'contain', zIndex: 1 },
  { id: 'name', type: 'name', x: 4, y: 62, w: 92, h: 20, fontSize: 30, align: 'center', valign: 'center', uppercase: true, bold: true, zIndex: 2 },
  { id: 'desc', type: 'desc', x: 4, y: 82, w: 92, h: 16, fontSize: 18, align: 'center', valign: 'start', zIndex: 2 },
  { id: 'price', type: 'price', x: 62, y: 0, w: 38, h: 22, align: 'right', valign: 'start', zIndex: 3 },
]

// Largeur de référence supposée quand un dessin n'en déclare pas : les tailles
// de police de DEFAULT_CARD_SLOTS sont exprimées dans ce repère.
export const CARD_REF_W_FALLBACK = 400

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
export const CARD_PRESETS = [
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

export const CARD_PRESET_KEYS = CARD_PRESETS.map((p) => p.key)

// Le modèle mis à l'échelle de la cellule réelle de la zone : les positions
// sont déjà en %, seules les tailles de police ont besoin du repère.
export function presetCardLayout(key, zone) {
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
export function cardCellSize(zone, zoneItem = null) {
  const zoneW = ((zone?.w || 1) / GRID) * DESIGN_W
  const zoneH = ((zone?.h || 1) / GRID) * DESIGN_H
  // Placement libre : la carte occupe la boîte du produit, pas une cellule de
  // grille. Sans ce cas, l'éditeur dessinerait au format d'une cellule qui
  // n'existe pas et les tailles de police seraient prises dans le mauvais
  // repère.
  if (isFreeZone(zone)) {
    const box = zoneItem ? freeItemBox(zoneItem) : { w: 30, h: 30 }
    return { w: Math.round((zoneW * box.w) / 100), h: Math.round((zoneH * box.h) / 100) }
  }
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
export function defaultCardLayout(zone) {
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
export function newSlot(type, index = 0) {
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
export function ownCardLayout(zone, itemId) {
  const own = itemId != null ? zone?.backgroundStyle?.cardLayouts?.[String(itemId)] : null
  return own && Array.isArray(own.slots) ? own : null
}

export function hasOwnCardLayout(zone, itemId) {
  return ownCardLayout(zone, itemId) !== null
}

// Dessin qui s'applique à ce produit : sa surcharge, sinon celui de la zone,
// sinon `null` (l'appelant décide du repli — le TV rend DEFAULT_CARD_SLOTS,
// l'éditeur ouvre defaultCardLayout).
export function resolveCardLayout(zone, itemId) {
  const own = ownCardLayout(zone, itemId)
  if (own) return own
  const zoneLayout = zone?.backgroundStyle?.cardLayout
  return zoneLayout && Array.isArray(zoneLayout.slots) ? zoneLayout : null
}

// Nettoie les surcharges des produits qui ne sont plus dans la zone (sinon
// elles resteraient dans le JSON pour toujours).
export function pruneCardLayouts(backgroundStyle, itemIds) {
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

export function clampPct(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(v * 10) / 10))
}

// Répare un backgroundStyle avant écriture. Des dessins de sous-zone plus
// anciens ont pu enregistrer une contentBox hors bornes (w/h > 100) : le
// backend la refuse désormais, ce qui bloquait toute modification de la zone.
// On la ramène dans les clous au lieu de renvoyer l'erreur à l'utilisateur.
export function sanitizeBackgroundStyle(backgroundStyle) {
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
// 5.5 ÉLÉMENTS LIBRES (dessinés et texte)
// ============================================================================
//
// Un élément dessiné, c'est un fichier (SVG de préférence pour une icône, PNG
// détouré sinon) posé librement sur l'écran. L'admin et la TV doivent en
// donner exactement le même rendu : les styles se calculent donc ici une seule
// fois, pas dans chacun des deux composants. Idem pour l'alignement du texte
// juste en dessous.

// Une URL qui part dans une valeur CSS. Guillemets et antislashs échappés :
// sans ça une URL tordue pourrait fermer le url(...) et injecter du style.
export function cssUrl(url) {
  return 'url("' + String(url || '').replace(/["\\]/g, '\\$&') + '")'
}

// Recolorer un fichier qu'on ne contrôle pas, sans le charger dans le DOM :
// on s'en sert comme masque CSS. Le fichier ne donne plus ses couleurs, juste
// sa forme (son alpha), et la couleur vient d'un aplat posé derrière. Ça
// marche avec n'importe quel dessin à fond transparent, ne demande pas de
// CORS, et n'exécute jamais le contenu du fichier — un SVG uploadé ne peut
// donc pas injecter de script. Sans `color`, le fichier est rendu tel quel,
// avec ses couleurs d'origine.
//
// Renvoie trois morceaux :
//   frame  — la boîte : pastille de fond, marge intérieure, opacité
//   mask   — le style du calque recoloré, ou null si couleurs d'origine
//   fit    — l'object-fit à donner au <img> quand mask est null
// Les défauts reproduisent l'ancien rendu (image étirée, sans pastille), donc
// un layout déjà enregistré ne bouge pas d'un pixel.
export function elementVisualStyle(el) {
  const e = el || {}
  const fit = ELEMENT_FITS.includes(e.fit) ? e.fit : 'fill'
  const shape = ELEMENT_BG_SHAPES.includes(e.bgShape) ? e.bgShape : 'none'
  const padNum = Number(e.padding)
  const pad = Number.isFinite(padNum) ? Math.max(0, Math.min(EL_PADDING_MAX, padNum)) : 0
  const opacityNum = Number(e.opacity)
  const opacity = Number.isFinite(opacityNum) ? Math.max(0, Math.min(1, opacityNum)) : 1

  const frame = {
    width: '100%',
    height: '100%',
    padding: pad ? pad + '%' : undefined,
    opacity: opacity === 1 ? undefined : opacity,
    backgroundColor: shape === 'none' ? undefined : e.bgColor || ICON_DEFAULTS.bgColor,
    // Un cercle parfait suppose une boîte carrée ; sinon c'est une ellipse,
    // ce qui reste le comportement attendu quand on étire la boîte.
    borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '18%' : undefined,
    boxSizing: 'border-box',
  }

  if (!e.color) return { frame: frame, mask: null, fit: fit === 'contain' ? 'contain' : 'fill' }

  const size = fit === 'contain' ? 'contain' : '100% 100%'
  const image = cssUrl(e.imageUrl)
  const mask = {
    width: '100%',
    height: '100%',
    display: 'block',
    backgroundColor: e.color,
    WebkitMaskImage: image,
    maskImage: image,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: size,
    maskSize: size,
  }
  return { frame: frame, mask: mask, fit: fit === 'contain' ? 'contain' : 'fill' }
}

// Alignement horizontal d'un élément texte. Deux propriétés, pas une : la boîte
// est un conteneur flex, donc `justifyContent` place le bloc de texte dans la
// boîte, et `textAlign` aligne les lignes entre elles quand le texte passe à la
// ligne. Sans réglage : centré, comme avant.
export function elementTextStyle(el) {
  const align = CARD_ALIGNS.includes(el?.align) ? el.align : 'center'
  return {
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
    textAlign: align,
  }
}

// Texte courbé — un texte simple ou un titre héro peut se poser sur un arc de
// cercle au lieu d'une ligne droite. `curve` se lit en pourcentage de
// demi-cercle :
//   0    ligne droite (aucun arc : le texte reste du texte normal)
//   100  le texte fait exactement un demi-cercle
//   200  le texte fait presque le tour complet du cercle
// Négatif = l'arc se creuse vers le bas (∪) au lieu de bomber vers le haut (∩).
export const EL_CURVE_MAX = 200

// Vide gardé entre la dernière lettre et la première quand le texte se referme
// en cercle, en hauteurs de police. Sans lui le texte se mord la queue : à
// courbure maximale le « D » de la fin venait se coller au « G » du début, les
// deux se confondaient en une tache et on ne lisait plus ni l'un ni l'autre.
// Un cercle vraiment fermé n'a d'ailleurs plus de corde du tout — ses deux
// extrémités au même point, et le navigateur ne dessine plus rien.
const CURVE_END_GAP = 0.7

// Rayon minimal quand l'arc se creuse (∪), en hauteurs de police.
//
// Les deux sens ne sont pas symétriques, et c'est la géométrie qui décide, pas
// un choix : bombé (∩) les lettres pointent vers l'extérieur du cercle, leurs
// sommets sont sur un cercle plus grand que leur pied et elles s'aèrent ;
// creusé (∪) elles pointent vers le centre, leurs sommets sont sur un cercle
// plus petit et elles se rentrent dedans. À rayon égal, un ∩ respire là où un
// ∪ se referme.
//
// Le sommet d'une lettre est à peu près à 0,72 hauteur de police de son pied :
// à ce rayon il lui reste ~70% de son espacement, ce qui est le point où les
// lettres se touchent sans encore se chevaucher. Au-delà le mot devient une
// tache, donc la courbure s'arrête là — et comme la limite se calcule sur la
// longueur du texte, une phrase longue se creuse bien plus qu'un mot court
// avant de l'atteindre.
const CURVE_MIN_RADIUS_DOWN = 2.4

export function elementCurve(el) {
  const v = Number(el?.curve)
  if (!Number.isFinite(v)) return 0
  return Math.max(-EL_CURVE_MAX, Math.min(EL_CURVE_MAX, Math.round(v)))
}

// L'arc sur lequel poser le texte, en px, prêt à devenir un <svg><textPath>.
//
// `textWidth` est la largeur que ce texte occuperait en ligne droite, mesurée
// dans le navigateur avec sa vraie police : c'est elle qui devient la LONGUEUR
// de l'arc. Les lettres gardent donc exactement leur taille et leur
// espacement — seule leur orientation change — et le texte remplit l'arc pile,
// quel que soit le nombre de caractères.
//
// Rayon = longueur / angle : plus la courbure demandée est forte, plus le
// cercle est petit, donc plus le texte s'enroule. Retourne null quand il n'y a
// rien à courber (courbure nulle, ou largeur pas encore mesurée).
export function curvedTextGeometry(curve, textWidth, fontSize) {
  const c = Math.max(-EL_CURVE_MAX, Math.min(EL_CURVE_MAX, Number(curve) || 0))
  const len = Number(textWidth)
  if (c === 0 || !Number.isFinite(len) || len <= 0) return null

  // Les lettres débordent de la ligne de base, vers le haut (hampes) comme vers
  // le bas (jambages), et aux extrémités d'un arc serré elles sont couchées :
  // ce débordement se compte alors en largeur. Une marge un peu plus grande
  // qu'une hauteur de police tout autour couvre les deux cas, sinon la boîte
  // annoncée serait plus petite que le dessin et le centrage tomberait à côté.
  const font = Math.max(1, Number(fontSize) || 24)
  const pad = font * 1.25
  const up = c > 0
  // Deux garde-fous, tous les deux fonction du texte lui-même — c'est pour ça
  // qu'ils vivent ici et pas dans les bornes du réglage : « le tour complet »
  // ne veut pas dire le même angle pour deux mots de longueurs différentes.
  const closed = (2 * Math.PI * len) / (len + CURVE_END_GAP * font)
  const readable = up ? Infinity : len / (CURVE_MIN_RADIUS_DOWN * font)
  const angle = Math.min((Math.abs(c) / 100) * Math.PI, closed, readable)
  // Rayon = longueur / angle. L'arc mesure donc exactement la largeur du texte,
  // ni plus ni moins : un arc plus court amputerait la première et la dernière
  // lettre (le navigateur coupe ce qui dépasse du tracé), un arc plus long
  // laisserait le texte flotter au milieu. Les sommets des lettres, eux, sont
  // sur un cercle un peu plus grand (∩) ou un peu plus petit (∪) que la ligne
  // de base : ils s'écartent ou se resserrent, c'est la géométrie même du texte
  // courbé — c'est en baissant la courbure qu'on desserre un ∪ trop fermé.
  const radius = len / angle
  const half = angle / 2
  // Au-delà du demi-cercle, l'arc déborde de ses propres extrémités : c'est le
  // cercle entier qui donne la largeur.
  const halfW = angle >= Math.PI ? radius : radius * Math.sin(half)
  // Flèche de l'arc : du sommet (toujours atteint) jusqu'à la corde.
  const depth = radius * (1 - Math.cos(half))

  const cx = halfW + pad
  const dx = radius * Math.sin(half)
  // y de la corde. Sommet en haut (∩) : la corde est en dessous. Sommet en bas
  // (∪) : la corde est la ligne du haut.
  const y = up ? pad + depth : pad
  const round2 = (n) => Math.round(n * 100) / 100
  const largeArc = angle > Math.PI ? 1 : 0
  // Sens de parcours : on lit toujours de gauche à droite, en passant par le
  // sommet pour ∩ (sens horaire) et par le creux pour ∪ (sens inverse).
  const sweep = up ? 1 : 0

  return {
    path:
      `M ${round2(cx - dx)} ${round2(y)} ` +
      `A ${round2(radius)} ${round2(radius)} 0 ${largeArc} ${sweep} ${round2(cx + dx)} ${round2(y)}`,
    width: round2(2 * (halfW + pad)),
    height: round2(depth + 2 * pad),
    radius: round2(radius),
    angle: angle,
  }
}

// Écart entre le mot et ses filets quand l'élément n'en fixe aucun : l'ancien
// `gap-4` de la TV, en dur. Un séparateur déjà enregistré garde donc exactement
// l'espacement qu'il avait.
export const DIVIDER_GAP_FALLBACK = 16

// Le séparateur : un filet, le mot, un filet. Les deux rendus (aperçu du
// builder, TV) passent par ici pour tracer le même trait.
//
// L'écart réutilise `padding`, la marge que tout élément porte déjà — même
// champ, même idée (de l'air autour du contenu), donc pas de second réglage à
// tenir en phase. Il s'exprime en % de la largeur de la boîte : l'écart suit
// l'élément quand on le redimensionne, au lieu de rester un nombre de pixels
// qui ne veut plus rien dire une fois le séparateur deux fois plus large.
//
// Les filets prennent la couleur choisie telle quelle. Ils étaient tracés à 60%
// d'opacité par-dessus, ce qui délavait la couleur et la rendait impossible à
// viser : pour atténuer un séparateur il y a déjà `opacity` sur l'élément, et
// une couleur plus douce se choisit dans le sélecteur.
export function elementDividerStyle(el) {
  const e = el || {}
  const color = e.color || '#FFFFFF'
  const fontSize = Math.min(Number(e.fontSize) || 24, FONT_SIZE_MAX_TEXT)
  const padNum = Number(e.padding)
  const hasPad = Number.isFinite(padNum)
  return {
    gap: hasPad ? Math.max(0, Math.min(EL_PADDING_MAX, padNum)) + '%' : DIVIDER_GAP_FALLBACK + 'px',
    // L'épaisseur du filet suit la taille du texte : un mot de 12px mérite un
    // trait plus fin qu'un mot de 90px. Jamais moins de 2px, en dessous le
    // trait disparaît sur un écran qui met à l'échelle.
    line: { backgroundColor: color, height: Math.max(2, Math.round(fontSize / 12)) },
    text: { fontSize: fontSize, color: color, lineHeight: 1.4 },
  }
}


// ---------------------------------------------------------------------------
// DISPOSITION DE LA ZONE
// ---------------------------------------------------------------------------

// La disposition d'origine, écrite en slots : le titre occupe une bande en
// haut, les produits remplissent le reste. Une zone sans nom n'a pas de bande
// de titre — comme aujourd'hui. C'est le point de départ de l'éditeur, et le
// repère qui montre qu'aucune mise en page n'a été perdue en passant aux slots.
export function defaultZoneLayout(zone) {
  const hasTitle = !!zone?.name
  const slots = []
  if (hasTitle) {
    slots.push({
      id: 'title',
      type: 'title',
      x: 0, y: 0, w: 100, h: 16,
      titleStyle: zone?.backgroundStyle?.banner ? 'banner' : 'divider',
      align: 'center', valign: 'center', zIndex: 2,
    })
  }
  slots.push({
    id: 'products',
    type: 'products',
    x: 0, y: hasTitle ? 18 : 0, w: 100, h: hasTitle ? 82 : 100,
    zIndex: 1,
  })
  return { slots }
}

// Dispositions prêtes à l'emploi. Comme pour les cartes : ajouter une entrée
// ici suffit, il n'y a pas de composant à écrire.
export const ZONE_PRESETS = [
  {
    key: 'title-top',
    label: 'Titre en haut',
    description: 'La disposition d’origine — titre en bande, produits dessous.',
    slots: [
      { id: 'title', type: 'title', x: 0, y: 0, w: 100, h: 16, titleStyle: 'divider', align: 'center', valign: 'center', zIndex: 2 },
      { id: 'products', type: 'products', x: 0, y: 18, w: 100, h: 82, zIndex: 1 },
    ],
  },
  {
    key: 'title-left',
    label: 'Titre à gauche',
    description: 'Titre sur le flanc gauche, les produits occupent la droite.',
    slots: [
      { id: 'title', type: 'title', x: 1, y: 0, w: 24, h: 100, titleStyle: 'plain', align: 'left', valign: 'center', fontSize: 40, bold: true, uppercase: true, color: 'var(--menu-accent)', zIndex: 2 },
      { id: 'products', type: 'products', x: 27, y: 0, w: 73, h: 100, zIndex: 1 },
    ],
  },
  {
    key: 'title-overlay',
    label: 'Titre par-dessus',
    description: 'Les produits prennent toute la zone, le titre se pose dessus.',
    slots: [
      { id: 'products', type: 'products', x: 0, y: 0, w: 100, h: 100, zIndex: 1 },
      { id: 'veil', type: 'shape', x: 0, y: 0, w: 100, h: 18, bg: '#000000', opacity: 0.45, zIndex: 2 },
      { id: 'title', type: 'title', x: 2, y: 1, w: 96, h: 16, titleStyle: 'plain', align: 'left', valign: 'center', fontSize: 38, bold: true, uppercase: true, color: '#FFFFFF', zIndex: 3 },
    ],
  },
  {
    key: 'no-title',
    label: 'Sans titre',
    description: 'Rien que les produits, plein cadre.',
    slots: [{ id: 'products', type: 'products', x: 0, y: 0, w: 100, h: 100, zIndex: 1 }],
  },
]

export const ZONE_PRESET_KEYS = ZONE_PRESETS.map((p) => p.key)

export function presetZoneLayout(key) {
  const preset = ZONE_PRESETS.find((p) => p.key === key)
  return preset ? { slots: preset.slots.map((sl) => ({ ...sl })) } : null
}

// La disposition qui s'applique à cette zone : la sienne si elle en a une,
// sinon `null` — l'appelant décide du repli (la TV garde son rendu d'origine,
// l'éditeur ouvre defaultZoneLayout).
export function resolveZoneLayout(zone) {
  const zl = zone?.backgroundStyle?.zoneLayout
  return zl && Array.isArray(zl.slots) && zl.slots.length > 0 ? zl : null
}


// ---------------------------------------------------------------------------
// PLACEMENT LIBRE
// ---------------------------------------------------------------------------

export function isFreeZone(zone) {
  return zone?.layoutMode === 'free'
}

// Un produit fraîchement posé en mode libre : une tuile qui tient dans la zone,
// décalée à chaque fois pour ne pas empiler tous les produits au même endroit.
export function defaultFreeItemBox(index = 0) {
  const cols = 3
  const w = 30
  const h = 30
  const col = index % cols
  const row = Math.floor(index / cols) % 3
  return {
    x: clampPct(4 + col * 32, 0, 100 - w),
    y: clampPct(4 + row * 32, 0, 100 - h),
    w,
    h,
  }
}

// La boîte d'un produit, avec un repli pour les lignes écrites avant que le
// placement libre existe (x/y/w/h à null) : elles retombent sur la tuile par
// défaut au lieu de rendre une carte de taille nulle.
export function freeItemBox(zoneItem, index = 0) {
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const x = n(zoneItem?.x)
  const y = n(zoneItem?.y)
  const w = n(zoneItem?.w)
  const h = n(zoneItem?.h)
  if (x === null || y === null || w === null || h === null) return defaultFreeItemBox(index)
  return { x, y, w, h }
}


// ============================================================================
// 5.6 PAPIER DÉCHIRÉ (les jointures entre zones)
// ============================================================================
//
// La bande de papier déchiré posée sur la jointure de deux zones voisines.
// Elle est dessinée d'un seul trait, sur toute la longueur de la jointure et
// dans le repère de la maquette (DESIGN_W x DESIGN_H) : aucun motif ne se
// répète, et le builder comme la TV n'ont qu'à poser le même <svg viewBox>
// par-dessus leur cadre 16:9. Tout se calcule ici pour que les deux rendus
// soient identiques au pixel près.

// Hachage de la clé de jointure : chaque jointure a sa propre déchirure, mais
// toujours la même, d'un rendu à l'autre et d'un écran à l'autre.
function seamSeed(key) {
  let h = 2166136261
  const text = String(key || '')
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

// Suite pseudo-aléatoire déterministe (pas de Math.random : le builder et la
// TV doivent tomber sur exactement la même déchirure).
function seamRand(seed, i) {
  let x = Math.imul(seed ^ (i + 0x9e3779b9), 2246822519) >>> 0
  x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

// Bruit de valeur interpolé en cosinus : une valeur tirée tous les
// `wavelength` pixels, reliée en douceur.
function seamNoise(seed, pos, wavelength) {
  const i = Math.floor(pos / wavelength)
  const t = pos / wavelength - i
  const a = seamRand(seed, i)
  const b = seamRand(seed, i + 1)
  return a + (b - a) * ((1 - Math.cos(t * Math.PI)) / 2)
}

// Bruit de valeur non lissé : les valeurs sont reliées à la règle, pas en
// douceur. C'est ce qui donne des pointes franches là où le cosinus ne fait
// que des vagues.
function seamNoiseSharp(seed, pos, wavelength) {
  const i = Math.floor(pos / wavelength)
  const t = pos / wavelength - i
  const a = seamRand(seed, i)
  const b = seamRand(seed, i + 1)
  return a + (b - a) * t
}

// Les accrocs : de loin en loin, la déchirure part bien plus profond, ou
// laisse au contraire une languette qui dépasse. Ce sont eux qu'on lit comme
// « arraché à la main » — sans eux, un bord n'est qu'une ondulation régulière.
// Un accroc au plus par case de SEAM_NICK_STEP px, tiré au sort, en triangle
// pour que la pointe reste franche. On regarde les cases voisines aussi : un
// accroc posé près d'un bord de case déborde dessus.
const SEAM_NICK_STEP = 34

// Une déchirure ne s'énerve pas régulièrement : sur quelques centimètres elle
// part presque droit, puis d'un coup elle vibre dans tous les sens. Cette
// enveloppe, lente, dose tout le détail fin et la force des accrocs — carrée
// pour que les moments calmes soient vraiment calmes et pas une moyenne molle.
function seamRage(seed, pos) {
  const n = seamNoise(seed, pos, 150) * 0.65 + seamNoise(seed + 271, pos, 61) * 0.35
  return 0.25 + 1.9 * n * n
}

function seamNicks(seed, pos, amp) {
  let total = 0
  const cell = Math.floor(pos / SEAM_NICK_STEP)
  for (let i = cell - 1; i <= cell + 1; i++) {
    const draw = seamRand(seed, i * 3)
    if (draw > 0.66) continue
    const center = (i + seamRand(seed, i * 3 + 1)) * SEAM_NICK_STEP
    const size = seamRand(seed, i * 3 + 2)
    // Deux accrocs sur trois creusent en pointe ; le dernier laisse une
    // languette, plus large et plus plate — une languette de papier est un
    // morceau arraché, pas une épine.
    const cut = draw < 0.44
    const half = cut ? 2 + size * 7 : 6 + size * 14
    const d = Math.abs(pos - center)
    if (d >= half) continue
    const fall = cut ? 1 - d / half : 1 - (d / half) * (d / half)
    // Les accrocs suivent l'humeur du bord : ils se serrent et s'enfoncent là
    // où ça vibre, s'effacent là où c'est calme.
    total += (0.4 + draw) * amp * seamRage(seed + 613, center) * (cut ? 1 : -0.45) * fall
  }
  return total
}

// L'axe de la bande reste EXACTEMENT sur la jointure tant qu'on ne la courbe
// pas : une ligne posée est droite, et c'est l'admin qui décide de la pencher.
// Tout l'irrégulier est donc dans la morsure des bords, prise indépendamment
// sur chacun : des creux lents (le bord part et revient), des dents moyennes,
// des petites, des pointes franches, une secousse point par point, et les
// accrocs par-dessus. La bande change de largeur, jamais de cap.
function seamBite(seed, pos, amp) {
  // Le dessin d'ensemble du bord (lent) ne dépend pas de l'humeur ; c'est le
  // détail fin qui s'emballe ou se calme avec elle.
  const slow = seamNoise(seed, pos, 210) * 0.3 + seamNoise(seed + 1543, pos, 47) * 0.22
  const fine =
    seamNoise(seed + 8191, pos, 17) * 0.24 +
    seamNoiseSharp(seed + 33413, pos, 8.5) * 0.18 +
    seamRand(seed + 104729, Math.round(pos * 2)) * 0.12
  return (slow + fine * seamRage(seed + 51001, pos)) * amp + seamNicks(seed + 7919, pos, amp * 0.9)
}

export function seamThicknessValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return SEAM_THICKNESS_DEFAULT
  return Math.max(SEAM_THICKNESS_MIN, Math.min(SEAM_THICKNESS_MAX, value))
}

// Les trois poignées d'une jointure — début, milieu, fin — en % de l'écran par
// rapport à sa position d'origine. Tout à zéro = la ligne droite d'origine.
export function seamShapeValue(entry) {
  const num = (v) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(-SEAM_BEND_MAX, Math.min(SEAM_BEND_MAX, v)) : 0
  return { a: num(entry && entry.a), b: num(entry && entry.b), c: num(entry && entry.c) }
}

// Écart transversal de l'axe de la bande le long de la jointure. Quadratique
// construite pour passer *exactement* par la poignée du milieu : ce qu'on
// attrape à la souris suit le curseur.
function seamCross(shape, t) {
  const mid = 2 * shape.b - (shape.a + shape.c) / 2
  const u = 1 - t
  return u * u * shape.a + 2 * u * t * mid + t * t * shape.c
}

// Repère d'une jointure : `along` court le long de la ligne, `cross` la
// traverse. Une jointure verticale court en Y et se déplace en X, une
// horizontale l'inverse.
function seamAxes(seam, shape, thickness) {
  const vertical = String(seam.key || '').charAt(0) === 'v'
  const alongSize = vertical ? DESIGN_H : DESIGN_W
  const crossSize = vertical ? DESIGN_W : DESIGN_H
  const th = seamThicknessValue(thickness)
  return {
    vertical,
    key: String(seam.key || ''),
    shape: seamShapeValue(shape),
    crossSize,
    start: (seam.a / GRID) * alongSize,
    len: (seam.span / GRID) * alongSize,
    base: (seam.pos / GRID) * crossSize,
    th,
  }
}

// Position transversale de l'axe de la bande à `t` : la jointure, plus la
// courbe tirée à la souris. Les zones voisines se découpent sur cette même
// ligne — c'est elle, la vraie frontière.
function seamCrossAt(axes, t) {
  return axes.base + (seamCross(axes.shape, t) / 100) * axes.crossSize
}

// Un point de l'axe de la bande, en coordonnées maquette.
function seamCenter(axes, t) {
  const along = axes.start + axes.len * t
  const cross = seamCrossAt(axes, t)
  return axes.vertical ? { x: cross, y: along } : { x: along, y: cross }
}

// Les trois poignées, en coordonnées maquette, pour que le builder les pose.
export function seamHandles(seam, shape, thickness) {
  const axes = seamAxes(seam, shape, thickness)
  return [0, 0.5, 1].map((t) => {
    const p = seamCenter(axes, t)
    return { t, x: p.x, y: p.y }
  })
}

// Tirer la déchirure à l'endroit `t` (0 = son début, 1 = sa fin), et pas
// seulement à ses trois points : la courbe n'a que trois inconnues, alors on
// répartit le déplacement dessus au plus juste (moindres carrés). Les poids
// sont ceux de la quadratique elle-même, réécrite en fonction des trois
// points — le point attrapé suit donc exactement le curseur, où qu'il soit.
export function seamShapeDrag(shape, t, delta) {
  const base = seamShapeValue(shape)
  const u = 1 - t
  const w = [u * u - u * t, 4 * u * t, t * t - u * t]
  const norm = w[0] * w[0] + w[1] * w[1] + w[2] * w[2]
  if (norm === 0) return base
  const clamp = (v) => Math.max(-SEAM_BEND_MAX, Math.min(SEAM_BEND_MAX, v))
  return {
    a: clamp(base.a + (delta * w[0]) / norm),
    b: clamp(base.b + (delta * w[1]) / norm),
    c: clamp(base.c + (delta * w[2]) / norm),
  }
}

// La frontière quand il n'y a pas de bande : l'axe de la jointure, mordu d'un
// seul bord. Les deux zones se découpent sur exactement cette ligne, donc
// l'une prend ce que l'autre laisse et le raccord est invisible.
function seamEdgeCross(axes, seed, along) {
  const t = axes.len === 0 ? 0 : (along - axes.start) / axes.len
  const amp = axes.th * 0.55
  return seamCrossAt(axes, Math.max(0, Math.min(1, t))) + seamBite(seed + 7, along, amp) - amp * 0.5
}

// Pas de pas fixe : une jointure courte garde du détail, une longue ne fait pas
// exploser la taille du tracé (le contour part aussi dans un clip-path CSS).
function seamEdgeStep(len) {
  return Math.max(2, len / 420)
}

// Le tracé de cette ligne, pour l'ombre portée le long de la déchirure.
export function seamTearPath(seam, shape, thickness) {
  const axes = seamAxes(seam, shape, thickness)
  const seed = seamSeed(seam.key)
  const steps = Math.max(24, Math.round(axes.len / seamEdgeStep(axes.len)))
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const along = axes.start + (axes.len * i) / steps
    const cross = seamEdgeCross(axes, seed, along)
    pts.push(axes.vertical ? cross.toFixed(1) + ' ' + along.toFixed(1) : along.toFixed(1) + ' ' + cross.toFixed(1))
  }
  return 'M' + pts.join(' L')
}

// La bande complète : le contour fermé à remplir (`d`) et ses deux bords pris
// séparément (`a` et `b`), dont le builder et la TV se servent pour poser
// l'ombre du bord — c'est elle qui donne l'épaisseur de la feuille.
export function seamRibbon(seam, shape, thickness) {
  const axes = seamAxes(seam, shape, thickness)
  const th = axes.th
  const half = th / 2
  const amp = th * 0.55
  const seed = seamSeed(seam.key)
  // Un point tous les 3px de maquette : assez fin pour que les petites dents
  // ressortent, assez large pour que le tracé reste court.
  // Un point tous les 2px de maquette : sans ça les accrocs les plus étroits
  // passeraient entre deux échantillons.
  const steps = Math.max(24, Math.round(axes.len / 2))
  // Largeur de papier qui doit rester quoi qu'il arrive : deux morsures
  // profondes face à face se croiseraient sinon, et la bande se nouerait.
  const minGap = th * 0.16
  const pt = (along, cross) =>
    axes.vertical ? cross.toFixed(1) + ' ' + along.toFixed(1) : along.toFixed(1) + ' ' + cross.toFixed(1)
  const edgeA = []
  const edgeB = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const along = axes.start + axes.len * t
    const cross = seamCrossAt(axes, t)
    let a = cross - half + seamBite(seed + 7, along, amp)
    let b = cross + half - seamBite(seed + 40503, along, amp)
    if (b - a < minGap) {
      const mid = (a + b) / 2
      a = mid - minGap / 2
      b = mid + minGap / 2
    }
    edgeA.push(pt(along, a))
    edgeB.push(pt(along, b))
  }
  return {
    a: 'M' + edgeA.join(' L'),
    b: 'M' + edgeB.join(' L'),
    d: 'M' + edgeA.join(' L') + ' L' + edgeB.slice().reverse().join(' L') + ' Z',
  }
}



// Les jointures : partout où deux zones se touchent. Les morceaux alignés
// (même ligne, bout à bout) sont fusionnés en UNE jointure — sinon une ligne
// qui traverse tout l'écran serait découpée en un morceau par paire de zones,
// chacun avec sa propre déchirure et ses propres poignées, et en courber un
// laisserait les autres derrière.
export function computeSeams(zones) {
  const list = zones || []
  const raw = { v: [], h: [] }
  const push = (type, pos, a, span) => {
    if (span <= 0) return
    raw[type].push({ pos, a, span })
  }
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = list[i]
      const b = list[j]
      const yTop = Math.max(a.y, b.y)
      const ySpan = Math.min(a.y + a.h, b.y + b.h) - yTop
      const xLeft = Math.max(a.x, b.x)
      const xSpan = Math.min(a.x + a.w, b.x + b.w) - xLeft
      if (ySpan > 0) {
        if (a.x + a.w === b.x) push('v', b.x, yTop, ySpan)
        if (b.x + b.w === a.x) push('v', a.x, yTop, ySpan)
      }
      if (xSpan > 0) {
        if (a.y + a.h === b.y) push('h', b.y, xLeft, xSpan)
        if (b.y + b.h === a.y) push('h', a.y, xLeft, xSpan)
      }
    }
  }
  const merge = (type) => {
    const byPos = {}
    for (const seg of raw[type]) {
      if (!byPos[seg.pos]) byPos[seg.pos] = []
      byPos[seg.pos].push(seg)
    }
    const out = []
    for (const pos of Object.keys(byPos)) {
      const segs = byPos[pos].slice().sort((x, y) => x.a - y.a)
      let cur = null
      for (const seg of segs) {
        // Bout à bout compte comme continu : deux morceaux qui se touchent
        // (fin de l'un = début de l'autre) forment une seule déchirure.
        if (cur && seg.a <= cur.a + cur.span) {
          cur.span = Math.max(cur.span, seg.a + seg.span - cur.a)
        } else {
          cur = { pos: Number(pos), a: seg.a, span: seg.span }
          out.push(cur)
        }
      }
    }
    for (const seg of out) seg.key = type + ':' + seg.pos + ':' + seg.a + ':' + seg.span
    return out
  }
  return { v: merge('v'), h: merge('h') }
}

// Quel bord de CHAQUE zone porte une jointure visible : la zone s'en sert pour
// écarter son contenu de la bande qui passe dessus (voir ZoneRenderer).
export function zoneSeamEdges(zones, hiddenSeams, seams) {
  const hidden = {}
  for (const key of hiddenSeams || []) hidden[key] = true
  const found = seams || computeSeams(zones)
  const map = {}
  const mark = (zone, side) => {
    if (!map[zone.id]) map[zone.id] = {}
    map[zone.id][side] = true
  }
  for (const zone of zones || []) {
    for (const s of found.v) {
      if (hidden[s.key]) continue
      if (Math.min(zone.y + zone.h, s.a + s.span) - Math.max(zone.y, s.a) <= 0) continue
      if (s.pos === zone.x) mark(zone, 'left')
      if (s.pos === zone.x + zone.w) mark(zone, 'right')
    }
    for (const s of found.h) {
      if (hidden[s.key]) continue
      if (Math.min(zone.x + zone.w, s.a + s.span) - Math.max(zone.x, s.a) <= 0) continue
      if (s.pos === zone.y) mark(zone, 'top')
      if (s.pos === zone.y + zone.h) mark(zone, 'bottom')
    }
  }
  return map
}

// Les deux zones qui bordent une déchirure ne s'arrêtent plus à leur
// rectangle : elles se découpent sur la ligne de la déchirure. Là où elle
// penche, l'une mange un morceau de l'autre — c'est ce qui fait que le papier
// a l'air posé par-dessus plutôt que collé sur une grille.
//
// Renvoie de combien la peinture de la zone déborde de son rectangle (en % de
// ce rectangle, prêt pour des `inset` négatifs) et le contour à découper, ou
// null quand toutes ses déchirures sont droites : la zone garde alors très
// exactement son rendu d'avant.
const SEAM_CLIP_STEPS = 24
const SEAM_CLIP_OVERLAP = 1.5

export function zoneSeamClip(zone, seams, seamShape, thickness, hiddenSeams, mode) {
  if (!zone || !seams) return null
  const jagged = mode === 'edge'
  const hidden = {}
  for (const key of hiddenSeams || []) hidden[key] = true
  const shapes = seamShape || {}
  const zx = (zone.x / GRID) * DESIGN_W
  const zy = (zone.y / GRID) * DESIGN_H
  const zw = (zone.w / GRID) * DESIGN_W
  const zh = (zone.h / GRID) * DESIGN_H

  // La jointure qui court sur ce bord de la zone, si elle est visible et
  // qu'elle a été courbée.
  const sideSeam = (vertical, pos) => {
    const found = (vertical ? seams.v : seams.h).find((s) => {
      if (hidden[s.key] || s.pos !== pos) return false
      const from = vertical ? zone.y : zone.x
      const to = vertical ? zone.y + zone.h : zone.x + zone.w
      return Math.min(to, s.a + s.span) - Math.max(from, s.a) > 0
    })
    if (!found) return null
    const shape = seamShapeValue(shapes[found.key])
    // Sans bande, la découpe sert TOUJOURS : c'est elle qui dessine la
    // déchirure. Avec une bande, une jointure droite n'a rien à découper — la
    // zone garde alors très exactement son rendu d'avant.
    if (!jagged && shape.a === 0 && shape.b === 0 && shape.c === 0) return null
    return { seam: found, axes: seamAxes(found, shape, thickness), seed: seamSeed(found.key) }
  }

  const sides = {
    top: sideSeam(false, zone.y),
    bottom: sideSeam(false, zone.y + zone.h),
    left: sideSeam(true, zone.x),
    right: sideSeam(true, zone.x + zone.w),
  }
  if (!sides.top && !sides.bottom && !sides.left && !sides.right) return null

  // Où passe la frontière sur ce bord, échantillonnée entre `from` et `to`
  // (coordonnées maquette le long du bord). `outward` dit de quel côté la zone
  // déborde : +1 quand la zone est avant la ligne (bord droit/bas), -1 après.
  const boundary = (side, from, to, outward) => {
    // La courbe lisse suffit sous une bande (elle cache le raccord) ; la
    // déchirure nue, elle, doit être échantillonnée assez fin pour que ses
    // dents survivent au clip-path.
    const steps = jagged
      ? Math.max(SEAM_CLIP_STEPS, Math.round((to - from) / seamEdgeStep(side.axes.len)))
      : SEAM_CLIP_STEPS
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const along = from + ((to - from) * i) / steps
      const t = side.axes.len === 0 ? 0 : (along - side.axes.start) / side.axes.len
      const cross = jagged
        ? seamEdgeCross(side.axes, side.seed, along)
        : seamCrossAt(side.axes, Math.max(0, Math.min(1, t)))
      pts.push({ along, cross: cross + outward * SEAM_CLIP_OVERLAP })
    }
    return pts
  }

  const edges = {
    top: sides.top ? boundary(sides.top, zx, zx + zw, -1) : null,
    bottom: sides.bottom ? boundary(sides.bottom, zx, zx + zw, 1) : null,
    left: sides.left ? boundary(sides.left, zy, zy + zh, -1) : null,
    right: sides.right ? boundary(sides.right, zy, zy + zh, 1) : null,
  }

  // Débordement : ce que la frontière prend au-delà du rectangle, plus de quoi
  // passer sous la bande de papier.
  const over = (pts, base, sign) => {
    if (!pts) return 0
    let max = 0
    for (const p of pts) max = Math.max(max, sign * (p.cross - base))
    return Math.max(0, max)
  }
  const spillPx = {
    top: over(edges.top, zy, -1),
    bottom: over(edges.bottom, zy + zh, 1),
    left: over(edges.left, zx, -1),
    right: over(edges.right, zx + zw, 1),
  }

  const boxX = zx - spillPx.left
  const boxY = zy - spillPx.top
  const boxW = zw + spillPx.left + spillPx.right
  const boxH = zh + spillPx.top + spillPx.bottom
  const px = (x) => (((x - boxX) / boxW) * 100).toFixed(2) + '%'
  const py = (y) => (((y - boxY) / boxH) * 100).toFixed(2) + '%'
  const corner = (x, y) => px(x) + ' ' + py(y)

  const points = []
  // Sens horaire, en partant du coin haut-gauche : haut, droite, bas, gauche.
  if (edges.top) for (const p of edges.top) points.push(corner(p.along, p.cross))
  else points.push(corner(zx, zy), corner(zx + zw, zy))
  if (edges.right) for (const p of edges.right) points.push(corner(p.cross, p.along))
  else points.push(corner(zx + zw, zy), corner(zx + zw, zy + zh))
  if (edges.bottom) for (let i = edges.bottom.length - 1; i >= 0; i--) points.push(corner(edges.bottom[i].along, edges.bottom[i].cross))
  else points.push(corner(zx + zw, zy + zh), corner(zx, zy + zh))
  if (edges.left) for (let i = edges.left.length - 1; i >= 0; i--) points.push(corner(edges.left[i].cross, edges.left[i].along))
  else points.push(corner(zx, zy + zh), corner(zx, zy))

  return {
    // En % du rectangle de la zone : la couche de peinture se pose en
    // `inset` négatifs, le contenu ne bouge pas.
    spill: {
      top: (spillPx.top / zh) * 100,
      bottom: (spillPx.bottom / zh) * 100,
      left: (spillPx.left / zw) * 100,
      right: (spillPx.right / zw) * 100,
    },
    clipPath: 'polygon(' + points.join(', ') + ')',
  }
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

export function validateGridConfig(gridConfig) {
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
export function validateBadgeConfig(badgeConfig) {
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
export function validateBackgroundConfig(bg) {
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
export function validateBackgroundStyle(style) {
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
  if (style.zoneLayout !== undefined) {
    errors.push(...validateZoneLayout(style.zoneLayout, 'backgroundStyle.zoneLayout'))
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
  // Mise en forme de la zone : chaque réglage remplace une valeur qui était
  // codée en dur. Absent = on garde cette valeur.
  for (const [key, limits] of Object.entries(ZONE_STYLE_LIMITS)) {
    if (style[key] === undefined || style[key] === null) continue
    if (!isNum(style[key]) || style[key] < limits.min || style[key] > limits.max) {
      errors.push(`backgroundStyle.${key} must be a number between ${limits.min} and ${limits.max}`)
    }
  }
  for (const key of ['border', 'textMuted']) {
    if (style[key] !== undefined && style[key] !== null && !isColor(style[key])) {
      errors.push(`backgroundStyle.${key} must be a valid color`)
    }
  }
  if (style.fontFamily !== undefined && style.fontFamily !== null && typeof style.fontFamily !== 'string') {
    errors.push('backgroundStyle.fontFamily must be a string')
  }
  if (style.decorations !== undefined) {
    errors.push(...validateZoneDecorations(style.decorations, 'backgroundStyle.decorations'))
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

// Décor d'une zone : des images de la Bibliothèque posées sur ses bords.
export function validateZoneDecorations(decorations, path) {
  if (decorations === undefined || decorations === null) return []
  if (!Array.isArray(decorations)) return [`${path} must be an array`]
  const errors = []
  if (decorations.length > ZONE_DECORATIONS_MAX) {
    errors.push(`${path} is limited to ${ZONE_DECORATIONS_MAX} entries`)
  }
  const seenIds = new Set()
  decorations.forEach((dec, i) => {
    const p = `${path}[${i}]`
    if (!dec || typeof dec !== 'object' || Array.isArray(dec)) {
      errors.push(`${p} must be an object`)
      return
    }
    if (typeof dec.id !== 'string' || dec.id.trim() === '') {
      errors.push(`${p}.id must be a non-empty string`)
    } else if (seenIds.has(dec.id)) {
      errors.push(`${path} contains duplicate id "${dec.id}"`)
    } else {
      seenIds.add(dec.id)
    }
    // imageUrl obligatoire : une décoration sans image ne rendrait rien et
    // resterait dans le JSON sans qu'on comprenne pourquoi.
    if (typeof dec.imageUrl !== 'string' || dec.imageUrl.trim() === '') {
      errors.push(`${p}.imageUrl is required`)
    } else if (dec.imageUrl.length > IMAGE_URL_MAX) {
      errors.push(`${p}.imageUrl is too long`)
    }
    if (!ZONE_DECORATION_EDGES.includes(dec.edge)) {
      errors.push(`${p}.edge must be one of ${ZONE_DECORATION_EDGES.join(', ')}`)
    }
    if (dec.repeat !== undefined && !ZONE_DECORATION_REPEATS.includes(dec.repeat)) {
      errors.push(`${p}.repeat must be one of ${ZONE_DECORATION_REPEATS.join(', ')}`)
    }
    if (dec.size !== undefined && (!isNum(dec.size) || dec.size < DECORATION_SIZE_MIN || dec.size > DECORATION_SIZE_MAX)) {
      errors.push(`${p}.size must be a number between ${DECORATION_SIZE_MIN} and ${DECORATION_SIZE_MAX}`)
    }
    if (dec.opacity !== undefined && (!isNum(dec.opacity) || dec.opacity < 0 || dec.opacity > 1)) {
      errors.push(`${p}.opacity must be a number between 0 and 1`)
    }
  })
  return errors
}

// Dessin d'une carte. refW/refH = taille de référence en px (celle de la
// cellule au moment du dessin) : les tailles de police sont exprimées dans ce
// repère, le rendu TV les remet à l'échelle de la cellule réelle. x/y/w/h sont
// des % de la carte, jamais des px.
export function validateCardLayout(layout, path) {
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
export function validateCardLayouts(map, path) {
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
export function validateElementsConfig(elements) {
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
    if (el.type !== 'text' && el.type !== undefined && (typeof el.imageUrl !== 'string' || el.imageUrl.trim() === '')) {
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
    if (el.curve !== undefined && (!isNum(el.curve) || el.curve < -EL_CURVE_MAX || el.curve > EL_CURVE_MAX)) {
      errors.push(`${p}.curve must be a number between ${-EL_CURVE_MAX} and ${EL_CURVE_MAX}`)
    }
    // Réglages des éléments dessinés (image/logo/icône). Tous facultatifs :
    // absents, elementVisualStyle() retombe sur l'ancien rendu.
    if (el.align !== undefined && !CARD_ALIGNS.includes(el.align)) {
      errors.push(`${p}.align must be one of ${CARD_ALIGNS.join(', ')}`)
    }
    if (el.fit !== undefined && !ELEMENT_FITS.includes(el.fit)) {
      errors.push(`${p}.fit must be one of ${ELEMENT_FITS.join(', ')}`)
    }
    if (el.bgShape !== undefined && !ELEMENT_BG_SHAPES.includes(el.bgShape)) {
      errors.push(`${p}.bgShape must be one of ${ELEMENT_BG_SHAPES.join(', ')}`)
    }
    if (el.bgColor !== undefined && !isColor(el.bgColor)) {
      errors.push(`${p}.bgColor must be a valid color`)
    }
    if (el.padding !== undefined && (!isNum(el.padding) || el.padding < 0 || el.padding > EL_PADDING_MAX)) {
      errors.push(`${p}.padding must be a number between 0 and ${EL_PADDING_MAX}`)
    }
    if (el.opacity !== undefined && (!isNum(el.opacity) || el.opacity < 0 || el.opacity > 1)) {
      errors.push(`${p}.opacity must be a number between 0 and 1`)
    }
  })
  return errors
}

// Disposition d'une zone : la même géométrie que les slots de carte, avec son
// propre vocabulaire (titre, répéteur de produits, décor).
export function validateZoneLayout(layout, path) {
  if (layout === undefined || layout === null) return []
  if (typeof layout !== 'object' || Array.isArray(layout)) return [`${path} must be an object`]
  const errors = []
  if (!Array.isArray(layout.slots)) {
    errors.push(`${path}.slots must be an array`)
    return errors
  }
  if (layout.slots.length > CARD_SLOTS_MAX) {
    errors.push(`${path}.slots is limited to ${CARD_SLOTS_MAX} entries`)
  }
  const seenIds = new Set()
  const seenSingletons = new Set()
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
    if (!ZONE_SLOT_TYPES.includes(slot.type)) {
      errors.push(`${p}.type must be one of ${ZONE_SLOT_TYPES.join(', ')}`)
    } else if (ZONE_SINGLETON_SLOTS.includes(slot.type)) {
      if (seenSingletons.has(slot.type)) {
        errors.push(`${path}.slots can only hold one "${slot.type}" slot`)
      }
      seenSingletons.add(slot.type)
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
    if (slot.titleStyle !== undefined && !ZONE_TITLE_STYLES.includes(slot.titleStyle)) {
      errors.push(`${p}.titleStyle must be one of ${ZONE_TITLE_STYLES.join(', ')}`)
    }
    if (slot.fontSize !== undefined && (!isNum(slot.fontSize) || slot.fontSize < 4 || slot.fontSize > FONT_SIZE_MAX_TEXT)) {
      errors.push(`${p}.fontSize must be a number between 4 and ${FONT_SIZE_MAX_TEXT}`)
    }
    if (slot.zIndex !== undefined && !Number.isInteger(slot.zIndex)) {
      errors.push(`${p}.zIndex must be an integer`)
    }
    if (slot.opacity !== undefined && (!isNum(slot.opacity) || slot.opacity < 0 || slot.opacity > 1)) {
      errors.push(`${p}.opacity must be a number between 0 and 1`)
    }
    for (const f of ['color', 'bg']) {
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
    if (slot.type === 'text' && (typeof slot.text !== 'string' || slot.text.trim() === '')) {
      errors.push(`${p}.text is required for a "text" slot`)
    }
    if (slot.imageUrl !== undefined && slot.imageUrl !== null) {
      if (typeof slot.imageUrl !== 'string' || slot.imageUrl.trim() === '') {
        errors.push(`${p}.imageUrl must be a non-empty string or null`)
      } else if (slot.imageUrl.length > IMAGE_URL_MAX) {
        errors.push(`${p}.imageUrl is too long`)
      }
    }
    if (slot.fit !== undefined && !CARD_FITS.includes(slot.fit)) {
      errors.push(`${p}.fit must be "contain" or "cover"`)
    }
  })
  // Une disposition qui ne pose pas les produits cacherait tout le contenu de
  // la zone sans le dire : on la refuse plutôt que de laisser publier un écran
  // vide.
  if (layout.slots.length > 0 && !seenSingletons.has('products')) {
    errors.push(`${path}.slots must include a "products" slot`)
  }
  return errors
}

// Boîtes des produits d'une zone en placement libre. En mode « auto » les
// champs sont ignorés : une zone qui repasse en grille garde ses boîtes en
// base sans qu'elles aient à être valides.
export function validateZoneItems(items, layoutMode) {
  if (layoutMode !== 'free') return []
  if (items === undefined || items === null) return []
  if (!Array.isArray(items)) return ['items must be an array']
  const errors = []
  items.forEach((it, i) => {
    const p = `items[${i}]`
    if (!it || typeof it !== 'object' || Array.isArray(it)) {
      errors.push(`${p} must be an object`)
      return
    }
    // Une boîte entièrement absente est tolérée : le rendu retombe sur la
    // tuile par défaut. Une boîte à moitié remplie, elle, est une erreur.
    const given = ['x', 'y', 'w', 'h'].filter((f) => it[f] !== undefined && it[f] !== null)
    if (given.length === 0) return
    if (given.length < 4) {
      errors.push(`${p} needs x, y, w and h together in a free zone`)
      return
    }
    for (const f of ['x', 'y']) {
      if (!isNum(it[f]) || it[f] < FREE_ITEM_POS_MIN || it[f] > FREE_ITEM_POS_MAX) {
        errors.push(`${p}.${f} must be a number between ${FREE_ITEM_POS_MIN} and ${FREE_ITEM_POS_MAX}`)
      }
    }
    for (const f of ['w', 'h']) {
      if (!isNum(it[f]) || it[f] < FREE_ITEM_MIN || it[f] > FREE_ITEM_MAX) {
        errors.push(`${p}.${f} must be a number between ${FREE_ITEM_MIN} and ${FREE_ITEM_MAX}`)
      }
    }
  })
  return errors
}

// Validation d'une zone complète (hors chevauchement avec ses voisines, qui se
// vérifie au niveau du layout, pas de la zone seule).
export function validateZoneFields(body) {
  const errors = []
  const b = body || {}
  if (b.zoneType !== undefined && !ZONE_TYPES.includes(b.zoneType)) {
    errors.push(`zoneType must be one of ${ZONE_TYPES.join(', ')}`)
  }
  if (b.cardTemplate !== undefined && !CARD_TEMPLATES.includes(b.cardTemplate)) {
    errors.push(`cardTemplate must be one of ${CARD_TEMPLATES.join(', ')}`)
  }
  if (b.layoutMode !== undefined && !ZONE_LAYOUT_MODES.includes(b.layoutMode)) {
    errors.push(`layoutMode must be one of ${ZONE_LAYOUT_MODES.join(', ')}`)
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
  if (b.items !== undefined) {
    errors.push(...validateZoneItems(b.items, b.layoutMode))
  }
  return errors
}
