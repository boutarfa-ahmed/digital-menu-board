// T7.8 — zone renderer: renders one zone's content from its zoneType /
// cardTemplate / gridConfig using the T7.7 card components. The zone wrapper
// applies the T7.4 backgroundStyle overrides (bg/text/accent) as scoped tokens.
import ImageTitleDescPriceCard from '../cards/ImageTitleDescPriceCard.jsx'
import ListRowCard from '../cards/ListRowCard.jsx'
import HeroBannerCard from '../cards/HeroBannerCard.jsx'
import ZoneBadge from '../ui/ZoneBadge.jsx'
import { accentOf, cardFields } from '../cards/cardUtils.js'

function ZoneTitle({ name, accent }) {
  if (!name) return null
  return (
    <h2
      className="mb-6 font-menu-header uppercase leading-tight tracking-wide"
      style={{ color: accent, fontSize: 34 }}
    >
      {name}
    </h2>
  )
}

// Grid cell: the product image fills the cell edge-to-edge (cover, "GIF-like").
// No image -> empty cell, no centered fallback icon.
function GridImageCell({ zi }) {
  const { name, imageUrl } = cardFields(zi.item)
  if (!imageUrl) return null
  return (
    <div className="relative h-full w-full overflow-hidden rounded-md shadow-menu-badge">
      <img src={imageUrl} alt={name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8">
        <span className="font-menu-header text-lg uppercase leading-tight tracking-wide text-white">
          {name}
        </span>
      </div>
    </div>
  )
}

function GridContent({ zone }) {
  const rows = zone.gridConfig?.rows || 1
  const cols = zone.gridConfig?.cols || 1
  const items = zone.items || []
  const cells = Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    return items.find((it) => it.row === r && it.col === c)
  })

  return (
    <div
      className="grid min-h-0 flex-1 gap-5"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {cells.map((zi, i) =>
        zi ? (
          <div key={zi.itemId} className="min-h-0 min-w-0">
            <GridImageCell zi={zi} />
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
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
      {items.length === 0 ? (
        <p className="text-center font-menu-body text-sm text-menu-text-muted">Vide</p>
      ) : (
        items.slice(0, 12).map((zi) => (
          <ListRowCard
            key={zi.itemId}
            item={zi.item}
            theme={theme}
            showPrice={showPrice}
            template={zone.cardTemplate}
          />
        ))
      )}
    </div>
  )
}

function BannerContent({ zone, theme, settings, accent }) {
  const first = zone.items?.[0]
  const showPrice = settings?.showPrices !== false
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
  const accent = zStyle.accent || accentOf(theme)
  const isDark = !!zStyle.dark
  const bg = zStyle.bg || (isDark ? 'var(--menu-bg-dark)' : 'var(--menu-bg-light)')
  const cssVars = {
    '--menu-accent': accent,
    '--menu-text': zStyle.text || (isDark ? '#FFFFFF' : '#1A1A1A'),
  }

  const isBanner = zone.zoneType === 'banner' || zone.zoneType === 'hero'
  const isGrid = zone.zoneType === 'grid'
  const isList = zone.zoneType === 'list' || zone.zoneType === 'carousel' || zone.zoneType === 'menu'

  let content
  if (isBanner) {
    content = <BannerContent zone={zone} theme={theme} settings={settings} accent={accent} />
  } else if (isGrid) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} />
        <GridContent zone={zone} />
      </div>
    )
  } else if (isList) {
    content = (
      <div className="flex h-full flex-col">
        <ZoneTitle name={zone.name} accent={accent} />
        <ListContent zone={zone} theme={theme} settings={settings} />
      </div>
    )
  } else {
    // highlight / unknown: zone name + first item as image-title-desc card
    content = (
      <div className="flex h-full flex-col justify-center gap-4">
        <ZoneTitle name={zone.name} accent={accent} />
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
      style={{ background: bg, padding: isBanner ? 0 : 40, ...cssVars }}
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
