import { CARD_TEMPLATES, STYLE_DEFAULTS } from './constants'

// T7.5 — mini card-template mockup shown in canvas slots (wireframe + styled)
function TemplateBody({ template, name, accent, text }) {
  const t = CARD_TEMPLATES.includes(template) ? template : 'default'
  const a = accent || STYLE_DEFAULTS.accent
  // open templates (transparent bg) take the zone text color so they flip with
  // the fond (→.text-menu-text). Templates with an inner light chip keep the
  // accent name so it stays readable on the white chip.
  const open = ['compact', 'minimal', 'icon-label', 'text-only'].includes(t)
  const nameColor = open && text ? text : a
  const imgBlock = <div className="min-h-0 flex-1 bg-gray-400/60" />

  if (t === 'compact') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden">
        <div className="size-4 flex-none rounded bg-white/85 shadow-sm" />
        <span className="max-w-full truncate text-[8px] font-semibold uppercase leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
      </div>
    )
  }
  if (t === 'large') {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white/75 shadow-sm">
        {imgBlock}
        <div className="p-0.5">
          <span className="block truncate text-[8px] font-semibold leading-tight" style={{ color: a }}>
            {name}
          </span>
        </div>
      </div>
    )
  }
  if (t === 'minimal') {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden">
        <span className="truncate text-[8px] font-semibold uppercase leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
        <div className="h-0.5 w-3/4 rounded bg-white/40" />
      </div>
    )
  }
  if (t === 'media') {
    return (
      <div className="flex h-full w-full items-center gap-1 overflow-hidden rounded bg-white/75 shadow-sm">
        <div className="h-full w-1/4 flex-none bg-gray-400/60" />
        <span className="min-w-0 flex-1 truncate text-[8px] font-semibold leading-tight" style={{ color: a }}>
          {name}
        </span>
      </div>
    )
  }
  if (t === 'icon-label') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden">
        <div className="size-4 flex-none rounded-full bg-white/85 shadow-sm" />
        <span className="max-w-full truncate text-center text-[8px] font-semibold uppercase leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
      </div>
    )
  }
  if (t === 'text-only') {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden px-0.5">
        <span className="truncate text-[8px] font-bold uppercase leading-tight" style={{ color: nameColor }}>
          {name}
        </span>
        <div className="h-0.5 w-full rounded bg-white/30" />
        <div className="h-0.5 w-2/3 rounded bg-white/20" />
      </div>
    )
  }
  if (t === 'image-title-desc-price') {
    return (
      <div className="flex h-full w-full items-center gap-1 overflow-hidden rounded bg-white/75 px-0.5 shadow-sm">
        <div className="size-3.5 flex-none rounded bg-gray-400/60" />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[8px] font-semibold leading-tight" style={{ color: a }}>
            {name}
          </span>
          <div className="mt-0.5 h-0.5 w-full rounded bg-white/40" />
          <div className="mt-0.5 h-0.5 w-2/3 rounded bg-white/30" />
        </div>
      </div>
    )
  }
  // default: small thumb + title + desc line
  return (
    <div className="flex h-full w-full items-center gap-1 overflow-hidden rounded bg-white/75 shadow-sm">
      <div className="size-3.5 flex-none rounded bg-gray-400/60" />
      <div className="min-w-0">
        <span className="block truncate text-[8px] font-semibold leading-tight" style={{ color: a }}>
          {name}
        </span>
        <div className="mt-0.5 h-0.5 w-2/3 rounded bg-white/40" />
      </div>
    </div>
  )
}

// T9b — la pastille prix reprend la case « Afficher le prix » de la zone, pour
// que la maquette du canvas montre le même contenu que l'écran TV.
function CustomBody({ layout, name, accent, text, price }) {
  const slots = Array.isArray(layout?.slots) ? layout.slots : []
  if (slots.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[8px] uppercase opacity-50">
        Perso
      </div>
    )
  }
  return (
    <div
      className={`relative h-full w-full ${layout?.clip ? 'overflow-hidden' : ''}`}
      // Un slot peut porter une couleur en jeton de thème (var(--menu-accent)).
      // Ces jetons n'existent que sur la TV : sans eux la vignette rendrait une
      // couleur invalide au lieu de celle de la zone.
      style={{ '--menu-accent': accent, '--menu-text': text, '--menu-text-muted': text }}
    >
      {slots
        .filter((slot) => slot.visible !== false)
        .map((slot) => {
          const box = {
            position: 'absolute',
            left: `${slot.x}%`,
            top: `${slot.y}%`,
            width: `${slot.w}%`,
            height: `${slot.h}%`,
            zIndex: slot.zIndex ?? 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              slot.align === 'right' ? 'flex-end' : slot.align === 'center' ? 'center' : 'flex-start',
          }
          if (slot.type === 'image') {
            return <div key={slot.id} style={box}><div className="h-full w-full rounded-sm bg-gray-400/60" /></div>
          }
          if (slot.type === 'asset') {
            return (
              <div key={slot.id} style={box}>
                {slot.imageUrl ? (
                  <img src={slot.imageUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full rounded-sm border border-dashed border-current/40" />
                )}
              </div>
            )
          }
          if (slot.type === 'shape') {
            return <div key={slot.id} style={box}><div className="h-full w-full rounded-sm" style={{ background: slot.bg || accent }} /></div>
          }
          if (slot.type === 'price' || slot.type === 'qty' || slot.type === 'zoneBadge') {
            return (
              <div key={slot.id} style={box}>
                <span
                  className="rounded-sm px-0.5 text-[6px] font-bold leading-tight text-white"
                  style={{ background: slot.type === 'price' ? '#000000B3' : accent }}
                >
                  {slot.type === 'price'
                    ? Number(price ?? 0).toFixed(2)
                    : slot.type === 'qty'
                      ? '2X'
                      : slot.text || '★'}
                </span>
              </div>
            )
          }
          const label = slot.type === 'name' ? name : slot.type === 'desc' ? '···' : slot.text || '···'
          return (
            <div key={slot.id} style={box}>
              <span
                className="w-full truncate text-[6px] font-semibold leading-tight"
                style={{ color: slot.color || text, textAlign: slot.align || 'left' }}
              >
                {label}
              </span>
            </div>
          )
        })}
    </div>
  )
}

function CardTemplatePreview({ template, name, accent, text, showPrice = false, price = null, layout = null }) {
  if (template === 'custom') {
    return <CustomBody layout={layout} name={name} accent={accent} text={text} price={price} />
  }
  const body = <TemplateBody template={template} name={name} accent={accent} text={text} />
  if (!showPrice || typeof price !== 'number') return body
  // Les templates à vignette collent le badge au coin haut-droit de la photo
  // (cf. GridImageCell côté TV) ; les autres l'affichent sous le texte.
  const corner = ['default', 'compact', 'large', 'minimal', 'media'].includes(template || 'default')
    ? 'right-0 top-0'
    : 'bottom-0 right-0'
  return (
    <div className="relative h-full w-full">
      {body}
      <span className={`absolute ${corner} rounded-sm bg-black/70 px-0.5 text-[7px] font-bold leading-tight text-white`}>
        {price.toFixed(2)}
      </span>
    </div>
  )
}

export default CardTemplatePreview
