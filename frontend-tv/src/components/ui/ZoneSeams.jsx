// Torn-paper dividers rendered between adjacent zones. Active when the
// screen background pattern is 'torn-paper': every vertical/horizontal seam
// where two zones touch gets a torn band (patternColor), mirroring the
// classic "torn paper divider between panels" look from the design spec.
//
// Ce fichier ne fait que repérer les jointures : la déchirure elle-même est
// calculée dans le schéma partagé et dessinée par SeamRibbons, pour que le
// builder et la TV ne puissent pas diverger.

import SeamRibbons from './SeamRibbons.jsx'
import { computeSeams } from '../../shared/menuSchema'

// seamsEnabled master switch + per-seam hiddenSeams / seamShape (keys like
// "v:6:0:12"), tous posés par le builder.
export default function ZoneSeams({
  zones,
  patternColor = '#FFFFFF',
  seamsEnabled = true,
  hiddenSeams = [],
  seamShape = {},
  seamThickness,
  mode = 'band',
}) {
  const hidden = new Set(hiddenSeams || [])
  const { v, h } = computeSeams(zones || [])
  if (!seamsEnabled) return null
  const seams = [...v, ...h].filter((s) => !hidden.has(s.key))
  return (
    <SeamRibbons
      seams={seams}
      color={patternColor}
      thickness={seamThickness}
      seamShape={seamShape || {}}
      mode={mode}
    />
  )
}
