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

// Theme fonts JSON keys (backend) -> runtime CSS variable names
const FONT_MAP = {
  heading: '--menu-font-heading',
  body: '--menu-font-body',
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
  for (const [key, varName] of Object.entries(FONT_MAP)) {
    if (fonts[key]) vars[varName] = fonts[key]
  }
  return vars
}

// Normalize a theme's badgeStyle to one of the supported values.
export function badgeStyleOf(theme) {
  const badgeStyle = theme && theme.badgeStyle
  return BADGE_STYLES.includes(badgeStyle) ? badgeStyle : 'torn-paper'
}
