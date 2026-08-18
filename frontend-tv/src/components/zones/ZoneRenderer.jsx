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
import { tornZoneClipPath } from '../primitives/TornEdge.jsx'
import { accentOf, cardFields, templateStyle } from '../cards/cardUtils.js'
import PriceBadge from '../primitives/PriceBadge.jsx'
import TierPricingHeader from '../primitives/TierPricingHeader.jsx'
import { badgeStyleOf } from '../../theme/designTokens'

function ZoneTitle({ name, accent, banner, extraPrice, theme }) {
  if (!name) return null
  const title = banner === 'ribbon' || banner === 'underline'
    ? <CategoryBanner text={name} variant={banner} color={accent} />
    : (
      <h2
        className="font-menu-header uppercase leading-tight tracking-wide"
        style={{ color: accent, fontSize: 34 }}
      >
        {name}
      </h2>
    )
  const showExtra = Number.isFinite(extraPrice) && extraPrice > 0
  if (!showExtra) {
    return <div className="mb-6">{title}</div>
  }
  return (
    <div className="mb-6 flex items-center gap-3">
      {title}
      <PriceBadge price={extraPrice} size="sm" badgeStyle={badgeStyleOf(theme)} />
    </div>
  )
}

// Grid cell: the product image fills the cell edge-to-edge (cover, "GIF-like").
// No image -> empty cell, no centered fallback icon.
function GridImageCell({ zi, template }) {
  const { name, imageUrl } = cardFields(zi.item)
  if (!imageUrl) return null
  const ts = templateStyle(template)
  const maxH = Math.min(92, Math.round(78 * ts.scale))
  const maxW = Math.min(95, Math.round(85 * ts.scale))
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2">
      <img
        src={imageUrl}
        alt={name}
        className="max-w-full object-contain"
        style={{ maxHeight: `${maxH}%`, maxWidth: `${maxW}%`, filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))' }}
      />
      <span
        className="text-center font-menu-header uppercase leading-tight tracking-wide text-menu-text"
        style={{ fontSize: `${Math.round(14 * ts.scale)}px` }}
      >
        {name}
      </span>
    </div>
  )
}

function GridContent({ zone, theme }) {
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
    if (isIconLabel) return <IconLabelCard item={zi.item} theme={theme} />
    if (isTextOnly) return <TextOnlyCard item={zi.item} theme={theme} />
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
        />
      )
    }
    return <GridImageCell zi={zi} template={template} />
  }

  return (
    <div
      className="grid min-h-0 flex-1 gap-5"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {cells.map((zi, i) =>
        zi ? (
          <div
            key={zi.itemId}
            className={`min-h-0 min-w-0 ${isIconLabel || isTextOnly ? 'flex items-center justify-center' : ''}`}
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

function ListContent({ zone, theme, settings }) {
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
        items.slice(0, 12).map((zi) => <TextOnlyCard key={zi.itemId} item={zi.item} theme={theme} />)
      ) : isImageDetail ? (
        items.slice(0, 8).map((zi) => (
          <ImageTitleDescPriceCard
            key={zi.itemId}
            item={zi.item}
            theme={theme}
            showPrice={showPrice}
            template="default"
            zoneSize="sm"
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
          />
        ))
      )}
    </div>
  )
}

function BannerContent({ zone, theme, settings, accent }) {
  const first = zone.items?.[0]
  const showPrice = settings?.showPrices !== false
  if (Array.isArray(zone.badgeConfig?.tiers) && zone.badgeConfig.tiers.length > 0) {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-6 p-8">
        {zone.name ? (
          <h2 className="font-menu-header uppercase tracking-wide" style={{ color: accent, fontSize: 44 }}>
            {zone.name}
          </h2>
        ) : null}
        <TierPricingHeader
          tiers={zone.badgeConfig.tiers}
          badgeStyle={badgeStyleOf(theme)}
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
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25))' }}
    >
      {zone.name ? (
        <h2 className="font-menu-header uppercase tracking-wide" style={{ color: accent, fontSize: 44 }}>
          {zone.name}
        </h2>
      ) : null}
      <div className="h-1 w-40 rounded bg-white/30" />
    </div>
  )
}

export default function ZoneRenderer({ zone, theme, settings }) {
  const zStyle = zone.backgroundStyle || {}
  const sharedBg = settings?.background
  const shared = sharedBg?.type === 'regions'
  const accent = zStyle.accent || accentOf(theme)
  const isDark = !!zStyle.dark
  const bg = shared ? 'transparent' : zStyle.bg || (isDark ? 'var(--menu-bg-dark)' : 'var(--menu-bg-light)')
  // dark-looking zone: explicit dark flag OR an image bg (always has a dark
  // legibility overlay) → flip text to near-white so it stays readable. In
  // shared/regions mode the global background decides the text (or per-zone dark).
  const darkBg = isDark || (!!zStyle.bgImage && !shared)
  const zoneText =
    zStyle.text ||
    (shared
      ? sharedBg.text || (isDark ? '#FFFFFF' : '#1A1A1A')
      : darkBg
        ? '#FFFFFF'
        : '#1A1A1A')
  const cssVars = {
    '--menu-accent': accent,
    '--menu-text': zoneText,
    '--menu-text-muted': zoneText === '#FFFFFF' ? '#EEEEEE' : '#8A8A8A',
  }
  const tornClip = zStyle.torn?.edge
    ? tornZoneClipPath(zStyle.torn.edge, zone.id, zStyle.torn.jaggedness ?? 5)
    : null

  const isBanner = zone.zoneType === 'banner' || zone.zoneType === 'hero'
  const isGrid = zone.zoneType === 'grid'
  const isList = zone.zoneType === 'list' || zone.zoneType === 'carousel' || zone.zoneType === 'menu'

  let content
  if (isBanner) {
    content = <BannerContent zone={zone} theme={theme} settings={settings} accent={accent} />
  } else if (isGrid) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} theme={theme} banner={zone.backgroundStyle?.banner} />
        <GridContent zone={zone} theme={theme} />
      </div>
    )
  } else if (isList) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} theme={theme} banner={zone.backgroundStyle?.banner} />
        <ListContent zone={zone} theme={theme} settings={settings} />
      </div>
    )
  } else {
    // highlight / unknown: zone name + first item as image-title-desc card
    content = (
      <div className="flex h-full flex-col justify-center gap-4">
        <ZoneTitle name={zone.name} accent={accent} extraPrice={zone.backgroundStyle?.extraPrice} theme={theme} banner={zone.backgroundStyle?.banner} />
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

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg, padding: isBanner ? 0 : 40, clipPath: tornClip || undefined, ...cssVars }}
    >
      {zStyle.bgImage && !shared ? (
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
