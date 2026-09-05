// T7.8 — zone renderer: renders one zone's content from its zoneType /
// cardTemplate / gridConfig using the T7.7 card components. The zone wrapper
// applies the T7.4 backgroundStyle overrides (bg/text/accent) as scoped tokens.
import ImageTitleDescPriceCard from '../cards/ImageTitleDescPriceCard.jsx'
import ListRowCard from '../cards/ListRowCard.jsx'
import HeroBannerCard from '../cards/HeroBannerCard.jsx'
import IconLabelCard from '../cards/IconLabelCard.jsx'
import TextOnlyCard from '../cards/TextOnlyCard.jsx'
import CustomCard from '../cards/CustomCard.jsx'
import CategoryBanner from '../primitives/CategoryBanner.jsx'
import ZoneBadge from '../ui/ZoneBadge.jsx'
import { accentOf, cardFields, templateStyle } from '../cards/cardUtils.js'
import PriceBadge from '../primitives/PriceBadge.jsx'
import TierPricingHeader from '../primitives/TierPricingHeader.jsx'
import { badgeStyleOf, currencyOf, badgeTypeOf } from '../../theme/designTokens'
// Dessin de carte appliqué à un produit : sa propre surcharge
// (backgroundStyle.cardLayouts[itemId]) sinon celui de la zone
// (backgroundStyle.cardLayout). Mêmes règles que le builder — schéma partagé.
import {
  ownCardLayout,
  resolveCardLayout,
  isFreeZone,
  freeItemBox,
  resolveZoneLayout,
  zoneStyleValue,
  ZONE_PAD_SEAM,
} from '../../shared/menuSchema'

function bannerSizeOf(fontSize) {
  if (!fontSize) return undefined
  if (fontSize <= 14) return 'sm'
  if (fontSize <= 22) return 'md'
  return 'lg'
}

function ZoneTitle({ name, accent, banner, extraPrice, badgeType, theme, fontSize, titleGap }) {
  if (!name) return null
  // mb-6 (24px) était figé : c'est maintenant le réglage « Espace sous le titre ».
  const gapStyle = { marginBottom: titleGap }
  const scale = fontSize ? fontSize / 12 : 1
  const showExtra = Number.isFinite(extraPrice) && extraPrice > 0

  if (banner) {
    const title = <CategoryBanner label={name} accent={accent} size={bannerSizeOf(fontSize)} />
    if (!showExtra) return <div style={gapStyle}>{title}</div>
    return (
      <div className="flex items-center gap-3" style={gapStyle}>
        {title}
        <PriceBadge price={extraPrice} size="sm" badgeStyle={badgeStyleOf(theme)} currency={currencyOf(theme)} badgeType={badgeTypeOf(badgeType)} />
      </div>
    )
  }

  // Elegant italic divider — the "Meat" / "Sauces" / "Extra" treatment from
  // the reference boards: title case (not uppercase), Playfair Display
  // italic, flanked by thin rules spanning the zone width. A price tag
  // replaces the right-hand rule when the zone carries an "Extra" price,
  // matching how the reference attaches the tag to the divider rather than
  // centering the title alone.
  const title = (
    <h2
      className="font-menu-accent italic font-semibold leading-tight"
      style={{ color: accent, fontSize: Math.round(34 * scale) }}
    >
      {name}
    </h2>
  )

  if (showExtra) {
    return (
      <div className="flex items-center gap-3" style={gapStyle}>
        {title}
        <PriceBadge price={extraPrice} size="sm" badgeStyle={badgeStyleOf(theme)} currency={currencyOf(theme)} badgeType={badgeTypeOf(badgeType)} />
      </div>
    )
  }
  const ruleHeight = Math.max(2, Math.round(3 * scale))
  return (
    <div className="flex items-center gap-4" style={gapStyle}>
      <span className="flex-1 rounded-full" style={{ height: ruleHeight, background: accent, opacity: 0.35 }} />
      {title}
      <span className="flex-1 rounded-full" style={{ height: ruleHeight, background: accent, opacity: 0.35 }} />
    </div>
  )
}

