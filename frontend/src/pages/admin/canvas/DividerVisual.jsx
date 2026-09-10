// Un élément « Séparateur » (un filet, le mot, un filet) rendu exactement comme
// la TV le rend : les deux passent par elementDividerStyle() du schéma partagé.
// Sans ça le canvas n'affichait que le mot, et l'écart entre le mot et ses
// filets se réglait à l'aveugle.
//
// Rendu TV correspondant : frontend-tv/src/components/layout/FreeElementsLayer.jsx
import { elementDividerStyle } from '../../../shared/menuSchema'

export default function DividerVisual({ el }) {
  const divider = elementDividerStyle(el)
  return (
    <div className="flex h-full w-full items-center overflow-hidden" style={{ gap: divider.gap }}>
      <span className="min-w-0 flex-1" style={divider.line} />
      <span className="shrink-0 whitespace-nowrap" style={divider.text}>
        {el.text}
      </span>
      <span className="min-w-0 flex-1" style={divider.line} />
    </div>
  )
}
