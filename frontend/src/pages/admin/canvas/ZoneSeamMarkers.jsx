import { gpt, computeSeamsAdmin } from './canvasUtils'
import { tornStripDataUri, tornStripVDataUri } from './tornPaper'

function ZoneSeamMarkers({ zones, color = '#FFFFFF', seamsEnabled = true, hiddenSeams = [], onToggle = null }) {
  const hidden = new Set(hiddenSeams || [])
  const interact = typeof onToggle === 'function'
  const { v, h } = computeSeamsAdmin(zones || [])
  if (!seamsEnabled) return null
  const vv = v.filter((s) => !hidden.has(s.key))
  const hh = h.filter((s) => !hidden.has(s.key))
  if (vv.length === 0 && hh.length === 0) return null
  return (
    <>
      {vv.map((s) => (
        <div
          key={`szv${s.key}`}
          className={`absolute z-30 ${interact ? 'pointer-events-auto cursor-pointer hover:ring-2 hover:ring-white/70' : 'pointer-events-none'}`}
          title={interact ? 'Masquer la ligne' : undefined}
          onClick={interact ? () => onToggle(s.key) : undefined}
          style={{
            left: gpt(s.pos),
            top: gpt(s.a),
            width: 8,
            height: gpt(s.span),
            transform: 'translateX(-50%)',
            backgroundImage: tornStripVDataUri(color),
            backgroundRepeat: 'repeat-y',
            backgroundSize: '8px 44px',
            opacity: 0.9,
          }}
        />
      ))}
      {hh.map((s) => (
        <div
          key={`szh${s.key}`}
          className={`absolute z-30 ${interact ? 'pointer-events-auto cursor-pointer hover:ring-2 hover:ring-white/70' : 'pointer-events-none'}`}
          title={interact ? 'Masquer la ligne' : undefined}
          onClick={interact ? () => onToggle(s.key) : undefined}
          style={{
            left: gpt(s.a),
            top: gpt(s.pos),
            width: gpt(s.span),
            height: 8,
            transform: 'translateY(-50%)',
            backgroundImage: tornStripDataUri(color),
            backgroundRepeat: 'repeat-x',
            backgroundSize: '44px 8px',
            opacity: 0.9,
          }}
        />
      ))}
    </>
  )
}

export default ZoneSeamMarkers