// Grid cell: the product image fills the cell edge-to-edge (cover, "GIF-like").
// No image -> empty cell, no centered fallback icon.
//
// The image sits in its own flex-1 area and the name in a fixed-height
// (2-line-clamped) area below it — both reserved up front instead of the
// pair being centered as one block. Centering as one block used to let a
// longer name (wrapping to 2 lines) push its own image up/down relative to
// a neighbor with a 1-line name, so images drifted out of row with each
// other across the grid even though every cell is the same size.
function GridImageCell({ zi, template, scale = 1, theme, showPrice = false, badgeType, variant }) {
  const { name, imageUrl, price } = cardFields(zi.item)
  if (!imageUrl) return null
  const ts = templateStyle(template)
  const s = ts.scale * scale
  const maxH = Math.min(100, Math.round(78 * s))
  const maxW = Math.min(100, Math.round(85 * s))
  // cqmin (% of the cell's smaller side), not fixed px: keeps the name
  // proportional to the image above it when gridConfig rows/cols change the
  // cell size, instead of only tracking the zone-wide `scale`.
  const labelSize = `clamp(11px, ${(6 * s).toFixed(1)}cqmin, 30px)`
  return (
    <div className="flex h-full w-full flex-col items-center gap-2 p-2">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {/* Boîte photo = exactement les bornes maxH/maxW que l'image pouvait
            déjà occuper (l'image garde ses propres max-h/max-w à 100% de
            cette boîte, donc la mise en page ne bouge pas). L'avoir en
            élément à part donne au badge prix un coin haut-droit à viser :
            celui de la photo, pas celui de la cellule. */}
        <div
          className="relative flex items-center justify-center"
          style={{ height: `${maxH}%`, width: `${maxW}%` }}
        >
          <img
            src={imageUrl}
            alt={name}
            className="max-h-full max-w-full object-contain"
            style={{ filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))' }}
          />
          {showPrice && price != null ? (
            <div className="absolute right-0 top-0 z-10 -translate-y-1/4 translate-x-1/4">
              <PriceBadge
                price={price}
                size="sm"
                fontSize={Math.round(16 * s)}
                badgeStyle={badgeStyleOf(theme)}
                badgeType={badgeTypeOf(badgeType)}
                variant={variant}
                currency={currencyOf(theme)}
              />
            </div>
          ) : null}
        </div>
      </div>
      <span
        className="line-clamp-2 flex-none text-center font-menu-header uppercase leading-tight tracking-wide text-menu-text"
        style={{ fontSize: labelSize, minHeight: `calc(${labelSize} * 2.6)` }}
      >
        {name}
      </span>
    </div>
  )
}

// Une carte produit telle que la zone la rend, quel que soit le placement :
// dans une cellule de grille ou dans sa propre boîte en placement libre. Le
// dessin propre au produit gagne, sinon le template de la zone décide.
// Extrait de GridContent — le placement libre passe par exactement ce chemin
// plutôt que d'en dupliquer un deuxième.
function itemCard({ zone, zi, theme, scale = 1, badgeType, priceVariant, showPrice, mirror = false }) {
  const template = zone.cardTemplate
  const priceProps = { theme, badgeType, variant: priceVariant }
  const own = ownCardLayout(zone, zi.itemId)

  if (template === 'custom' || own)
    return (
      <CustomCard
        item={zi.item}
        layout={own || resolveCardLayout(zone, zi.itemId)}
        badgeConfig={zone.badgeConfig}
        qty={zi.qty != null ? zi.qty : null}
        {...priceProps}
      />
    )
  if (template === 'icon-label')
    return <IconLabelCard item={zi.item} scale={scale} showPrice={showPrice === true} {...priceProps} />
  if (template === 'text-only')
    return <TextOnlyCard item={zi.item} scale={scale} showPrice={showPrice === true} {...priceProps} />
  if (template === 'image-title-desc-price')
    return (
      <ImageTitleDescPriceCard
        item={zi.item}
        theme={theme}
        showPrice={showPrice !== false}
        template="default"
        zoneSize="sm"
        mirror={mirror}
        scale={scale}
        badgeType={badgeType}
        variant={priceVariant}
      />
    )
  return (
    <GridImageCell
      zi={zi}
      template={template}
      scale={scale}
      showPrice={showPrice === true}
      {...priceProps}
    />
  )
}

