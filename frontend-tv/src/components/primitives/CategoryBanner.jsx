import { tornZoneClipPath } from './TornEdge.jsx'

const SIZES = {
  sm: { pad: 'px-4 py-0.5', font: 14, overlap: -4 },
  md: { pad: 'px-5 py-1', font: 18, overlap: -5 },
  lg: { pad: 'px-6 py-1.5', font: 22, overlap: -6 },
}

/**
 * CategoryBanner — torn-paper two-stack badge (OUR / EXTRAS style).
 * Top band: light paper background, dark text (first label line).
 * Bottom band: accent background, white text (second label line), slightly
 * overlapping the top band. Each band has a torn bottom edge (tornZoneClipPath,
 * deterministic per band) and the whole badge is rotated -3deg with a soft
 * drop shadow. Intrinsic width — no divider line.
 * @param {string} label - section title (e.g. "OUR EXTRAS" -> "OUR" / "EXTRAS").
 *   If no space, only the bottom (accent) band is rendered.
 * @param {[string,string]} [lines] - explicit [top, bottom] override.
 * @param {string} [accent='var(--menu-accent)'] - bottom band background.
 * @param {string} [topBg='#F5F3EF'] - top band background (paper).
 * @param {string} [topTextColor='#1A1A1A'] - top band text color.
 * @param {string} [bottomTextColor='#FFFFFF'] - bottom band text color.
 * @param {string} [textColor] - legacy alias for bottomTextColor.
 * @param {'sm'|'md'|'lg'} [size='md'] - font / padding / overlap scale.
 * @param {number} [fontSize] - explicit pixel size; overrides the `size` font
 *   so the badge grows past the sm/md/lg presets (used by free elements).
 * @param {string} [className] - extra classes for the outer wrapper.
 */
export default function CategoryBanner({
  label,
  lines,
  accent = 'var(--menu-accent)',
  topBg = '#F5F3EF',
  topTextColor = '#1A1A1A',
  bottomTextColor,
  textColor,
  size = 'md',
  fontSize,
  className,
}) {
  const s = SIZES[size] || SIZES.md
  const font = fontSize ? Math.max(6, fontSize) : s.font
  const resolvedBottom = bottomTextColor !== undefined ? bottomTextColor : textColor !== undefined ? textColor : '#FFFFFF'

  let topLine = null
  let bottomLine = label || ''

  if (Array.isArray(lines) && lines.length >= 2) {
    topLine = lines[0]
    bottomLine = lines[1]
  } else if (typeof label === 'string') {
    const sp = label.indexOf(' ')
    if (sp !== -1) {
      topLine = label.slice(0, sp).trim()
      bottomLine = label.slice(sp + 1).trim() || label.slice(0, sp).trim()
    }
  }

  const seedBase = String(label || 'banner')
  const bandCls = `font-menu-header font-bold uppercase tracking-wide leading-none text-center ${s.pad}`

  return (
    <div className={`inline-block ${className || ''}`} style={{ transform: 'rotate(-3deg)' }}>
      <div className="flex flex-col items-center" style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}>
        {topLine ? (
          <div
            className={bandCls}
            style={{
              position: 'relative',
              zIndex: 1,
              background: topBg,
              color: topTextColor,
              fontSize: font,
              clipPath: tornZoneClipPath('bottom', `${seedBase}-top`, 6, 8),
            }}
          >
            {topLine}
          </div>
        ) : null}
        <div
          className={bandCls}
          style={{
            position: 'relative',
            zIndex: 2,
            background: accent,
            color: resolvedBottom,
            fontSize: font,
            marginTop: topLine ? s.overlap : 0,
            clipPath: tornZoneClipPath('bottom', `${seedBase}-bottom`, 6, 10),
          }}
        >
          {bottomLine}
        </div>
      </div>
    </div>
  )
}