// Design token bridge (T7.1 / Sous-sprint 7A) — maps a Theme from the backend
// into the runtime CSS custom properties consumed by the Tailwind @theme tokens
// declared in src/index.css. When no theme is provided the CSS defaults apply.
export const BADGE_STYLES = ['torn-paper', 'rounded', 'ribbon']

// Theme colors JSON keys (backend) -> runtime CSS variable names
const COLOR_MAP = {
  bgDark: '--menu-bg-dark',
  bgLight: '--menu-bg-light',
  primary: '--menu-accent',
  secondary: '--menu-accent-2',
  text: '--menu-text',
}

// Backend key -> the Tailwind v4 @theme token names (--color-* / --font-*).
// These are set directly because a var(--menu-*) fence at :root freezes the
// value there; re-exporting the concrete values under the token names keeps
// every override (theme AND per-zone) in effect.
const COLOR_TOKENS = {
  bgDark: '--color-menu-dark',
  bgLight: '--color-menu-light',
  primary: '--color-menu-accent',
  secondary: '--color-menu-accent-2',
  text: '--color-menu-text',
  textMuted: '--color-menu-text-muted',
}

// Theme fonts JSON keys (backend) -> runtime CSS variable names
const FONT_MAP = {
  heading: '--menu-font-heading',
  body: '--menu-font-body',
}

const FONT_TOKENS = {
  heading: '--font-menu-heading',
  body: '--font-menu-body',
}

// Build the CSS custom-property object to apply on the screen root.
export function themeToCssVars(theme) {
  if (!theme) return {}
  const vars = {}
  const colors = theme.colors || {}
  const fonts = theme.fonts || {}
  for (const [key, varName] of Object.entries(COLOR_MAP)) {
    if (colors[key]) vars[varName] = colors[key]
  }
  for (const [key, varName] of Object.entries(COLOR_TOKENS)) {
    if (colors[key]) vars[varName] = colors[key]
  }
  for (const [key, varName] of Object.entries(FONT_MAP)) {
    if (fonts[key]) vars[varName] = fonts[key]
  }
  for (const [key, varName] of Object.entries(FONT_TOKENS)) {
    if (fonts[key]) vars[varName] = fonts[key]
  }
  return vars
}

// Normalize a theme's badgeStyle to one of the supported values.
export function badgeStyleOf(theme) {
  const badgeStyle = theme && theme.badgeStyle
  return BADGE_STYLES.includes(badgeStyle) ? badgeStyle : 'torn-paper'
}

// Currency symbol printed after every price. Comes from the theme so one
// deployment can serve a Geneva client in CHF and another in € — it used to be
// hardcoded to 'CHF' inside PriceBadge, which no caller ever overrode.
export const DEFAULT_CURRENCY = 'CHF'

export function currencyOf(theme) {
  const c = theme?.currency
  return typeof c === 'string' && c.trim() ? c.trim() : DEFAULT_CURRENCY
}
