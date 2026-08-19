// T8 — FreeElementsLayer: renders the free-floating decorative layer
// (layout.settings.elements). Each element is positioned/sized by percentage
// of the 1920x1080 design canvas (NOT grid-locked) and stacked via its own
// zIndex value. Zones use a baseline zIndex of 20 (see ScreenRenderer), so an
// element with zIndex < 20 renders behind zones and zIndex >= 20 renders in
// front. Elements are purely decorative display — never interactive.
export default function FreeElementsLayer({ elements }) {
  if (!elements || elements.length === 0) return null

  return (
    <>
      {elements.map((el) => {
        const box = {
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: el.zIndex ?? 10,
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          pointerEvents: 'none',
        }

        if (el.type === 'text') {
          return (
            <div key={el.id} style={box}>
              <div className="flex h-full w-full items-center justify-center overflow-hidden">
                <span
                  className="font-menu-header uppercase tracking-wide text-center"
                  style={{ fontSize: el.fontSize || 24, color: el.color || '#FFFFFF', lineHeight: 1.1 }}
                >
                  {el.text}
                </span>
              </div>
            </div>
          )
        }

        // 'image' and 'logo' — user-uploaded content (e.g. Cloudinary).
        // object-contain: logos/decorative graphics should not be cropped.
        return (
          <div key={el.id} style={box}>
            <img src={el.imageUrl} alt="" className="h-full w-full object-contain" />
          </div>
        )
      })}
    </>
  )
}