// Placement libre : chaque produit occupe sa propre boîte en % de la zone, au
// lieu d'une cellule d'une grille régulière. C'est ce qui permet une
// composition asymétrique — un gros produit à gauche, trois petits à droite.
function FreeContent({ zone, theme, scale = 1, badgeType, priceVariant, showPrice }) {
  const items = zone.items || []
  if (items.length === 0) {
    return <p className="text-center font-menu-body text-sm text-menu-text-muted">Vide</p>
  }
  return (
    <div className="relative min-h-0 flex-1">
      {items.map((zi, i) => {
        const box = freeItemBox(zi, i)
        return (
          <div
            key={zi.itemId}
            className="absolute"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.w}%`,
              height: `${box.h}%`,
              // Même repère que la cellule de grille : la carte mesure sa
              // largeur/hauteur par rapport à SA boîte, donc un dessin fait
              // dans l'éditeur tombe juste.
              containerType: 'size',
            }}
          >
            {itemCard({ zone, zi, theme, scale, badgeType, priceVariant, showPrice })}
          </div>
        )
      })}
    </div>
  )
}

function GridContent({ zone, theme, scale = 1, badgeType, priceVariant, showPrice, gap }) {
  const rows = zone.gridConfig?.rows || 1
  const cols = zone.gridConfig?.cols || 1
  const items = zone.items || []
  const cells = Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    return items.find((it) => it.row === r && it.col === c)
  })

  // "Afficher le prix" (zone) : les cartes image+details montrent le prix par
  // defaut (showPrice !== false), les autres templates ne le montrent que si
  // la case est explicitement cochee (showPrice === true).
  const cellContent = (zi, i) =>
    itemCard({ zone, zi, theme, scale, badgeType, priceVariant, showPrice, mirror: (i % cols) >= Math.ceil(cols / 2) })

  return (
    <div
      className="grid min-h-0 flex-1"
      style={{
        // gap-5 (20px) était figé : c'est le réglage « Espace entre produits ».
        gap,
        // minmax(0, 1fr), not a bare 1fr: a bare 1fr track still grows past an
        // even split to fit its content's min-content size, which is exactly
        // how a large "Taille de police" zone size used to push a product
        // past its own cell (and into the zone's edge/neighboring cells). The
        // 0 floor makes the cell win that fight on its own, so the cell
        // wrapper below doesn't need its own overflow-hidden (that used to
        // clip paint-only effects — box-shadow, drop-shadow — that bleed a
        // few px past the box without actually growing it).
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {cells.map((zi, i) =>
        zi ? (
          <div
            key={zi.itemId}
            className="flex h-full w-full min-h-0 min-w-0 items-center justify-center"
            style={{ containerType: 'size' }}
          >
            {cellContent(zi, i)}
          </div>
        ) : (
          <div key={`e${i}`} />
        )
      )}
    </div>
  )
}

function ListContent({ zone, theme, settings, scale = 1, badgeType, priceVariant, zoneShowPrice, gap }) {
  const items = zone.items || []
  // Le choix de la zone ("Afficher le prix") l'emporte sur le reglage global
  // de l'ecran ; sans choix explicite on garde le reglage global.
  const showPrice = zoneShowPrice === undefined ? settings?.showPrices !== false : zoneShowPrice
  const isTextOnly = zone.cardTemplate === 'text-only'
  const isImageDetail = zone.cardTemplate === 'image-title-desc-price'
  const isCustom = zone.cardTemplate === 'custom'
  const anyCustom = isCustom || items.some((zi) => ownCardLayout(zone, zi.itemId))
  const visible = items.slice(0, isImageDetail && !anyCustom ? 8 : 12)

  // Une ligne à la fois : un produit qui porte son propre dessin rend une carte
  // perso même si la zone est restée sur un autre template, ses voisins gardent
  // le rendu du template.
  const renderRow = (zi) => {
    const own = ownCardLayout(zone, zi.itemId)
    if (isCustom || own) {
      // La boîte de la ligne est le repère des % du dessin, exactement comme
      // une cellule de grille.
      return (
        <div key={zi.itemId} className="min-h-0 w-full flex-1">
          <CustomCard
            item={zi.item}
            layout={own || resolveCardLayout(zone, zi.itemId)}
            theme={theme}
            badgeConfig={zone.badgeConfig}
            qty={zi.qty != null ? zi.qty : null}
            badgeType={badgeType}
            variant={priceVariant}
          />
        </div>
      )
    }
    if (isTextOnly) {
      return (
        <TextOnlyCard
          key={zi.itemId}
          item={zi.item}
          theme={theme}
          scale={scale}
          showPrice={zoneShowPrice === true}
          badgeType={badgeType}
          variant={priceVariant}
        />
      )
    }
    if (isImageDetail) {
      return (
        <ImageTitleDescPriceCard
          key={zi.itemId}
          item={zi.item}
          theme={theme}
          showPrice={showPrice}
          template="default"
          zoneSize="sm"
          scale={scale}
          badgeType={badgeType}
          variant={priceVariant}
        />
      )
    }
    return (
      <ListRowCard
        key={zi.itemId}
        item={zi.item}
        theme={theme}
        showPrice={showPrice}
        template={zone.cardTemplate}
        qtyLabel={zi.qty != null ? zi.qty : null}
        scale={scale}
        badgeType={badgeType}
        variant={priceVariant}
      />
    )
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden"
      style={{ gap: isTextOnly || isImageDetail || anyCustom ? gap : undefined }}
    >
      {items.length === 0 ? (
        <p className="text-center font-menu-body text-sm text-menu-text-muted">Vide</p>
      ) : (
        visible.map(renderRow)
      )}
    </div>
  )
}

function BannerContent({ zone, theme, settings, accent, fontSize, badgeType, zoneShowPrice }) {
  const first = zone.items?.[0]
  const showPrice = zoneShowPrice === undefined ? settings?.showPrices !== false : zoneShowPrice
  const scale = fontSize ? fontSize / 12 : 1
  if (Array.isArray(zone.badgeConfig?.tiers) && zone.badgeConfig.tiers.length > 0) {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-6 p-8">
        {zone.name ? (
          <h2 className="font-menu-header uppercase tracking-wide" style={{ color: accent, fontSize: Math.round(44 * scale) }}>
            {zone.name}
          </h2>
        ) : null}
        <TierPricingHeader
          tiers={zone.badgeConfig.tiers}
          badgeStyle={badgeStyleOf(theme)}
          currency={currencyOf(theme)}
          badgeType={badgeTypeOf(badgeType)}
        />
      </div>
    )
  }
  if (first) {
    return (
      <HeroBannerCard
        item={first.item}
        theme={theme}
        badgeConfig={zone.badgeConfig}
        showPrice={showPrice}
        template={zone.cardTemplate}
      />
    )
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      {zone.name ? (
        <h2 className="font-menu-header uppercase tracking-wide" style={{ color: accent, fontSize: Math.round(44 * scale) }}>
          {zone.name}
        </h2>
      ) : null}
      <div className="h-1 w-40 rounded bg-white/30" />
    </div>
  )
}

// Le contenu produits d'une zone, sans rien autour : c'est ce que le slot
// `products` d'une disposition de zone met dans sa boîte, et c'est aussi ce
// que la disposition d'origine met sous le titre. Un seul endroit décide quel
// répéteur s'applique.
function ZoneProducts({ zone, theme, settings, scale, badgeType, priceVariant, zoneShowPrice, kind, gap }) {
  if (kind === 'free')
    return <FreeContent zone={zone} theme={theme} scale={scale} badgeType={badgeType} priceVariant={priceVariant} showPrice={zoneShowPrice} />
  if (kind === 'grid')
    return <GridContent zone={zone} theme={theme} scale={scale} badgeType={badgeType} priceVariant={priceVariant} showPrice={zoneShowPrice} gap={gap} />
  if (kind === 'list')
    return <ListContent zone={zone} theme={theme} settings={settings} scale={scale} badgeType={badgeType} priceVariant={priceVariant} zoneShowPrice={zoneShowPrice} gap={gap} />
  // highlight / type inconnu : le premier produit en carte image + détails
  return zone.items?.[0] ? (
    <ImageTitleDescPriceCard
      item={zone.items[0].item}
      theme={theme}
      showPrice={zoneShowPrice === true}
      template={zone.cardTemplate}
      badgeType={badgeType}
      variant={priceVariant}
    />
  ) : null
}

// La zone comme conteneur de slots : mêmes règles que la carte (x/y/w/h en %
// de la zone), un cran plus haut. Le slot `products` porte le répéteur, les
// autres sont le titre et le décor. Utilisé seulement quand la zone porte une
// disposition ; sinon on garde l'agencement d'origine plus bas.
function ZoneSlotsContent({ layout, zone, theme, settings, accent, scale, badgeType, priceVariant, zoneShowPrice, zStyle, gap }) {
  return (
    <div className="relative h-full w-full">
      {layout.slots.map((slot) => {
        if (slot.visible === false) return null
        const box = {
          position: 'absolute',
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          width: `${slot.w}%`,
          height: `${slot.h}%`,
          zIndex: slot.zIndex ?? 1,
          transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
        }

        if (slot.type === 'products') {
          return (
            <div key={slot.id} style={box} className="flex flex-col">
              <ZoneProducts
                zone={zone}
                theme={theme}
                settings={settings}
                scale={scale}
                badgeType={badgeType}
                priceVariant={priceVariant}
                zoneShowPrice={zoneShowPrice}
                kind={productKind(zone)}
                gap={gap}
              />
            </div>
          )
        }

        if (slot.type === 'title') {
          if (!zone.name) return null
          const style = slot.titleStyle || 'divider'
          if (style === 'plain') {
            return (
              <div
                key={slot.id}
                style={box}
                className={`flex ${slot.valign === 'start' ? 'items-start' : slot.valign === 'end' ? 'items-end' : 'items-center'} ${
                  slot.align === 'right' ? 'justify-end' : slot.align === 'center' ? 'justify-center' : 'justify-start'
                }`}
              >
                <h2
                  className="leading-tight font-menu-header tracking-wide"
                  style={{
                    color: slot.color || accent,
                    fontSize: slot.fontSize || 34,
                    fontWeight: slot.bold ? 700 : 400,
                    fontStyle: slot.italic ? 'italic' : undefined,
                    textTransform: slot.uppercase ? 'uppercase' : undefined,
                    fontFamily: slot.fontFamily || undefined,
                    textAlign: slot.align || 'left',
                  }}
                >
                  {zone.name}
                </h2>
              </div>
            )
          }
          // divider / banner : le traitement historique, réutilisé tel quel.
          return (
            <div key={slot.id} style={box} className="flex flex-col justify-center">
              <ZoneTitle
                name={zone.name}
                accent={accent}
                extraPrice={zStyle.extraPrice}
                badgeType={zStyle.badgeType}
                theme={theme}
                banner={style === 'banner'}
                fontSize={zStyle.fontSize}
                titleGap={0}
              />
            </div>
          )
        }

        if (slot.type === 'shape') {
          return (
            <div key={slot.id} style={box}>
              <div
                className="h-full w-full"
                style={{
                  background: slot.bg || accent,
                  borderRadius: slot.radius || 0,
                  opacity: slot.opacity ?? 1,
                }}
              />
            </div>
          )
        }

        if (slot.type === 'asset') {
          if (!slot.imageUrl) return null
          return (
            <div key={slot.id} style={box}>
              <img src={slot.imageUrl} alt="" className="h-full w-full" style={{ objectFit: slot.fit || 'contain' }} />
            </div>
          )
        }

        // 'text'
        if (!slot.text) return null
        return (
          <div
            key={slot.id}
            style={box}
            className={`flex ${slot.valign === 'start' ? 'items-start' : slot.valign === 'end' ? 'items-end' : 'items-center'} ${
              slot.align === 'right' ? 'justify-end' : slot.align === 'center' ? 'justify-center' : 'justify-start'
            }`}
          >
            <span
              className="break-words leading-tight"
              style={{
                color: slot.color || 'var(--menu-text)',
                fontSize: slot.fontSize || 24,
                fontWeight: slot.bold ? 700 : 400,
                fontStyle: slot.italic ? 'italic' : undefined,
                textTransform: slot.uppercase ? 'uppercase' : undefined,
                fontFamily: slot.fontFamily || undefined,
                textAlign: slot.align || 'left',
              }}
            >
              {slot.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Quel répéteur s'applique à cette zone — la même règle que le rendu d'origine.
function productKind(zone) {
  if (isFreeZone(zone)) return 'free'
  if (zone.zoneType === 'grid') return 'grid'
  if (zone.zoneType === 'list' || zone.zoneType === 'carousel' || zone.zoneType === 'menu') return 'list'
  return 'highlight'
}

// Base zone padding, and the deeper inset used on whichever edge(s) carry a
// torn-paper seam — ZoneSeams draws that band 20px deep into this zone (its
// 40px band is centered ON the shared edge), so content needs to clear that
// same depth only on that edge, not all four.
// Les anciennes constantes ZONE_PAD / ZONE_PAD_SEAM vivent dans le schéma
// partagé : ZONE_STYLE_LIMITS.padding.fallback vaut 10, ZONE_PAD_SEAM 25.

export default function ZoneRenderer({ zone, theme, settings, seamEdges }) {
  const zStyle = zone.backgroundStyle || {}
  const accent = zStyle.accent || accentOf(theme)
  const isDark = !!zStyle.dark
  // no backgroundStyle = transparent zone (screen background shows through);
  // per-zone background replaces it only when explicitly set
  const bg = zStyle.bgImage ? undefined : zStyle.bg
  const text = zStyle.text || (isDark ? '#FFFFFF' : '#1A1A1A')
  // Le texte secondaire n'avait que deux valeurs possibles, déduites de la
  // couleur du texte principal. Il reste ce repli, mais la zone peut le fixer.
  const muted = zStyle.textMuted || (text === '#FFFFFF' ? '#EEEEEE' : '#8A8A8A')

  // Mise en forme de la zone : chaque réglage remplace une valeur qui était
  // écrite en dur ici. Sans réglage, on retombe exactement dessus.
  const padding = zoneStyleValue(zStyle, 'padding')
  const gap = zoneStyleValue(zStyle, 'gap')
  const titleGap = zoneStyleValue(zStyle, 'titleGap')
  const radius = zoneStyleValue(zStyle, 'radius')
  const shadowBlur = zoneStyleValue(zStyle, 'shadow')
  const borderWidth = zoneStyleValue(zStyle, 'borderWidth')
  // Tailwind resolves var(--color-menu-text) at the :root declaration, which
  // freezes --menu-text to the root theme color. Re-export the runtime tokens
  // under their --color-* names directly on the zone so the overrides win.
  const cssVars = {
    '--color-menu-accent': accent,
    '--menu-accent': accent,
    '--color-menu-text': text,
    '--menu-text': text,
    '--color-menu-text-muted': muted,
    '--menu-text-muted': muted,
  }

  const isBanner = zone.zoneType === 'banner' || zone.zoneType === 'hero'
  // Le placement libre l'emporte sur le type de la zone : c'est lui qui décide
  // où vont les produits. Le type ne sert plus qu'au titre et au fond.
  const isFree = !isBanner && isFreeZone(zone)
  const isGrid = !isFree && zone.zoneType === 'grid'
  const isList = !isFree && (zone.zoneType === 'list' || zone.zoneType === 'carousel' || zone.zoneType === 'menu')

  // Same "Taille de police" zone style control the title below already uses
  // (base 12px = 1x) — also drives the product cards' own size (image, name,
  // description, price) so raising it grows the whole card, not just the title.
  const cardScale = zStyle.fontSize ? zStyle.fontSize / 12 : 1

  // Product price badge follows the zone's explicit Clair/Sombre choice for
  // contrast (Sombre -> light/paper sticker, Clair -> dark/black sticker),
  // same inversion already applied to `text` above. Left undefined (PriceBadge's
  // own default = dark) when the zone never set `dark` explicitly, so zones
  // that predate this control don't change appearance.
  const priceVariant = zStyle.dark === undefined ? undefined : isDark ? 'light' : 'dark'

  // T9b — "Afficher le prix" de la zone. undefined = comportement d'origine
  // (image+details et listes affichent le prix, vignettes/icones/texte non),
  // true = force l'affichage sur tous les templates, false = le masque.
  const zoneShowPrice = typeof zStyle.showPrice === 'boolean' ? zStyle.showPrice : undefined

  // T9: sub-zone — the product grid/list container's own box within the zone,
  // as % of the space left under the title (not the whole zone), so it never
  // needs to account for the title's own variable height. Undefined = fill
  // that whole space, i.e. the exact layout every zone had before this
  // control existed.
  const contentBox = zStyle.contentBox
  const contentBoxStyle = contentBox
    ? {
        position: 'absolute',
        left: `${contentBox.x}%`,
        top: `${contentBox.y}%`,
        width: `${contentBox.w}%`,
        height: `${contentBox.h}%`,
      }
    : undefined

  // Disposition en slots : elle remplace l'agencement figé ci-dessous. Une zone
  // qui n'en porte pas garde exactement son rendu d'origine.
  const zoneLayout = isBanner ? null : resolveZoneLayout(zone)

  let content
  if (zoneLayout) {
    content = (
      <ZoneSlotsContent
        layout={zoneLayout}
        zone={zone}
        theme={theme}
        settings={settings}
        accent={accent}
        scale={cardScale}
        badgeType={zStyle.badgeType}
        priceVariant={priceVariant}
        zoneShowPrice={zoneShowPrice}
        zStyle={zStyle}
        gap={gap}
      />
    )
  } else if (isBanner) {
    content = <BannerContent zone={zone} theme={theme} settings={settings} accent={accent} fontSize={zStyle.fontSize} badgeType={zStyle.badgeType} zoneShowPrice={zoneShowPrice} />
  } else if (isFree) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} badgeType={zStyle.badgeType} theme={theme} banner={zone.backgroundStyle?.banner} fontSize={zStyle.fontSize} titleGap={titleGap} />
        <div className="relative min-h-0 flex-1">
          <div className="flex h-full flex-col" style={contentBoxStyle}>
            <FreeContent zone={zone} theme={theme} scale={cardScale} badgeType={zStyle.badgeType} priceVariant={priceVariant} showPrice={zoneShowPrice} />
          </div>
        </div>
      </div>
    )
  } else if (isGrid) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} badgeType={zStyle.badgeType} theme={theme} banner={zone.backgroundStyle?.banner} fontSize={zStyle.fontSize} titleGap={titleGap} />
        <div className="relative min-h-0 flex-1">
          <div className="flex h-full flex-col" style={contentBoxStyle}>
            <GridContent zone={zone} theme={theme} scale={cardScale} badgeType={zStyle.badgeType} priceVariant={priceVariant} showPrice={zoneShowPrice} gap={gap} />
          </div>
        </div>
      </div>
    )
  } else if (isList) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} badgeType={zStyle.badgeType} theme={theme} banner={zone.backgroundStyle?.banner} fontSize={zStyle.fontSize} titleGap={titleGap} />
        <div className="relative min-h-0 flex-1">
          <div className="flex h-full flex-col" style={contentBoxStyle}>
            <ListContent zone={zone} theme={theme} settings={settings} scale={cardScale} badgeType={zStyle.badgeType} priceVariant={priceVariant} zoneShowPrice={zoneShowPrice} gap={gap} />
          </div>
        </div>
      </div>
    )
  } else {
    // highlight / unknown: zone name + first item as image-title-desc card
    content = (
      <div className="flex h-full flex-col justify-center gap-4">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} badgeType={zStyle.badgeType} theme={theme} banner={zone.backgroundStyle?.banner} fontSize={zStyle.fontSize} titleGap={titleGap} />
        {zone.items?.[0] ? (
          <ImageTitleDescPriceCard
            item={zone.items[0].item}
            theme={theme}
            showPrice={zoneShowPrice === true}
            template={zone.cardTemplate}
            badgeType={zStyle.badgeType}
            variant={priceVariant}
          />
        ) : null}
      </div>
    )
  }

  // Un bord qui porte une couture papier déchiré doit dégager la bande que
  // ZoneSeams dessine par-dessus (25px) — une marge plus grande choisie par
  // l'admin l'emporte, une plus petite est relevée à ce minimum.
  const pad = (side) => {
    if (isBanner) return 0
    return seamEdges?.[side] ? Math.max(padding, ZONE_PAD_SEAM) : padding
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: bg,
        borderRadius: radius || undefined,
        border: zStyle.border ? `${borderWidth}px solid ${zStyle.border}` : undefined,
        boxShadow: shadowBlur ? `0 ${Math.round(shadowBlur / 3)}px ${shadowBlur}px rgba(0,0,0,0.35)` : undefined,
        fontFamily: zStyle.fontFamily || undefined,
        paddingTop: pad('top'),
        paddingRight: pad('right'),
        paddingBottom: pad('bottom'),
        paddingLeft: pad('left'),
        ...cssVars,
      }}
    >
      {zStyle.bgImage ? (
        <div className="absolute inset-0">
          <img src={zStyle.bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }} />
        </div>
      ) : null}
      <div className="relative z-10 flex h-full w-full flex-col">{content}</div>
      {!isBanner && <ZoneBadge config={zone.badgeConfig} />}
    </div>
  )
}
