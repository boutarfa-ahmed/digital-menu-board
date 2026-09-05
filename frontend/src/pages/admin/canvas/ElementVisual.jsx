// Un élément dessiné (image, logo, icône) rendu exactement comme la TV le
// rend : les deux passent par elementVisualStyle() du schéma partagé. Utilisé
// par la surcouche du canvas et par l'aperçu du panneau de droite, pour que ce
// qu'on voit en éditant soit ce qui s'affichera sur l'écran.
//
// Rendu TV correspondant : frontend-tv/src/components/layout/FreeElementsLayer.jsx
import { elementVisualStyle } from '../../../shared/menuSchema'

export default function ElementVisual({ el }) {
  const visual = elementVisualStyle(el)
  return (
    <div style={visual.frame}>
      {visual.mask ? (
        <span style={visual.mask} />
      ) : (
        <img
          src={el.imageUrl}
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: visual.fit }}
        />
      )}
    </div>
  )
}
