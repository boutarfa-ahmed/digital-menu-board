import CardTemplatePreview from './CardTemplatePreview'

// T7.5 — final "styled" content of a zone (used in preview mode)
function StyledZoneContent({ zone, accent, text }) {
  const items = zone.items || []
  const t = zone.cardTemplate || 'default'

  if (zone.zoneType === 'banner' || zone.zoneType === 'hero') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25))' }}>
        {zone.name ? (
          <span className="px-1 text-center font-bold uppercase leading-tight" style={{ color: accent, fontSize: '1.2em' }}>
            {zone.name}
          </span>
        ) : null}
        <div className="h-0.5 w-2/3 rounded bg-white/30" />
      </div>
    )
  }

  if (zone.zoneType === 'grid') {
    const rows = zone.gridConfig?.rows || 1
    const cols = zone.gridConfig?.cols || 1
    return (
      <div className="grid min-h-0 flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          const item = items.find((it) => it.row === r && it.col === c)
          return item ? (
            <div key={i} className="min-h-0 min-w-0 overflow-hidden rounded">
              <CardTemplatePreview template={t} name={item.item?.name} accent={accent} text={text} />
            </div>
          ) : (
            <div key={i} className="min-h-0 min-w-0 rounded border border-current opacity-25" />
          )
        })}
      </div>
    )
  }

  // list / carousel / menu
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
      {items.length === 0 ? (
        <div className="m-auto text-[9px] uppercase tracking-wide opacity-50">Vide</div>
      ) : (
        items.slice(0, 12).map((it) => (
          <div key={it.itemId} className="h-5 flex-none">
            <CardTemplatePreview template={t} name={it.item?.name} accent={accent} text={text} />
          </div>
        ))
      )}
    </div>
  )
}

export default StyledZoneContent
