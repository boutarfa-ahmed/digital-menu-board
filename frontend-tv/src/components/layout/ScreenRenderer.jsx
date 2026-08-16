// T7.8 — ScreenRenderer: composes a published ScreenLayout (nested zones +
// items) onto the TV. Zones are positioned from the 12x12 grid (x/y/w/h) as
// percentages of a fixed 1920x1080 design canvas, then the whole canvas is
// uniformly scaled to fill the physical screen. This keeps the 16:9 layout
// pixel-perfect across TVs with slightly different resolutions.
import { useEffect, useState } from 'react'
import Background from '../ui/Background.jsx'
import { themeToCssVars } from '../../theme/designTokens'
import ZoneRenderer from '../zones/ZoneRenderer.jsx'

const DESIGN_W = 1920
const DESIGN_H = 1080
const GRID = 12

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export default function ScreenRenderer({ layout }) {
  const { w, h } = useViewport()
  const scale = Math.min(w / DESIGN_W, h / DESIGN_H)
  const zones = layout?.zones || []

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* theme tokens scoped to the design canvas */}
        <div className="absolute inset-0" style={themeToCssVars(layout?.theme)}>
          <Background config={layout?.settings?.background} />
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="absolute"
              style={{
                left: `${(zone.x / GRID) * 100}%`,
                top: `${(zone.y / GRID) * 100}%`,
                width: `${(zone.w / GRID) * 100}%`,
                height: `${(zone.h / GRID) * 100}%`,
              }}
            >
              <ZoneRenderer zone={zone} theme={layout?.theme} settings={layout?.settings} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
