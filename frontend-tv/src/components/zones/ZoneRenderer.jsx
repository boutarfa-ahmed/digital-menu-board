// T7.8 — zone renderer: renders one zone's content from its zoneType /
// cardTemplate / gridConfig using the T7.7 card components. The zone wrapper
// applies the T7.4 backgroundStyle overrides (bg/text/accent) as scoped tokens.
import ImageTitleDescPriceCard from '../cards/ImageTitleDescPriceCard.jsx'
import ListRowCard from '../cards/ListRowCard.jsx'
import HeroBannerCard from '../cards/HeroBannerCard.jsx'
import IconLabelCard from '../cards/IconLabelCard.jsx'
import TextOnlyCard from '../cards/TextOnlyCard.jsx'
import CategoryBanner from '../primitives/CategoryBanner.jsx'
import ZoneBadge from '../ui/ZoneBadge.jsx'
import { accentOf, cardFields, templateStyle } from '../cards/cardUtils.js'
import PriceBadge from '../primitives/PriceBadge.jsx'
import TierPricingHeader from '../primitives/TierPricingHeader.jsx'
import { badgeStyleOf, currencyOf, badgeTypeOf } from '../../theme/designTokens'

function bannerSizeOf(fontSize) {
  if (!fontSize) return undefined
  if (fontSize <= 14) return 'sm'
  if (fontSize <= 22) return 'md'
  return 'lg'
}

