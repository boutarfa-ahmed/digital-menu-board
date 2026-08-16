const BADGE_STYLES = ['torn-paper', 'rounded', 'ribbon'];

// Fallback design tokens (T7.1) — used when the database has no theme yet.
// Mirrors the Galaxy Food design system (AGENTS.md): noir/blanc split, orange/vert accents.
const DEFAULT_THEME = {
  id: null,
  name: 'Défaut Galaxy Food',
  isDefault: true,
  colors: {
    primary: '#FF5A1F', // orange-red — titles / CTA
    secondary: '#E8232A', // deep red — alt highlight
    bgDark: '#0D0D0D', // charcoal black — textured bg
    bgLight: '#F5F3EF', // off-white — paper panel bg
    accent: '#4CAF50', // green — secondary accent
    text: '#1A1A1A', // body text on light panels
  },
  fonts: {
    heading: "'Anton', 'Bebas Neue', sans-serif",
    body: "'Inter', 'Poppins', sans-serif",
  },
  badgeStyle: 'torn-paper',
};

function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

// Normalize a stored theme (JSON string fields -> objects) for API output
function parseTheme(theme) {
  if (!theme) return null;
  return {
    ...theme,
    colors: parseJson(theme.colors, {}),
    fonts: parseJson(theme.fonts, {}),
  };
}

const HEX_OR_CSS_COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)$/;

function validateThemeInput(body) {
  const errors = [];
  const b = body || {};
  if (b.name !== undefined && (typeof b.name !== 'string' || b.name.trim().length === 0)) {
    errors.push('name must be a non-empty string');
  }
  if (b.colors !== undefined) {
    if (typeof b.colors !== 'object' || Array.isArray(b.colors)) {
      errors.push('colors must be an object');
    } else {
      for (const [key, value] of Object.entries(b.colors)) {
        if (typeof value !== 'string' || !HEX_OR_CSS_COLOR.test(value.trim())) {
          errors.push(`colors.${key} must be a valid color`);
        }
      }
    }
  }
  if (b.fonts !== undefined) {
    if (typeof b.fonts !== 'object' || Array.isArray(b.fonts)) {
      errors.push('fonts must be an object');
    } else {
      for (const [key, value] of Object.entries(b.fonts)) {
        if (typeof value !== 'string' || value.trim().length === 0) {
          errors.push(`fonts.${key} must be a non-empty string`);
        }
      }
    }
  }
  if (b.badgeStyle !== undefined && !BADGE_STYLES.includes(b.badgeStyle)) {
    errors.push(`badgeStyle must be one of ${BADGE_STYLES.join(', ')}`);
  }
  if (b.isDefault !== undefined && typeof b.isDefault !== 'boolean') {
    errors.push('isDefault must be a boolean');
  }
  return errors;
}

function themeDataFromBody(body) {
  const b = body || {};
  const data = {};
  if (b.name !== undefined) data.name = b.name.trim();
  if (b.isDefault !== undefined) data.isDefault = b.isDefault;
  if (b.colors !== undefined) data.colors = serializeJson(b.colors, '{}');
  if (b.fonts !== undefined) data.fonts = serializeJson(b.fonts, '{}');
  if (b.badgeStyle !== undefined) data.badgeStyle = b.badgeStyle;
  return data;
}

// Default theme for layouts without a themeId: the flagged default, else the first theme.
async function getDefaultTheme(prisma) {
  const flagged = await prisma.theme.findFirst({ where: { isDefault: true }, orderBy: { id: 'asc' } });
  if (flagged) return flagged;
  return prisma.theme.findFirst({ orderBy: { id: 'asc' } });
}

// True when a theme with this id exists in the database.
async function themeExists(prisma, themeId) {
  const id = parseInt(themeId, 10);
  if (!Number.isInteger(id)) return false;
  return Boolean(await prisma.theme.findUnique({ where: { id } }));
}

// Resolve the theme a layout should render with (layout.themeId ?? default theme).
async function resolveLayoutTheme(prisma, layout) {
  if (layout && layout.themeId) {
    const theme = await prisma.theme.findUnique({ where: { id: layout.themeId } });
    if (theme) return parseTheme(theme);
  }
  const fallback = await getDefaultTheme(prisma);
  return fallback ? parseTheme(fallback) : { ...DEFAULT_THEME };
}

module.exports = {
  BADGE_STYLES,
  DEFAULT_THEME,
  parseJson,
  serializeJson,
  parseTheme,
  validateThemeInput,
  themeDataFromBody,
  getDefaultTheme,
  resolveLayoutTheme,
  themeExists,
};
