// T7.7 — shared field derivation + accent helpers for the card templates.
// Cards consume a MenuItem + theme + badgeConfig as props.

// Derive the display fields from a MenuItem (backend shape: images[] JSON,
// legacy imageUrl cover, price float).
export function cardFields(item) {
  const it = item || {}
  return {
    name: it.name || '',
    description: it.description || '',
    price: typeof it.price === 'number' ? it.price : null,
    imageUrl: (Array.isArray(it.images) && it.images[0]) || it.imageUrl || null,
  }
}

// Accent color: prefer an explicit theme override, fall back to the runtime
// --menu-accent token set on the screen root.
export function accentOf(theme) {
  return (theme && theme.colors && theme.colors.primary) || 'var(--menu-accent)'
}

// T7.7b — per-zone card template variants (admin: default/compact/large/
// minimal/media). Resolves the variant to a size scale + behavior flags so the
// cards can tweak paddings/sizes/chrome without duplicating structure.
export const CARD_TEMPLATES = ['default', 'compact', 'large', 'minimal', 'media', 'icon-label', 'text-only', 'image-title-desc-price']

export function templateStyle(template) {
  const t = CARD_TEMPLATES.includes(template) ? template : 'default'
  const scale = { compact: 0.82, large: 1.18, media: 1.1, minimal: 1, default: 1, 'icon-label': 1, 'text-only': 1, 'image-title-desc-price': 1 }[t]
  return {
    scale,
    compact: t === 'compact',
    large: t === 'large',
    media: t === 'media',
    minimal: t === 'minimal',
  }
}
