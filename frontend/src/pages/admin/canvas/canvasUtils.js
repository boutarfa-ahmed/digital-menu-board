// Pure helpers for the screen-layout canvas: grid geometry, seam detection,
// image trimming and the publish pre-check the backend also enforces.
// Extracted verbatim from ScreenLayoutCanvas.jsx — logic unchanged.

import { GRID, REQUIRES_GRID, CONTENT_ZONE_TYPES } from './constants'

export const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

export const gpt = (g) => `${(g * 100) / 12}%`

// Torn-paper dividers between adjacent zones (mirrors frontend-tv ZoneSeams).
// Keys must match the TV: `${type}:${pos}:${a}:${span}`. `onToggle` (when
// provided) makes lines clickable in the Fond preview to hide them per line;
// otherwise markers are display-only (pointer-events none).
export function computeSeamsAdmin(zones) {
  const v = []
  const h = []
  const push = (list, type, pos, a, span) => {
    const key = `${type}:${pos}:${a}:${span}`
    if (!list.some((x) => x.key === key)) list.push({ pos, a, span, key })
  }
  for (let i = 0; i < zones.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = zones[i]
      const b = zones[j]
      const yTop = Math.max(a.y, b.y)
      const ySpan = Math.min(a.y + a.h, b.y + b.h) - yTop
      const xLeft = Math.max(a.x, b.x)
      const xSpan = Math.min(a.x + a.w, b.x + b.w) - xLeft
      if (ySpan > 0) {
        if (a.x + a.w === b.x) push(v, 'v', b.x, yTop, ySpan)
        if (b.x + b.w === a.x) push(v, 'v', a.x, yTop, ySpan)
      }
      if (xSpan > 0) {
        if (a.y + a.h === b.y) push(h, 'h', b.y, xLeft, xSpan)
        if (b.y + b.h === a.y) push(h, 'h', a.y, xLeft, xSpan)
      }
    }
  }
  return { v, h }
}

export const seamLabel = (s) => {
  if (s.key.startsWith('v')) {
    return `Ligne verticale · x ${s.pos} (de ${s.a} à ${s.a + s.span})`
  }
  return `Ligne horizontale · y ${s.pos} (de ${s.a} à ${s.a + s.span})`
}

export function backgroundCss(bg) {
  if (!bg) return null
  if (bg.type === 'image' && bg.imageUrl) {
    return {
      backgroundImage: `url("${bg.imageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  return null
}

// Free-floating image elements: a PNG/WEBP export often carries transparent
// padding around the actual drawing (e.g. a torn-paper sticker on a square
// canvas). Since the element's box/frame is exactly the uploaded image's own
// pixel dimensions, that padding used to end up INSIDE the box too — the
// visible artwork never really reached an edge or corner. Trim it once here,
// at upload time, so the stored image (and thus the frame) hugs only the
// non-transparent pixels.
const TRIM_ALPHA_THRESHOLD = 10
export async function trimTransparentPadding(file) {
  if (!/png|webp/.test(file.type || '')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

    let minX = canvas.width
    let minY = canvas.height
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] > TRIM_ALPHA_THRESHOLD) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    const nothingVisible = maxX < 0
    const nothingToTrim = minX === 0 && minY === 0 && maxX === canvas.width - 1 && maxY === canvas.height - 1
    if (nothingVisible || nothingToTrim) return file

    const w = maxX - minX + 1
    const h = maxY - minY + 1
    const trimmed = document.createElement('canvas')
    trimmed.width = w
    trimmed.height = h
    trimmed.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h)
    const blob = await new Promise((resolve) => trimmed.toBlob(resolve, 'image/png'))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.png'), { type: 'image/png' })
  } catch {
    return file
  }
}

export function findFreePosition(zones, w, h) {
  for (let y = 0; y <= GRID - h; y += 1) {
    for (let x = 0; x <= GRID - w; x += 1) {
      const rect = { x, y, w, h }
      if (!zones.some((z) => overlaps(rect, z))) return { x, y }
    }
  }
  return null
}

export function validateLayoutForPublish(layout) {
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
