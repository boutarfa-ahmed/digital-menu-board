import { BADGE_STYLES, BADGE_POS_PX, STYLE_DEFAULTS } from './constants'
import { TORN_CLIP } from './tornPaper'

function ZoneBadgePreview({ config, accent }) {
  if (!config) return null
  const style = BADGE_STYLES.includes(config.style) ? config.style : 'torn-paper'
  const pos = BADGE_POS_PX[config.position] || BADGE_POS_PX['top-right']
  const transform = (pos.translateX ? 'translateX(-50%) ' : '') + (style === 'circle-stamp' ? 'rotate(-6deg)' : style === 'torn-paper' ? 'rotate(-1.5deg)' : '')
  const accentColor = accent || STYLE_DEFAULTS.accent
  const label =
    config.text ||
    (config.price != null ? `${Number(config.price).toFixed(2).replace('.', ',')}€` : '')
  const common = {
    position: 'absolute',
    zIndex: 20,
    ...pos,
    transform: transform || undefined,
  }
  if (style === 'circle-stamp') {
    return (
      <span
        style={{
          ...common,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 9999,
          border: `2px dashed ${accentColor}`,
          background: '#FFFFFF',
          color: accentColor,
          fontSize: 6,
          fontWeight: 700,
          textAlign: 'center',
          textTransform: 'uppercase',
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
    )
  }
  if (style === 'ribbon') {
    return (
      <span
        style={{
          ...common,
          background: accentColor,
          color: '#FFFFFF',
          fontSize: 6,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '2px 6px',
          transform: `skewX(-10deg)`,
        }}
      >
        <span style={{ display: 'inline-block', transform: 'skewX(10deg)' }}>{label}</span>
      </span>
    )
  }
  return (
    <span
      style={{
        ...common,
        background: '#FFFFFF',
        color: '#0D0D0D',
        fontSize: 6,
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '2px 5px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        clipPath: TORN_CLIP,
      }}
    >
      {label}
    </span>
  )
}

export default ZoneBadgePreview
