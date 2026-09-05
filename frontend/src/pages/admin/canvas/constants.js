// Constantes du canvas de mise en page.
//
// Le vocabulaire (types de zone, gabarits de carte, badges, éléments...), les
// limites et les valeurs par défaut viennent du schéma partagé — le même
// fichier que le backend et la TV utilisent. Ce fichier ne garde que ce qui
// est propre à l'interface d'édition : couleurs de pastilles, poignées de
// redimensionnement, dispositions prêtes à l'emploi.
//
// Original du schéma : shared/menu-schema.js — regénérer : npm run sync:schema
// Ne jamais éditer src/shared/menuSchema.js à la main (fichier généré).

import {
  DESIGN_W,
  DESIGN_H,
  REQUIRES_GRID_CONFIG,
} from '../../../shared/menuSchema'

// Réexporté tel quel : les écrans du builder importent depuis ce fichier
// depuis toujours, inutile de leur faire connaître le chemin du schéma.
export {
  GRID,
  CONTENT_ZONE_TYPES,
  DEFAULT_CONTENT_BOX,
  CONTENT_BOX_MIN,
  EL_IMAGE_MAX_PX,
  ZONE_TYPE_LABELS,
  CARD_TEMPLATES,
  CARD_TEMPLATE_LABELS,
  ELEMENT_KINDS,
  ELEMENT_KIND_LABELS,
  FONT_OPTIONS,
  FONT_SIZES,
  BADGE_TYPES,
  BADGE_TYPE_LABELS,
  BADGE_STYLES,
  BADGE_STYLE_LABELS,
  BADGE_POSITIONS,
  BADGE_POSITION_LABELS,
  STYLE_DEFAULTS,
  BG_PATTERNS,
  BG_PATTERN_LABELS,
  BG_DEFAULTS,
} from '../../../shared/menuSchema'

// Nom historique côté builder de REQUIRES_GRID_CONFIG.
export const REQUIRES_GRID = REQUIRES_GRID_CONFIG

// Les éléments libres sont stockés en % de la maquette 1920x1080 (voir
// frontend-tv/src/components/layout/FreeElementsLayer.jsx). Ils s'éditent en px
// dans cette interface, d'où les conversions dans les deux sens.
export const EL_DESIGN_W = DESIGN_W
export const EL_DESIGN_H = DESIGN_H
export const pxToPctW = (px) => (px / EL_DESIGN_W) * 100
export const pxToPctH = (px) => (px / EL_DESIGN_H) * 100
export const pctToPxW = (pct) => Math.round((pct / 100) * EL_DESIGN_W)
export const pctToPxH = (pct) => Math.round((pct / 100) * EL_DESIGN_H)

// ---------------------------------------------------------------------------
// Propre à l'interface d'édition
// ---------------------------------------------------------------------------

export const ZONE_TYPE_COLORS = {
  menu: 'info',
  grid: 'primary',
  list: 'success',
  carousel: 'light',
  banner: 'info',
  hero: 'primary',
  highlight: 'success',
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

// Éléments libres : le cadre de sélection flotte à outline-offset-[7.5px] de
// l'élément sur CHAQUE côté (voir la surcouche « Éléments »), donc sa taille
// finale vaut celle de l'élément + 15px au total (un élément 500x400 obtient un
// cadre ~515x415) au lieu de coller à l'image/au texte. Les poignées sont
// décalées pour se poser sur cet anneau (7.5px d'offset + ~1px de demi-trait +
// la moitié des 10px de la poignée).
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
