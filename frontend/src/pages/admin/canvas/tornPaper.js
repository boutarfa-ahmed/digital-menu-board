// Le bord déchiré des badges. La bande déchirée des jointures, elle, vit
// maintenant dans le schéma partagé (shared/menu-schema.js) : le builder et la
// TV en tirent la même silhouette et la même texture depuis une seule copie.

// Ragged top edge, used as a clip-path on badges.
export const TORN_CLIP =
  'polygon(0% 0%, 2.4% 7%, 4.6% 1.5%, 8% 9%, 10.5% 2%, 14% 8%, 16.8% 0.5%, 20% 7%, 23% 2.5%, 26.5% 9.5%, 29% 1.5%, 32.5% 7.5%, 35% 0%, 100% 0%, 100% 100%, 0% 100%)'
