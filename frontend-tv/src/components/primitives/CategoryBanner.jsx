import TornEdge from './TornEdge.jsx'

/**
 * CategoryBanner — reusable category/section heading banner with two variants.
 * Pure presentational: plain props in, JSX out, colors via CSS custom
 * properties. The caller decides placement inside a zone (normal block flow).
 *
 * @param {string} text - banner label
 * @param {'ribbon'|'underline'} [variant=ribbon] - visual style
 * @param {string} [color='var(--menu-accent)'] - ribbon bg / underline+text color
 * @param {'left'|'center'} [align=left] - horizontal alignment
 * @param {string} [className] - extra wrapper classes
 */
export default function CategoryBanner({
  text,
  variant = 'ribbon',
  color = 'var(--menu-accent)',
  align = 'left',
  className,
}) {
  const alignCls = align === 'center' ? 'justify-center' : 'justify-start'

  if (variant === 'underline') {
    return (
      <div className={`flex flex-col ${align === 'center' ? 'w-full items-center' : 'items-start'} ${className}`}>
        <span
          className="font-menu-header uppercase leading-tight tracking-wide"
          style={{ color, fontSize: 20 }}
        >
          {text}
        </span>
        <div className="mt-1 h-0.5" style={{ width: 48, backgroundColor: color }} />
      </div>
    )
  }

  return (
    <div className={`relative flex w-full ${alignCls} ${className}`}>
      <div
        className="font-menu-header px-6 py-2 uppercase tracking-wide text-white"
        style={{
          backgroundColor: color,
          fontSize: 18,
          lineHeight: 1.2,
          clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%)',
        }}
      >
        {text}
      </div>
      <TornEdge
        position="bottom"
        className="pointer-events-none"
      />
    </div>
  )
}