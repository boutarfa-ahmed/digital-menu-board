# TV Menu Design System — Galaxy Food

## Color Palette

### Base
--bg-dark: #0D0D0D        /* charcoal black, textured bg */
--bg-light: #F5F3EF        /* off-white/paper panel bg */
--bg-smoke-overlay: rgba(30,30,30,0.6)  /* smoke/grunge overlay on dark */

### Accent
--accent-primary: #FF5A1F   /* orange-red, titles/CTA (ex: "TACOS") */
--accent-secondary: #E8232A /* deep red, alt highlight */

### Text
--text-on-dark: #FFFFFF
--text-on-light: #1A1A1A
--text-muted: #8A8A8A

### Price Badge
--badge-bg: #FFFFFF (torn paper texture)
--badge-text: #0D0D0D
--badge-shadow: rgba(0,0,0,0.25)

### Panel Split (Formulas style — image2/3)
--panel-dark-bg: #0D0D0D
--panel-light-bg: #FAFAFA
--panel-price-tag-bg: #0D0D0D  /* black tag, white text, top corner */

## Typography

### Headers (titles, section names)
font-family: 'Anton', 'Bebas Neue', sans-serif  → Google Fonts
text-transform: uppercase
letter-spacing: 0.02em
weight: 700-900

### Body / Labels / Descriptions
font-family: 'Inter', 'Poppins', sans-serif
weight: 400 (desc), 600 (item names)

### Price numbers
font-family: same as headers OR distinct bold serif for "stamped ticket" feel
- integer size larger, decimals (,50/,90) smaller superscript style
  (visible in images: "8,50€" → "8" big, ",50€" smaller)

## Effects & Textures

1. **Torn paper divider**: irregular jagged edge between zones/panels
   → implement as SVG clip-path or PNG mask overlay, white or matching bg color
   
2. **Price tag / stamp badge**: 
   - white rectangle, slightly rotated (-2° to 2°) OR straight
   - subtle drop shadow (0 4px 8px rgba(0,0,0,.25))
   - torn/ripped top edge on some badges (image1 "1 Meat 8,50€")

3. **Food image cutout**: product images on transparent bg, no visible container box,
   subtle drop shadow beneath for depth

4. **Smoke/fire accents** (optional, hero zones only): decorative smoke wisps
   behind hero product image (image1 tacos) — low priority, nice-to-have

5. **Category badge** (small circular/rounded icons for icon-label template):
   white or light circle bg, product icon centered, label below in caps

## Card Template Visual Specs

### icon-label (Meat/Sauces/Extra grid)
- Circular or rounded-square container, food icon centered (80-100px)
- Label below: uppercase, bold, 14-16px
- Grid gap: 16-24px

### image-title-desc-price (Formulas)
- Image left/right (120-160px), text block adjacent
- Title: uppercase bold 18-20px
- Description: muted, 12-14px, max 2-3 lines
- No visible price per card (price is per-panel badge, top)

### text-only (Salad Formulas style)
- Title: colored (green/accent) bold uppercase
- Description: regular weight, readable line-height 1.4

### list-row-price-qty (Extras/Desserts)
- Horizontal row: thumbnail (60-80px) — name — qty badge (circular, accent bg) — price (right-aligned, bold)

### hero-banner
- Full-bleed image, gradient overlay bottom for text legibility
- Title overlay: large, bold, accent color
- Price tag: bottom-right or bottom-left, stamped badge style

## Spacing & Layout
- Zone padding: 32-48px
- Section title margin-bottom: 24px
- Card grid gap: 16-24px depending on density