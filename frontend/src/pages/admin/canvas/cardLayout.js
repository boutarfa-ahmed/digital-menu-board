// T10 — modèle de la carte « personnalisée ».
//
// Une carte custom n'est plus un arrangement codé en dur : c'est une liste de
// slots (photo, nom, description, prix, ...) positionnés en % de la carte.
// Les tailles de police, elles, sont en px — mais dans le repère `refW/refH`
// (la taille réelle de la cellule au moment du dessin). Le rendu TV convertit
// ces px en unités `cqw` : 24px dessinés sur une carte de 400px restent 6% de
// la largeur de la carte, quelle que soit la taille réelle de la cellule.
//
// Garder en phase avec frontend-tv/src/components/cards/CustomCard.jsx.

import { GRID, CONTENT_BOX_MIN } from './constants'

export const CARD_DESIGN_W = 1920
export const CARD_DESIGN_H = 1080

export const SLOT_TYPES = ['image', 'name', 'desc', 'price', 'qty', 'zoneBadge', 'text', 'shape', 'asset']

export const SLOT_LABELS = {
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
// photo ou le prix). Texte libre, formes et images libres sont, eux, illimités.
export const SINGLETON_SLOTS = ['image', 'name', 'desc', 'price', 'qty', 'zoneBadge']

export const TEXT_SLOTS = ['name', 'desc', 'text']

// Taille réelle (en px de la maquette 1920x1080) d'une carte de cette zone :
// la cellule de la grille, ou une ligne de la liste. Sert de repère aux
// tailles de police ET de format à la zone de dessin, pour que l'éditeur
// montre exactement les proportions de l'écran.
export function cardCellSize(zone) {
  const zoneW = ((zone?.w || 1) / GRID) * CARD_DESIGN_W
  const zoneH = ((zone?.h || 1) / GRID) * CARD_DESIGN_H
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

// Disposition de départ : reprend ce que fait la carte « Par défaut » côté TV
// (photo en haut, nom dessous, badge prix collé au coin haut-droit) plus la
// description sous le nom. Tous les slots partent visibles : un produit sans
// description n'affiche rien à cet endroit de toute façon, alors qu'un slot
// masqué par défaut donne l'impression que la description ne marche pas.
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

// Dessin appliqué à un produit : sa surcharge si elle existe, sinon celui de
// la zone, sinon la disposition de départ.
export function cardLayoutFor(zone, itemId) {
  const bs = zone?.backgroundStyle || {}
  const own = itemId != null ? bs.cardLayouts?.[String(itemId)] : null
  if (own && Array.isArray(own.slots)) return own
  if (bs.cardLayout && Array.isArray(bs.cardLayout.slots)) return bs.cardLayout
  return defaultCardLayout(zone)
}

export function hasOwnCardLayout(zone, itemId) {
  const own = zone?.backgroundStyle?.cardLayouts?.[String(itemId)]
  return !!(own && Array.isArray(own.slots))
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

export const clampPct = (v, min, max) => Math.max(min, Math.min(max, Math.round(v * 10) / 10))

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
