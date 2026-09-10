import { Fragment, useId } from 'react'
import { seamRibbon, seamTearPath, seamThicknessValue, DESIGN_W, DESIGN_H } from '../../../shared/menuSchema'

// Le calque SVG des jointures. Il est posé en viewBox 1920x1080 par-dessus un
// cadre 16:9 : tout se calcule une fois en coordonnées maquette, et le builder
// (aperçu petit) comme la TV (plein écran) obtiennent le même dessin.
//
// Deux modes, selon la texture choisie pour le fond :
//   'band' — une bande de papier déchiré posée par-dessus la jointure. Trois
//            couches : la feuille et son ombre portée, le grain de papier
//            découpé dedans, puis l'ombre des bords qui donne l'épaisseur.
//   'edge' — pas de bande : les deux zones se touchent directement sur la
//            déchirure (c'est leur découpe qui la dessine, voir zoneSeamClip).
//            Il ne reste ici qu'une ombre douce le long de la ligne, pour que
//            la feuille du dessus décolle un peu de sa voisine.
export default function SeamRibbons({
  seams,
  color = '#FFFFFF',
  thickness,
  seamShape = {},
  mode = 'band',
  className = 'pointer-events-none absolute inset-0 z-30 h-full w-full',
  children = null,
  pathProps = null,
}) {
  // Les identifiants des filtres doivent être uniques : deux calques peuvent
  // cohabiter dans la page (le canvas et l'aperçu du dialogue « Fond »), et
  // le second reprendrait sinon la découpe du premier.
  const uid = useId().replace(/:/g, '')
  const th = seamThicknessValue(thickness)
  if (seams.length === 0) return null

  const grabWidth = Math.max(44, th * 1.6)
  const grabs = (paths) =>
    pathProps
      ? paths.map((r) => (
          <path
            key={`grab${r.key}`}
            d={r.d}
            fill="none"
            stroke="transparent"
            strokeWidth={grabWidth}
            strokeLinejoin="round"
            {...pathProps(r.key)}
          />
        ))
      : null

  if (mode === 'edge') {
    const lines = seams.map((seam) => ({
      key: seam.key,
      d: seamTearPath(seam, seamShape[seam.key], th),
    }))
    return (
      <svg viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`} preserveAspectRatio="none" className={className}>
        <defs>
          <filter id={`bl${uid}`}>
            <feGaussianBlur stdDeviation={Math.max(1.5, th * 0.13)} />
          </filter>
        </defs>
        <g
          filter={`url(#bl${uid})`}
          fill="none"
          stroke="#000000"
          strokeOpacity="0.32"
          strokeWidth={Math.max(2.5, th * 0.17)}
        >
          {lines.map((l) => (
            <path key={l.key} d={l.d} />
          ))}
        </g>
        {/* Prise à la souris : un tracé transparent, bien plus large que la
            ligne, pour qu'elle s'attrape sans viser. */}
        {grabs(lines)}
        {children}
      </svg>
    )
  }

  const ribbons = seams.map((seam) => ({ key: seam.key, ...seamRibbon(seam, seamShape[seam.key], th) }))

  return (
    <svg viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`} preserveAspectRatio="none" className={className}>
      <defs>
        <filter id={`sh${uid}`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
        </filter>
        <filter id={`gr${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
        </filter>
        <filter id={`bl${uid}`}>
          <feGaussianBlur stdDeviation={Math.max(1.5, th * 0.1)} />
        </filter>
        {/* La fibre. Un contour vectoriel, même très découpé, garde des facettes
            droites entre ses points : de près ça se voit tout de suite. Ce bruit
            fin déplace le bord point par point et lui donne le duvet arraché
            d'une vraie déchirure. */}
        <filter id={`fi${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="4" seed="19" result="fib" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="fib"
            scale={Math.max(3, Math.min(8, th * 0.22))}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <clipPath id={`cl${uid}`}>
          {ribbons.map((r) => (
            <path key={r.key} d={r.d} />
          ))}
        </clipPath>
      </defs>

      {/* L'ombre porte sur le papier déjà effiloché : le duvet doit être posé
          en dessous, sinon le grain déborderait du bord déplacé. */}
      <g filter={`url(#sh${uid})`}>
        <g filter={`url(#fi${uid})`}>
          {ribbons.map((r) => (
            <path key={r.key} d={r.d} fill={color} />
          ))}
          <g clipPath={`url(#cl${uid})`}>
            <rect x="0" y="0" width={DESIGN_W} height={DESIGN_H} filter={`url(#gr${uid})`} />
            <g
              filter={`url(#bl${uid})`}
              fill="none"
              stroke="#000000"
              strokeOpacity="0.34"
              strokeWidth={Math.max(3, th * 0.22)}
            >
              {ribbons.map((r) => (
                <Fragment key={r.key}>
                  <path d={r.a} />
                  <path d={r.b} />
                </Fragment>
              ))}
            </g>
          </g>
        </g>
      </g>
      {grabs(ribbons)}
      {children}
    </svg>
  )
}
