// T8 — FreeElementsLayer: renders the free-floating decorative layer
// (layout.settings.elements). Each element is positioned/sized by percentage
// of the 1920x1080 design canvas (NOT grid-locked) and stacked via its own
// zIndex value. Zones use a baseline zIndex of 20 (see ScreenRenderer), so an
// element with zIndex < 20 renders behind zones and zIndex >= 20 renders in
// front. Elements are purely decorative display — never interactive.
import CategoryBanner from '../primitives/CategoryBanner.jsx'
import PriceBadge from '../primitives/PriceBadge.jsx'
import { badgeTypeOf } from '../../theme/designTokens'
import { elementVisualStyle } from '../../shared/menuSchema'

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
          const kind = el.kind || 'plain'
          // Hard cap: element font size never exceeds 200px, whatever is saved.
          const cap = (v) => (v ? Math.min(v, 200) : v)

          if (kind === 'banner') {
            const dark = el.dark !== false
            const size = (cap(el.fontSize) || 24) >= 26 ? 'lg' : (cap(el.fontSize) || 24) <= 16 ? 'sm' : 'md'
            return (
              <div key={el.id} style={box}>
                <div className="flex h-full w-full items-center">
                  <CategoryBanner
                    label={el.text}
                    accent={el.accent || 'var(--menu-accent)'}
                    size={size}
                    fontSize={cap(el.fontSize)}
                    topBg={dark ? '#16181C' : '#F5F3EF'}
                    topTextColor={dark ? '#FFFFFF' : '#1A1A1A'}
                  />
                </div>
              </div>
            )
          }

          if (kind === 'price') {
            const dark = el.dark !== false
            return (
              <div key={el.id} style={box}>
                <div className="flex h-full w-full items-center justify-center">
                  <PriceBadge
                    price={Number(el.price) || 0}
                    variant={dark ? 'dark' : 'light'}
                    badgeType={badgeTypeOf(el.badgeType)}
                    size={(cap(el.fontSize) || 24) >= 40 ? 'lg' : (cap(el.fontSize) || 24) <= 20 ? 'sm' : 'md'}
                    fontSize={cap(el.fontSize)}
                  />
                </div>
              </div>
            )
          }

          if (kind === 'divider') {
            const lineColor = el.color || '#FFFFFF'
            const lineW = Math.max(2, Math.round((cap(el.fontSize) || 24) / 12))
            return (
              <div key={el.id} style={box}>
                <div className="flex h-full w-full items-center gap-4 overflow-hidden">
                  <span
                    className="min-w-0 flex-1"
                    style={{ backgroundColor: lineColor, opacity: 0.6, height: lineW }}
                  />
                  <span
                    className="shrink-0 whitespace-nowrap font-menu-divider"
                    style={{ fontSize: cap(el.fontSize) || 24, color: lineColor, lineHeight: 1.4 }}
                  >
                    {el.text}
                  </span>
                  <span
                    className="min-w-0 flex-1"
                    style={{ backgroundColor: lineColor, opacity: 0.6, height: lineW }}
                  />
                </div>
              </div>
            )
          }

          if (kind === 'hero') {
            return (
              <div key={el.id} style={box}>
                <div className="flex h-full w-full items-center justify-center overflow-hidden">
                  <span
                    className="font-menu-header font-bold uppercase tracking-wide text-center"
                    style={{
                      fontSize: cap(el.fontSize) || 64,
                      color: el.color || '#FFFFFF',
                      lineHeight: 1,
                      textShadow: '0 4px 10px rgba(0,0,0,0.45)',
                      fontFamily: el.fontFamily || undefined,
                    }}
                  >
                    {el.text}
                  </span>
                </div>
              </div>
            )
          }

          // 'plain' — comportement original inchangé
          return (
            <div key={el.id} style={box}>
              <div className="flex h-full w-full items-center justify-center overflow-hidden">
                <span
                  className="font-menu-header uppercase tracking-wide text-center"
                  style={{
                    fontSize: cap(el.fontSize) || 24,
                    color: el.color || '#FFFFFF',
                    lineHeight: 1.1,
                    fontFamily: el.fontFamily || undefined,
                  }}
                >
                  {el.text}
                </span>
              </div>
            </div>
          )
        }

        // 'image', 'logo' and 'icon' — fichiers uploadés (Cloudinary). Le
        // rendu (proportions, pastille de fond, marge, opacité, recoloration)
        // est calculé par le schéma partagé, pour que l'éditeur admin et la TV
        // dessinent la même chose. Défauts hérités : image étirée sur toute la
        // boîte — largeur et hauteur se règlent séparément dans l'éditeur, donc
        // sans étirement le dessin n'atteindrait jamais vraiment un bord.
        const visual = elementVisualStyle(el)
        return (
          <div key={el.id} style={box}>
            <div style={visual.frame}>
              {visual.mask ? (
                <span style={visual.mask} />
              ) : (
                <img
                  src={el.imageUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: visual.fit }}
                />
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}