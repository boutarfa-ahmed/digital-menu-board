// QtyBadge — small circular quantity-multiplier badge (accent bg, white
// number) used in list-row-price-qty rows (Extras/Desserts). Pure CSS, no
// assets. Diameters tuned so 'sm' (~32px) sits flush against PriceBadge sm.
const SIZES = {
  sm: { box: 'h-8 w-8', text: 'text-sm' },
  md: { box: 'h-9 w-9', text: 'text-base' },
  lg: { box: 'h-11 w-11', text: 'text-lg' },
}

/**
 * QtyBadge — circular quantity-multiplier badge ("5X", "1X") for list rows
 * (wings, nuggets, ...). A numeric `qty` renders with an uppercase "X" suffix;
 * a string is rendered verbatim. Text is always white for contrast against the
 * `color` background (assumed dark/saturated).
 * @param {number|string} qty - quantity multiplier, e.g. 5 -> "5X"
 * @param {'sm'|'md'|'lg'} [size=md] - badge diameter
 * @param {string} [color='var(--menu-accent)'] - circle background color
 * @param {string} [className] - extra classes (e.g. positioning)
 */
export default function QtyBadge({ qty, size = 'md', color = 'var(--menu-accent)', className }) {
  const s = SIZES[size] || SIZES.md
  const label = typeof qty === 'number' ? `${qty}X` : qty

  return (
    <span
      aria-label={`Quantité ${label}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold leading-none text-white ${s.box} ${s.text} ${className}`}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  )
}