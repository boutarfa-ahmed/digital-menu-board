// Modèle de la carte, côté builder.
//
// Une carte n'est pas un arrangement codé en dur : c'est une liste de slots
// (photo, nom, description, prix, ...) positionnés en % de la carte. Les
// tailles de police, elles, sont en px — mais dans le repère refW/refH (la
// taille réelle de la cellule au moment du dessin). Le rendu TV convertit ces
// px en `cqw` : 24px dessinés sur une carte de 400px restent 6% de la largeur
// de la carte, quelle que soit la taille réelle de la cellule.
//
// Tout le modèle vit dans le schéma partagé (backend + TV + builder). Ce
// fichier ne fait que le réexporter sous les noms que le builder utilise
// depuis toujours, plus le repli propre à l'éditeur.
//
// Original du schéma : shared/menu-schema.js — regénérer : npm run sync:schema

import {
  CARD_SLOT_LABELS,
  defaultCardLayout,
  resolveCardLayout,
} from '../../../shared/menuSchema'

export {
  SINGLETON_SLOTS,
  TEXT_SLOTS,
  cardCellSize,
  defaultCardLayout,
  newSlot,
  hasOwnCardLayout,
  pruneCardLayouts,
  clampPct,
  sanitizeBackgroundStyle,
} from '../../../shared/menuSchema'

// Nom historique côté builder.
export const SLOT_LABELS = CARD_SLOT_LABELS

// Dessin appliqué à un produit : sa surcharge si elle existe, sinon celui de la
// zone, sinon la disposition de départ. L'éditeur a toujours besoin d'un dessin
// à afficher — contrairement à la TV, qui se contente des slots par défaut.
export function cardLayoutFor(zone, itemId) {
  return resolveCardLayout(zone, itemId) || defaultCardLayout(zone)
}