function ZoneTitle({ name, accent, banner, extraPrice, badgeType, theme, fontSize }) {
  if (!name) return null
  const scale = fontSize ? fontSize / 12 : 1
  const showExtra = Number.isFinite(extraPrice) && extraPrice > 0

  if (banner) {
    const title = <CategoryBanner label={name} accent={accent} size={bannerSizeOf(fontSize)} />
    if (!showExtra) return <div className="mb-6">{title}</div>
    return (
      <div className="mb-6 flex items-center gap-3">
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
      <div className="mb-6 flex items-center gap-3">
        {title}
        <PriceBadge price={extraPrice} size="sm" badgeStyle={badgeStyleOf(theme)} currency={currencyOf(theme)} badgeType={badgeTypeOf(badgeType)} />
      </div>
    )
  }
  const ruleHeight = Math.max(2, Math.round(3 * scale))
  return (
    <div className="mb-6 flex items-center gap-4">
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
function GridImageCell({ zi, template, scale = 1 }) {
  const { name, imageUrl } = cardFields(zi.item)
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
        <img
          src={imageUrl}
          alt={name}
          className="max-h-full max-w-full object-contain"
          style={{ maxHeight: `${maxH}%`, maxWidth: `${maxW}%`, filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))' }}
        />
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

function GridContent({ zone, theme, scale = 1, badgeType, priceVariant }) {
  const rows = zone.gridConfig?.rows || 1
  const cols = zone.gridConfig?.cols || 1
  const items = zone.items || []
  const template = zone.cardTemplate
  const isIconLabel = template === 'icon-label'
  const isTextOnly = template === 'text-only'
  const isImageDetail = template === 'image-title-desc-price'
  const cells = Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    return items.find((it) => it.row === r && it.col === c)
  })

  const cellContent = (zi, i) => {
    if (isIconLabel) return <IconLabelCard item={zi.item} theme={theme} scale={scale} />
    if (isTextOnly) return <TextOnlyCard item={zi.item} theme={theme} scale={scale} />
    if (isImageDetail) {
      const c = i % cols
      const mirror = c >= Math.ceil(cols / 2)
      return (
        <ImageTitleDescPriceCard
          item={zi.item}
          theme={theme}
          showPrice
          template="default"
          zoneSize="sm"
          mirror={mirror}
          scale={scale}
          badgeType={badgeType}
          variant={priceVariant}
        />
      )
    }
    return <GridImageCell zi={zi} template={template} scale={scale} />
  }

  return (
    <div
      className="grid min-h-0 flex-1 gap-5"
      style={{
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

function ListContent({ zone, theme, settings, scale = 1, badgeType, priceVariant }) {
  const items = zone.items || []
  const showPrice = settings?.showPrices !== false
  const isTextOnly = zone.cardTemplate === 'text-only'
  const isImageDetail = zone.cardTemplate === 'image-title-desc-price'
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col justify-center overflow-hidden ${
        isTextOnly || isImageDetail ? 'gap-5' : ''
      }`}
    >
      {items.length === 0 ? (
        <p className="text-center font-menu-body text-sm text-menu-text-muted">Vide</p>
      ) : isTextOnly ? (
        items.slice(0, 12).map((zi) => <TextOnlyCard key={zi.itemId} item={zi.item} theme={theme} scale={scale} />)
      ) : isImageDetail ? (
        items.slice(0, 8).map((zi) => (
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
        ))
      ) : (
        items.slice(0, 12).map((zi) => (
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
        ))
      )}
    </div>
  )
}

function BannerContent({ zone, theme, settings, accent, fontSize, badgeType }) {
  const first = zone.items?.[0]
  const showPrice = settings?.showPrices !== false
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

// Base zone padding, and the deeper inset used on whichever edge(s) carry a
// torn-paper seam — ZoneSeams draws that band 20px deep into this zone (its
// 40px band is centered ON the shared edge), so content needs to clear that
// same depth only on that edge, not all four.
const ZONE_PAD = 10
const ZONE_PAD_SEAM = 25

export default function ZoneRenderer({ zone, theme, settings, seamEdges }) {
  const zStyle = zone.backgroundStyle || {}
  const accent = zStyle.accent || accentOf(theme)
  const isDark = !!zStyle.dark
  // no backgroundStyle = transparent zone (screen background shows through);
  // per-zone background replaces it only when explicitly set
  const bg = zStyle.bgImage ? undefined : zStyle.bg
  const text = zStyle.text || (isDark ? '#FFFFFF' : '#1A1A1A')
  const muted = text === '#FFFFFF' ? '#EEEEEE' : '#8A8A8A'
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
  const isGrid = zone.zoneType === 'grid'
  const isList = zone.zoneType === 'list' || zone.zoneType === 'carousel' || zone.zoneType === 'menu'

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

  let content
  if (isBanner) {
    content = <BannerContent zone={zone} theme={theme} settings={settings} accent={accent} fontSize={zStyle.fontSize} badgeType={zStyle.badgeType} />
  } else if (isGrid) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} badgeType={zStyle.badgeType} theme={theme} banner={zone.backgroundStyle?.banner} fontSize={zStyle.fontSize} />
        <div className="relative min-h-0 flex-1">
          <div className="flex h-full flex-col" style={contentBoxStyle}>
            <GridContent zone={zone} theme={theme} scale={cardScale} badgeType={zStyle.badgeType} priceVariant={priceVariant} />
          </div>
        </div>
      </div>
    )
  } else if (isList) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} badgeType={zStyle.badgeType} theme={theme} banner={zone.backgroundStyle?.banner} fontSize={zStyle.fontSize} />
        <div className="relative min-h-0 flex-1">
          <div className="flex h-full flex-col" style={contentBoxStyle}>
            <ListContent zone={zone} theme={theme} settings={settings} scale={cardScale} badgeType={zStyle.badgeType} priceVariant={priceVariant} />
          </div>
        </div>
      </div>
    )
  } else {
    // highlight / unknown: zone name + first item as image-title-desc card
    content = (
      <div className="flex h-full flex-col justify-center gap-4">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} badgeType={zStyle.badgeType} theme={theme} banner={zone.backgroundStyle?.banner} fontSize={zStyle.fontSize} />
        {zone.items?.[0] ? (
          <ImageTitleDescPriceCard
            item={zone.items[0].item}
            theme={theme}
            showPrice={false}
            template={zone.cardTemplate}
          />
        ) : null}
      </div>
    )
  }

  const pad = (side) => (isBanner ? 0 : seamEdges?.[side] ? ZONE_PAD_SEAM : ZONE_PAD)

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: bg,
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
