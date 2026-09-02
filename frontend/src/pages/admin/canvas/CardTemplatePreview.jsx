import { CARD_TEMPLATES, STYLE_DEFAULTS } from './constants'

// T7.5 — mini card-template mockup shown in canvas slots (wireframe + styled)
function CardTemplatePreview({ template, name, accent, text }) {
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

export default CardTemplatePreview
