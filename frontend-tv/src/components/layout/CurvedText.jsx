// Un texte posé sur un arc de cercle plutôt que sur une ligne droite.
//
// Le principe : on mesure d'abord la largeur que le texte occuperait en ligne
// droite (un exemplaire caché, avec exactement la même police et les mêmes
// classes), et cette largeur devient la longueur de l'arc. Les lettres gardent
// donc leur taille et leur espacement — seule leur orientation change — et le
// texte remplit l'arc pile, qu'il fasse trois lettres ou trente.
//
// La géométrie elle-même (rayon, angle, tracé) vient de curvedTextGeometry()
// du schéma partagé, pour que l'aperçu du builder et la TV dessinent le même
// arc. Rendu builder correspondant :
// frontend/src/pages/admin/canvas/CurvedText.jsx
import { useEffect, useId, useRef, useState } from 'react'
import { curvedTextGeometry } from '../../shared/menuSchema'

export default function CurvedText({ text, curve, className = '', style = {} }) {
  const measureRef = useRef(null)
  const [textWidth, setTextWidth] = useState(0)
  // useId() fabrique des identifiants à deux-points (« :r3: ») : on les retire,
  // href="#..." les accepte mal.
  const pathId = `curve-${useId().replace(/:/g, '')}`
  const fontSize = Number(style.fontSize) || 24

  useEffect(() => {
    const node = measureRef.current
    if (!node) return undefined
    const update = () => setTextWidth(node.getBoundingClientRect().width || 0)
    update()
    // La largeur bouge aussi bien quand le texte change que quand la police de
    // la bibliothèque finit de se charger : l'observateur rattrape les deux,
    // sinon l'arc resterait taillé pour la police de secours.
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [text])

  const geo = curvedTextGeometry(curve, textWidth, fontSize)

  return (
    <span className="relative inline-flex flex-none items-center justify-center">
      <span
        ref={measureRef}
        aria-hidden="true"
        className={className}
        style={{
          ...style,
          position: 'absolute',
          left: 0,
          top: 0,
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {text}
      </span>
      {geo && (
        <svg
          width={geo.width}
          height={geo.height}
          viewBox={`0 0 ${geo.width} ${geo.height}`}
          // Débordement visible : l'arc est plus haut et plus large que la
          // boîte de l'élément dès qu'on courbe fort, et le rogner couperait
          // les lettres des extrémités.
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <path id={pathId} d={geo.path} fill="none" />
          </defs>
          <text
            className={className}
            textAnchor="middle"
            style={{ ...style, fill: style.color || 'currentColor' }}
          >
            <textPath href={`#${pathId}`} startOffset="50%">
              {text}
            </textPath>
          </text>
        </svg>
      )}
    </span>
  )
}
