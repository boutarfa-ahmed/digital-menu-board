import { useRef } from 'react'
import { computeSeamsAdmin, clamp } from './canvasUtils'
import SeamRibbons from './SeamRibbons'
import {
  seamHandles,
  seamShapeValue,
  seamShapeDrag,
  SEAM_BEND_MAX,
  GRID,
  DESIGN_W,
  DESIGN_H,
} from '../../../shared/menuSchema'

// Les bandes de papier déchiré des jointures, dans le builder. En lecture seule
// (canvas principal) elles ne font que se dessiner. Quand `onShape` est fourni
// (aperçu du dialogue « Fond »), elles se règlent à la souris :
//   - glisser la ligne n'importe où -> elle se courbe à CET endroit-là, le
//     point attrapé suit le curseur (les billes ne sont que des repères sur
//     le début, le milieu et la fin)
//   - Maj + glisser                 -> déplacer la ligne entière
//   - cliquer sans bouger           -> masquer la ligne (onToggle)
function ZoneSeamMarkers({
  zones,
  color = '#FFFFFF',
  seamsEnabled = true,
  hiddenSeams = [],
  seamShape = {},
  seamThickness,
  mode = 'band',
  onToggle = null,
  onShape = null,
}) {
  const stageRef = useRef(null)
  const hidden = new Set(hiddenSeams || [])
  const { v, h } = computeSeamsAdmin(zones || [])
  const editable = typeof onShape === 'function'

  // Un geste = un pointeur suivi jusqu'au relâchement. `handleT` vaut 0, 0.5 ou
  // 1 quand on attrape une bille ; sinon on lit l'endroit attrapé sur la ligne
  // elle-même, pour qu'elle se courbe là où la main s'est posée.
  const startGesture = (e, seam, handleT) => {
    if (!editable || !stageRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const stage = stageRef.current.getBoundingClientRect()
    if (!stage.width || !stage.height) return
    const vertical = seam.key.charAt(0) === 'v'
    const base = seamShapeValue(seamShape[seam.key])
    const startX = e.clientX
    const startY = e.clientY
    const whole = e.shiftKey
    // Position du point attrapé sur la longueur de la ligne : 0 à son début,
    // 1 à sa fin.
    const startPct = (seam.a / GRID) * 100
    const lenPct = (seam.span / GRID) * 100
    const alongPct = vertical
      ? ((startY - stage.top) / stage.height) * 100
      : ((startX - stage.left) / stage.width) * 100
    const grabT =
      handleT != null ? handleT : lenPct === 0 ? 0 : clamp((alongPct - startPct) / lenPct, 0, 1)
    let moved = false

    const onMove = (ev) => {
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 3) moved = true
      if (!moved) return
      // Le déplacement se mesure en % de l'écran, sur l'axe que la jointure
      // traverse : une ligne verticale se déplace en X, une horizontale en Y.
      const delta = vertical
        ? ((ev.clientX - startX) / stage.width) * 100
        : ((ev.clientY - startY) / stage.height) * 100
      const move = (value) => clamp(value + delta, -SEAM_BEND_MAX, SEAM_BEND_MAX)
      onShape(
        seam.key,
        whole
          ? { a: move(base.a), b: move(base.b), c: move(base.c) }
          : seamShapeDrag(base, grabT, delta)
      )
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      // Un clic net, sans déplacement, garde son ancien rôle : masquer la ligne.
      if (!moved && handleT == null && typeof onToggle === 'function') onToggle(seam.key)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  if (!seamsEnabled) return null
  const seams = [...v, ...h].filter((s) => !hidden.has(s.key))
  if (seams.length === 0) return null

  return (
    <div ref={stageRef} className="pointer-events-none absolute inset-0 z-30">
      <SeamRibbons
        seams={seams}
        color={color}
        thickness={seamThickness}
        seamShape={seamShape}
        mode={mode}
        className="absolute inset-0 h-full w-full overflow-visible"
        pathProps={
          editable
            ? (key) => {
                const seam = seams.find((s) => s.key === key)
                return {
                  style: { pointerEvents: 'stroke', cursor: 'grab', touchAction: 'none' },
                  onPointerDown: (e) => startGesture(e, seam, null),
                }
              }
            : null
        }
      >
        {editable ? (
          <title>Glisser pour courber ici · Maj+glisser pour déplacer · cliquer pour masquer</title>
        ) : null}
      </SeamRibbons>

      {editable &&
        seams.map((seam) =>
          seamHandles(seam, seamShape[seam.key], seamThickness).map((handle) => (
            <span
              key={`${seam.key}-${handle.t}`}
              onPointerDown={(e) => startGesture(e, seam, handle.t)}
              title="Tirer le début, le milieu ou la fin de la déchirure"
              className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500 shadow"
              style={{
                left: `${(handle.x / DESIGN_W) * 100}%`,
                top: `${(handle.y / DESIGN_H) * 100}%`,
                cursor: 'crosshair',
                touchAction: 'none',
              }}
            />
          ))
        )}
    </div>
  )
}

export default ZoneSeamMarkers
