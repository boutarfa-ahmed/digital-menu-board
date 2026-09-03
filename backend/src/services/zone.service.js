const ZONE_TYPES = ['menu', 'grid', 'list', 'carousel', 'banner', 'hero', 'highlight'];
const CARD_TEMPLATES = ['default', 'compact', 'large', 'minimal', 'media', 'icon-label', 'text-only', 'image-title-desc-price', 'custom'];
// T10 — carte "custom" : la disposition de la carte est dessinée dans l'admin
// et stockée en JSON, au lieu d'être codée en dur par template. Un slot = un
// morceau de la carte (photo, nom, description, prix, ...) positionné en % de
// la carte. Voir backgroundStyle.cardLayout (zone) / cardLayouts (par produit).
const CARD_SLOT_TYPES = ['image', 'name', 'desc', 'price', 'qty', 'zoneBadge', 'text', 'shape', 'asset'];
const CARD_ALIGNS = ['left', 'center', 'right'];
const CARD_VALIGNS = ['start', 'center', 'end'];
const CARD_SHAPES = ['rect', 'line'];
const CARD_SLOTS_MAX = 40;
// Zones that need a gridConfig (rows/cols) to place items
const REQUIRES_GRID_CONFIG = ['grid', 'list', 'carousel'];

// Zone badge/label config (T7.3) — plain JSON on the zone, no separate table
const BADGE_STYLES = ['torn-paper', 'ribbon', 'circle-stamp'];
const BADGE_POSITIONS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];

class ZoneValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ZoneValidationError';
  }
}

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

// Settings are merged key-by-key so a partial settings PUT (e.g. only
// background, or only showPrices) preserves the other sub-keys instead of
// wiping them. elements is never stored as null: its "empty" state is [],
// so an explicit null is normalized back to [] before persisting.
function mergeSettings(existing, incoming) {
  const base = parseJson(existing, {});
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    if (base.elements === null) base.elements = [];
    return base;
  }
  const merged = { ...base, ...incoming };
  if (merged.elements === null) merged.elements = [];
  return merged;
}

function validateGridConfig(gridConfig) {
  if (!gridConfig || typeof gridConfig !== 'object' || Array.isArray(gridConfig)) {
    return ['gridConfig must be an object with rows and cols'];
  }
  const { rows, cols } = gridConfig;
  const ok = (n) => Number.isInteger(n) && n >= 1;
  if (!ok(rows) || !ok(cols)) {
    return ['gridConfig.rows and gridConfig.cols must be positive integers'];
  }
  return [];
}

// T7.3: badge is a plain JSON config attached to the zone (text / price / style / position).
function validateBadgeConfig(badgeConfig) {
  if (badgeConfig === null) return [];
  if (!badgeConfig || typeof badgeConfig !== 'object' || Array.isArray(badgeConfig)) {
    return ['badgeConfig must be an object'];
  }
  const errors = [];
  if (badgeConfig.text !== undefined) {
    if (typeof badgeConfig.text !== 'string' || badgeConfig.text.trim().length === 0) {
      errors.push('badgeConfig.text must be a non-empty string');
    }
  }
  if (badgeConfig.price !== undefined) {
    if (typeof badgeConfig.price !== 'number' || !Number.isFinite(badgeConfig.price) || badgeConfig.price < 0) {
      errors.push('badgeConfig.price must be a non-negative number');
    }
  }
  if (badgeConfig.style !== undefined && !BADGE_STYLES.includes(badgeConfig.style)) {
    errors.push(`badgeConfig.style must be one of ${BADGE_STYLES.join(', ')}`);
  }
  if (badgeConfig.position !== undefined && !BADGE_POSITIONS.includes(badgeConfig.position)) {
    errors.push(`badgeConfig.position must be one of ${BADGE_POSITIONS.join(', ')}`);
  }
  if (badgeConfig.tiers !== undefined) {
    if (!Array.isArray(badgeConfig.tiers) || badgeConfig.tiers.length === 0) {
      errors.push('badgeConfig.tiers must be a non-empty array');
    } else {
      badgeConfig.tiers.forEach((tier, i) => {
        if (!tier || typeof tier !== 'object') {
          errors.push(`badgeConfig.tiers[${i}] must be an object`);
          return;
        }
        if (typeof tier.label !== 'string' || tier.label.trim().length === 0) {
          errors.push(`badgeConfig.tiers[${i}].label must be a non-empty string`);
        }
        if (typeof tier.price !== 'number' || !Number.isFinite(tier.price) || tier.price < 0) {
          errors.push(`badgeConfig.tiers[${i}].price must be a non-negative number`);
        }
      });
    }
  }
  if (badgeConfig.text === undefined && badgeConfig.price === undefined && badgeConfig.tiers === undefined) {
    errors.push('badgeConfig needs at least text, price, or tiers');
  }
  return errors;
}

const HEX_OR_CSS_COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)$/;
const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 128;
const BACKGROUND_TYPES = ['image', 'split'];
const BACKGROUND_PATTERNS = ['none', 'torn-paper'];
const BACKGROUND_ANGLE_MAX = 180;
const ELEMENT_TYPES = ['image', 'text', 'logo'];
const ELEMENT_KINDS = ['plain', 'banner', 'hero', 'divider', 'price'];
// The two price-badge designs (frontend-tv/src/theme/designTokens.js). Kept in
// sync by hand — a bad value here would render an undefined style on the TV.
const BADGE_TYPES = ['type1', 'type2'];
const FONT_SIZE_MAX_TEXT = 200;

// T7.6: screen-level background — split (dark/light 50-50, configurable angle)
// or an uploaded image, plus an optional torn-paper pattern overlay.
function validateBackgroundConfig(bg) {
  if (bg === undefined || bg === null) return [];
  if (typeof bg !== 'object' || Array.isArray(bg)) {
    return ['settings.background must be an object'];
  }
  const errors = [];
  if (bg.type !== undefined && !BACKGROUND_TYPES.includes(bg.type)) {
    errors.push(`settings.background.type must be one of ${BACKGROUND_TYPES.join(', ')}`);
  }
  if (bg.type === 'image' && !bg.imageUrl) {
    errors.push('settings.background.imageUrl is required for an image background');
  }
  if (bg.imageUrl !== undefined && (typeof bg.imageUrl !== 'string' || bg.imageUrl.trim() === '')) {
    errors.push('settings.background.imageUrl must be a non-empty string');
  }
  for (const key of ['dark', 'light', 'patternColor']) {
    if (bg[key] !== undefined && !HEX_OR_CSS_COLOR.test(String(bg[key]).trim())) {
      errors.push(`settings.background.${key} must be a valid color`);
    }
  }
  if (bg.angle !== undefined) {
    const n = Number(bg.angle);
    if (!Number.isFinite(n) || n < 0 || n > BACKGROUND_ANGLE_MAX) {
      errors.push(`settings.background.angle must be a number between 0 and ${BACKGROUND_ANGLE_MAX}`);
    }
  }
  if (bg.pattern !== undefined && !BACKGROUND_PATTERNS.includes(bg.pattern)) {
    errors.push(`settings.background.pattern must be one of ${BACKGROUND_PATTERNS.join(', ')}`);
  }
  return errors;
}

// T7.4: zone style overrides — panel bg/text/accent colors + font size.
function validateBackgroundStyle(style) {
  if (style === undefined || style === null) return [];
  if (typeof style !== 'object' || Array.isArray(style)) {
    return ['backgroundStyle must be an object'];
  }
  const errors = [];
  if (style.dark !== undefined && typeof style.dark !== 'boolean') {
    errors.push('backgroundStyle.dark must be a boolean');
  }
  for (const key of ['bg', 'text', 'accent']) {
    if (style[key] !== undefined && !HEX_OR_CSS_COLOR.test(String(style[key]).trim())) {
      errors.push(`backgroundStyle.${key} must be a valid color`);
    }
  }
  // T7.9b — optional per-zone background image (null clears it)
  if (style.bgImage !== undefined && style.bgImage !== null) {
    if (typeof style.bgImage !== 'string' || style.bgImage.trim() === '') {
      errors.push('backgroundStyle.bgImage must be a non-empty string or null');
    }
  }
  if (style.badgeType !== undefined && !BADGE_TYPES.includes(style.badgeType)) {
    errors.push(`backgroundStyle.badgeType must be one of ${BADGE_TYPES.join(', ')}`);
  }
  // T10 — carte "custom" : dessin de la zone + surcharges par produit.
  if (style.cardLayout !== undefined) {
    errors.push(...validateCardLayout(style.cardLayout, 'backgroundStyle.cardLayout'));
  }
  if (style.cardLayouts !== undefined) {
    errors.push(...validateCardLayouts(style.cardLayouts, 'backgroundStyle.cardLayouts'));
  }
  // T9b — "Afficher le prix" par zone. undefined = comportement par defaut du
  // template de carte, true/false = choix explicite de l'admin.
  if (style.showPrice !== undefined && style.showPrice !== null && typeof style.showPrice !== 'boolean') {
    errors.push('backgroundStyle.showPrice must be a boolean');
  }
  if (style.fontSize !== undefined) {
    const n = Number(style.fontSize);
    if (!Number.isFinite(n) || n < FONT_SIZE_MIN || n > FONT_SIZE_MAX) {
      errors.push(`backgroundStyle.fontSize must be a number between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX}px`);
    }
  }
  // T9: sub-zone — the product grid/list container's own box within the zone,
  // as % of the space left under the zone's header. null clears it (fills
  // that whole space, same as a zone that never set this).
  if (style.contentBox !== undefined && style.contentBox !== null) {
    const cb = style.contentBox;
    if (!cb || typeof cb !== 'object' || Array.isArray(cb)) {
      errors.push('backgroundStyle.contentBox must be an object');
    } else {
      for (const key of ['x', 'y']) {
        const n = Number(cb[key]);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          errors.push(`backgroundStyle.contentBox.${key} must be a number between 0 and 100`);
        }
      }
      for (const key of ['w', 'h']) {
        const n = Number(cb[key]);
        if (!Number.isFinite(n) || n <= 0 || n > 100) {
          errors.push(`backgroundStyle.contentBox.${key} must be a number between 0 (exclusive) and 100`);
        }
      }
    }
  }
  return errors;
}

// T10 — disposition d'une carte "custom". refW/refH = taille de référence en px
// (celle de la cellule au moment du dessin) : les tailles de police sont
// exprimées dans ce repère, le rendu TV les remet à l'échelle de la cellule
// réelle. x/y/w/h sont des % de la carte, jamais des px.
function validateCardLayout(layout, path) {
  if (layout === undefined || layout === null) return [];
  if (typeof layout !== 'object' || Array.isArray(layout)) return [`${path} must be an object`];
  const errors = [];
  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
  for (const f of ['refW', 'refH']) {
    if (layout[f] !== undefined && (!isNum(layout[f]) || layout[f] < 20 || layout[f] > 4000)) {
      errors.push(`${path}.${f} must be a number between 20 and 4000`);
    }
  }
  // clip : rogner ce qui dépasse du cadre de la carte (overflow hidden).
  if (layout.clip !== undefined && typeof layout.clip !== 'boolean') {
    errors.push(`${path}.clip must be a boolean`);
  }
  if (!Array.isArray(layout.slots)) {
    errors.push(`${path}.slots must be an array`);
    return errors;
  }
  if (layout.slots.length > CARD_SLOTS_MAX) {
    errors.push(`${path}.slots is limited to ${CARD_SLOTS_MAX} entries`);
  }
  const seenIds = new Set();
  layout.slots.forEach((slot, i) => {
    const p = `${path}.slots[${i}]`;
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
      errors.push(`${p} must be an object`);
      return;
    }
    if (typeof slot.id !== 'string' || slot.id.trim() === '') {
      errors.push(`${p}.id must be a non-empty string`);
    } else if (seenIds.has(slot.id)) {
      errors.push(`${path}.slots contains duplicate id "${slot.id}"`);
    } else {
      seenIds.add(slot.id);
    }
    if (!CARD_SLOT_TYPES.includes(slot.type)) {
      errors.push(`${p}.type must be one of ${CARD_SLOT_TYPES.join(', ')}`);
    }
    for (const f of ['x', 'y']) {
      if (!isNum(slot[f]) || slot[f] < -50 || slot[f] > 150) {
        errors.push(`${p}.${f} must be a number between -50 and 150`);
      }
    }
    for (const f of ['w', 'h']) {
      if (!isNum(slot[f]) || slot[f] < 1 || slot[f] > 200) {
        errors.push(`${p}.${f} must be a number between 1 and 200`);
      }
    }
    if (slot.fontSize !== undefined && (!isNum(slot.fontSize) || slot.fontSize < 4 || slot.fontSize > FONT_SIZE_MAX_TEXT)) {
      errors.push(`${p}.fontSize must be a number between 4 and ${FONT_SIZE_MAX_TEXT}`);
    }
    if (slot.rotation !== undefined && (!isNum(slot.rotation) || slot.rotation < -180 || slot.rotation > 180)) {
      errors.push(`${p}.rotation must be a number between -180 and 180`);
    }
    if (slot.zIndex !== undefined && !Number.isInteger(slot.zIndex)) {
      errors.push(`${p}.zIndex must be an integer`);
    }
    if (slot.opacity !== undefined && (!isNum(slot.opacity) || slot.opacity < 0 || slot.opacity > 1)) {
      errors.push(`${p}.opacity must be a number between 0 and 1`);
    }
    for (const f of ['color', 'bg']) {
      if (slot[f] !== undefined && slot[f] !== null && !HEX_OR_CSS_COLOR.test(String(slot[f]).trim())) {
        errors.push(`${p}.${f} must be a valid color`);
      }
    }
    if (slot.align !== undefined && !CARD_ALIGNS.includes(slot.align)) {
      errors.push(`${p}.align must be one of ${CARD_ALIGNS.join(', ')}`);
    }
    if (slot.valign !== undefined && !CARD_VALIGNS.includes(slot.valign)) {
      errors.push(`${p}.valign must be one of ${CARD_VALIGNS.join(', ')}`);
    }
    for (const f of ['uppercase', 'bold', 'italic', 'visible']) {
      if (slot[f] !== undefined && typeof slot[f] !== 'boolean') {
        errors.push(`${p}.${f} must be a boolean`);
      }
    }
    if (slot.fontFamily !== undefined && slot.fontFamily !== null && typeof slot.fontFamily !== 'string') {
      errors.push(`${p}.fontFamily must be a string`);
    }
    if (slot.badgeType !== undefined && !BADGE_TYPES.includes(slot.badgeType)) {
      errors.push(`${p}.badgeType must be one of ${BADGE_TYPES.join(', ')}`);
    }
    if (slot.type === 'text' && (typeof slot.text !== 'string' || slot.text.trim() === '')) {
      errors.push(`${p}.text is required for a "text" slot`);
    } else if (slot.text !== undefined && typeof slot.text !== 'string') {
      // Le badge de la zone porte désormais son propre libellé sur la carte.
      errors.push(`${p}.text must be a string`);
    }
    // Image libre (upload ou bibliothèque). imageUrl reste facultative : un
    // emplacement posé avant d'avoir choisi l'image doit pouvoir être
    // enregistré, il ne rend simplement rien.
    if (slot.imageUrl !== undefined && slot.imageUrl !== null) {
      if (typeof slot.imageUrl !== 'string' || slot.imageUrl.trim() === '') {
        errors.push(`${p}.imageUrl must be a non-empty string or null`);
      } else if (slot.imageUrl.length > 2048) {
        errors.push(`${p}.imageUrl is too long`);
      }
    }
    if (slot.type === 'shape' && slot.shape !== undefined && !CARD_SHAPES.includes(slot.shape)) {
      errors.push(`${p}.shape must be one of ${CARD_SHAPES.join(', ')}`);
    }
    if (slot.radius !== undefined && (!isNum(slot.radius) || slot.radius < 0 || slot.radius > 100)) {
      errors.push(`${p}.radius must be a number between 0 and 100`);
    }
    if (slot.fit !== undefined && !['contain', 'cover'].includes(slot.fit)) {
      errors.push(`${p}.fit must be "contain" or "cover"`);
    }
  });
  return errors;
}

// Cartes personnalisées par produit : { [itemId]: cardLayout }. Une valeur
// null retire la personnalisation du produit et le fait revenir au dessin de
// la zone.
function validateCardLayouts(map, path) {
  if (map === undefined || map === null) return [];
  if (typeof map !== 'object' || Array.isArray(map)) return [`${path} must be an object`];
  const errors = [];
  const keys = Object.keys(map);
  if (keys.length > 200) errors.push(`${path} is limited to 200 entries`);
  for (const key of keys) {
    if (!/^\d+$/.test(key)) {
      errors.push(`${path} keys must be numeric item ids`);
      continue;
    }
    errors.push(...validateCardLayout(map[key], `${path}.${key}`));
  }
  return errors;
}

// Free-floating decorative layer on top of zones. Elements live inside
// layout.settings.elements (additive JSON on the existing settings column,
// no extra model). Percentage-based positioning, not grid-locked.
function validateElementsConfig(elements) {
  if (elements === undefined || elements === null) return [];
  if (!Array.isArray(elements)) return ['settings.elements must be an array'];
  const errors = [];
  const seenIds = new Set();
  const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);
  elements.forEach((el, i) => {
    const p = `settings.elements[${i}]`;
    if (!el || typeof el !== 'object' || Array.isArray(el)) {
      errors.push(`${p} must be an object`);
      return;
    }
    if (typeof el.id !== 'string' || el.id.trim() === '') {
      errors.push(`${p}.id must be a non-empty string`);
    } else if (seenIds.has(el.id)) {
      errors.push(`settings.elements contains duplicate id "${el.id}"`);
    } else {
      seenIds.add(el.id);
    }
    if (el.type === undefined) {
      errors.push(`${p}.type is required and must be one of ${ELEMENT_TYPES.join(', ')}`);
    } else if (!ELEMENT_TYPES.includes(el.type)) {
      errors.push(`${p}.type must be one of ${ELEMENT_TYPES.join(', ')}`);
    }
    for (const f of ['x', 'y']) {
      if (!isFiniteNum(el[f]) || el[f] < 0 || el[f] > 100) {
        errors.push(`${p}.${f} must be a number between 0 and 100`);
      }
    }
    for (const f of ['w', 'h']) {
      if (!isFiniteNum(el[f]) || el[f] < 0.5 || el[f] > 100) {
        errors.push(`${p}.${f} must be a number between 0.5 and 100`);
      }
    }
    if (el.rotation !== undefined && (!isFiniteNum(el.rotation) || el.rotation < -180 || el.rotation > 180)) {
      errors.push(`${p}.rotation must be a number between -180 and 180`);
    }
    if (el.zIndex !== undefined && !Number.isInteger(el.zIndex)) {
      errors.push(`${p}.zIndex must be an integer`);
    }
    if ((el.type === 'image' || el.type === 'logo') && (typeof el.imageUrl !== 'string' || el.imageUrl.trim() === '')) {
      errors.push(`${p}.imageUrl is required for type "${el.type}"`);
    }
    if (el.type === 'text' && el.kind !== 'price' && (typeof el.text !== 'string' || el.text.trim() === '')) {
      errors.push(`${p}.text is required for type "text"`);
    }
    if (el.kind !== undefined && !ELEMENT_KINDS.includes(el.kind)) {
      errors.push(`${p}.kind must be one of ${ELEMENT_KINDS.join(', ')}`);
    }
    if (el.dark !== undefined && typeof el.dark !== 'boolean') {
      errors.push(`${p}.dark must be a boolean`);
    }
    if (el.badgeType !== undefined && !BADGE_TYPES.includes(el.badgeType)) {
      errors.push(`${p}.badgeType must be one of ${BADGE_TYPES.join(', ')}`);
    }
    if (el.accent !== undefined && !HEX_OR_CSS_COLOR.test(String(el.accent).trim())) {
      errors.push(`${p}.accent must be a valid color`);
    }
    if (el.kind === 'price') {
      if (!isFiniteNum(el.price) || el.price < 0) {
        errors.push(`${p}.price must be a non-negative number when kind is "price"`);
      }
    } else if (el.price !== undefined && (!isFiniteNum(el.price) || el.price < 0)) {
      errors.push(`${p}.price must be a non-negative number`);
    }
    if (el.fontSize !== undefined && (!isFiniteNum(el.fontSize) || el.fontSize < FONT_SIZE_MIN || el.fontSize > FONT_SIZE_MAX_TEXT)) {
      errors.push(`${p}.fontSize must be a number between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX_TEXT}`);
    }
    if (el.color !== undefined && !HEX_OR_CSS_COLOR.test(String(el.color).trim())) {
      errors.push(`${p}.color must be a valid color`);
    }
  });
  return errors;
}

function validateZoneFields(body) {
  const errors = [];
  const b = body || {};
  if (b.zoneType !== undefined && !ZONE_TYPES.includes(b.zoneType)) {
    errors.push(`zoneType must be one of ${ZONE_TYPES.join(', ')}`);
  }
  if (b.cardTemplate !== undefined && !CARD_TEMPLATES.includes(b.cardTemplate)) {
    errors.push(`cardTemplate must be one of ${CARD_TEMPLATES.join(', ')}`);
  }
  for (const f of ['x', 'y', 'w', 'h', 'order']) {
    if (b[f] !== undefined && (typeof b[f] !== 'number' || !Number.isFinite(b[f]))) {
      errors.push(`${f} must be a number`);
    }
  }
  for (const f of ['w', 'h']) {
    if (b[f] !== undefined && Number.isFinite(b[f]) && b[f] < 1) {
      errors.push(`${f} must be >= 1`);
    }
  }
  const type = b.zoneType;
  if (type && REQUIRES_GRID_CONFIG.includes(type)) {
    if (b.gridConfig === undefined) {
      errors.push(`zoneType "${type}" requires a gridConfig (rows, cols)`);
    } else {
      errors.push(...validateGridConfig(b.gridConfig));
    }
  } else if (b.gridConfig !== undefined && b.gridConfig !== null && Object.keys(b.gridConfig).length > 0) {
    // Non-grid zone types (hero, banner, ...) round-trip gridConfig as {} from GET
    // (see parseJson fallback below); treat that as "not provided" rather than invalid.
    errors.push(...validateGridConfig(b.gridConfig));
  }
  if (b.badgeConfig !== undefined) {
    errors.push(...validateBadgeConfig(b.badgeConfig));
  }
  if (b.backgroundStyle !== undefined) {
    errors.push(...validateBackgroundStyle(b.backgroundStyle));
  }
  return errors;
}

// Two axis-aligned rectangles overlap only if they intersect on both axes.
// Touching edges (a.x + a.w === b.x) is allowed.
function zonesOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function findOverlap(zones) {
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (zonesOverlap(zones[i], zones[j])) return [zones[i], zones[j]];
    }
  }
  return null;
}

function zoneLabel(z) {
  return z.name ? `"${z.name}"` : `#${z.id ?? 'new'}`;
}

// Normalize a stored zone (JSON string fields -> objects) for API output
function parseZone(zone) {
  if (!zone) return null;
  return {
    ...zone,
    gridConfig: parseJson(zone.gridConfig, {}),
    backgroundStyle: parseJson(zone.backgroundStyle, null),
    badgeConfig: parseJson(zone.badgeConfig, null),
    items: (zone.items || []).map((zi) => ({
      id: zi.id,
      itemId: zi.itemId,
      row: zi.row,
      col: zi.col,
      index: zi.index,
      order: zi.order,
      qty: zi.qty,
      item: zi.item,
    })),
  };
}

function parseZoneLayout(layout) {
  if (!layout) return null;
  return {
    ...layout,
    settings: parseJson(layout.settings, {}),
    zones: (layout.zones || []).map(parseZone),
  };
}

function zoneDataFromBody(b) {
  const data = {
    name: b.name ?? null,
    zoneType: b.zoneType || 'menu',
    gridConfig: serializeJson(b.gridConfig, '{}'),
    cardTemplate: b.cardTemplate || 'default',
    backgroundStyle: serializeJson(b.backgroundStyle, null),
    x: b.x ?? 0,
    y: b.y ?? 0,
    w: b.w ?? 1,
    h: b.h ?? 1,
    order: b.order ?? 0,
  };
  // Only carry badgeConfig when provided so partial edits don't wipe it
  if (b.badgeConfig !== undefined) {
    data.badgeConfig = serializeJson(b.badgeConfig, null);
  }
  return data;
}

const zoneInclude = {
  zones: {
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    include: {
      items: {
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        include: { item: true },
      },
    },
  },
};

// Bulk-replace a screen's zone layout in a single transaction.
// zones: array of { id?, name?, zoneType?, gridConfig?, cardTemplate?, backgroundStyle?, x?, y?, w?, h?, order?, items?: [{itemId,row?,col?,index?,order?}] }
async function replaceLayout(prisma, screenId, input) {
  const hasZones = Array.isArray(input.zones);
  const zonesInput = hasZones ? input.zones : [];

  // Business rules (T6.3): valid zones + no overlaps before touching the DB
  if (hasZones) {
    for (const z of zonesInput) {
      const errors = validateZoneFields(z);
      if (errors.length > 0) {
        throw new ZoneValidationError(`Zone ${zoneLabel(z)}: ${errors.join('; ')}`);
      }
    }
    const overlap = findOverlap(zonesInput);
    if (overlap) {
      const [a, b] = overlap;
      throw new ZoneValidationError(`Zones ${zoneLabel(a)} and ${zoneLabel(b)} overlap`);
    }
  }

  // T7.6: validate the screen-level background config before touching the DB
  const bgErrors = validateBackgroundConfig(input.settings?.background);
  if (bgErrors.length > 0) {
    throw new ZoneValidationError(bgErrors.join('; '));
  }

  // Free-floating decorative elements layer (additive JSON in settings)
  const elErrors = validateElementsConfig(input.settings?.elements);
  if (elErrors.length > 0) {
    throw new ZoneValidationError(elErrors.join('; '));
  }

  // Optional theme binding (T7.1): validate before touching the DB
  let themeIdValue;
  if (input.themeId !== undefined) {
    if (input.themeId === null) {
      themeIdValue = null;
    } else {
      const parsed = parseInt(input.themeId, 10);
      if (!Number.isInteger(parsed)) {
        throw new ZoneValidationError('themeId must be an integer');
      }
      const theme = await prisma.theme.findUnique({ where: { id: parsed } });
      if (!theme) throw new ZoneValidationError(`Theme #${parsed} not found`);
      themeIdValue = parsed;
    }
  }

  return prisma.$transaction(async (tx) => {
    let layout = await tx.screenLayout.findUnique({ where: { screenId } });
    const mergedSettings = mergeSettings(layout ? layout.settings : undefined, input.settings);
    if (!layout) {
      layout = await tx.screenLayout.create({
        data: {
          screenId,
          name: input.name || 'Nouveau layout',
          settings: serializeJson(mergedSettings, '{}'),
          status: 'draft',
          ...(themeIdValue !== undefined ? { themeId: themeIdValue } : {}),
        },
      });
    } else {
      layout = await tx.screenLayout.update({
        where: { id: layout.id },
        data: {
          name: input.name ?? layout.name,
          settings: serializeJson(mergedSettings, '{}'),
          status: 'draft', // any edit returns the layout to draft until re-published
          ...(themeIdValue !== undefined ? { themeId: themeIdValue } : {}),
        },
      });
    }

    // Zone management only when the payload carries a zones array (settings-only
    // updates keep existing zones untouched)
    if (hasZones) {
      const existingZones = await tx.zone.findMany({ where: { layoutId: layout.id } });

      // A zone id in the payload has to be one of *this* layout's zones.
      // tx.zone.update() below matches on id alone, so a stray id (a stale
      // builder tab, a copy-pasted payload) would silently overwrite a zone
      // belonging to another screen's layout — and the wrong TV would change.
      const existingIds = new Set(existingZones.map((z) => z.id));
      for (const z of zonesInput) {
        if (z.id != null && !existingIds.has(parseInt(z.id, 10))) {
          throw new ZoneValidationError(`Zone ${zoneLabel(z)} does not belong to this layout`);
        }
      }

      const keepIds = zonesInput.filter((z) => z.id).map((z) => parseInt(z.id, 10));
      for (const z of existingZones) {
        if (!keepIds.includes(z.id)) {
          await tx.zone.delete({ where: { id: z.id } });
        }
      }

      for (const zi of zonesInput) {
        const data = zoneDataFromBody(zi);
        let zone;
        if (zi.id) {
          zone = await tx.zone.update({ where: { id: parseInt(zi.id, 10) }, data });
        } else {
          zone = await tx.zone.create({ data: { layoutId: layout.id, ...data } });
        }

        // Replace this zone's items (single-write bulk)
        await tx.zoneItem.deleteMany({ where: { zoneId: zone.id } });
        const items = Array.isArray(zi.items) ? zi.items : [];
        if (items.length > 0) {
          await tx.zoneItem.createMany({
            data: items.map((it, i) => ({
              zoneId: zone.id,
              itemId: parseInt(it.itemId, 10),
              row: it.row ?? null,
              col: it.col ?? null,
              index: it.index ?? i,
              order: it.order ?? i,
              qty: it.qty !== undefined ? Number(it.qty) || null : null,
            })),
          });
        }
      }
    }

    return tx.screenLayout.findUnique({
      where: { id: layout.id },
      include: zoneInclude,
    });
  });
}

// Zones that must show at least one product before the layout can go live
const CONTENT_ZONE_TYPES = ['menu', 'grid', 'list', 'carousel'];

function validatePublishableLayout(layout) {
  const errors = [];
  if (!layout) return ['Layout introuvable'];
  const zones = layout.zones || [];
  if (zones.length === 0) {
    errors.push('Ajoutez au moins une zone avant de publier.');
    return errors;
  }
  for (const zone of zones) {
    const label = zone.name ? `« ${zone.name} »` : `#${zone.id}`;
    const items = zone.items || [];
    const gc = parseJson(zone.gridConfig, null);

    if (CONTENT_ZONE_TYPES.includes(zone.zoneType) && items.length === 0) {
      errors.push(`La zone ${label} est vide : ajoutez au moins un produit.`);
    }

    if (REQUIRES_GRID_CONFIG.includes(zone.zoneType)) {
      const rowsOk = gc && Number.isInteger(gc.rows) && gc.rows >= 1;
      const colsOk = gc && Number.isInteger(gc.cols) && gc.cols >= 1;
      if (!rowsOk || !colsOk) {
        errors.push(`La zone ${label} a une grille incohérente (lignes/colonnes invalides).`);
        continue;
      }
      const capacity = gc.rows * gc.cols;
      if (zone.zoneType === 'grid') {
        const seen = new Set();
        for (const it of items) {
          const r = it.row;
          const c = it.col;
          if (typeof r !== 'number' || typeof c !== 'number' || r < 0 || r >= gc.rows || c < 0 || c >= gc.cols) {
            errors.push(`La zone ${label} contient un produit hors grille (position ${r},${c} pour ${gc.rows}×${gc.cols}).`);
          } else {
            const key = `${r}:${c}`;
            if (seen.has(key)) {
              errors.push(`La zone ${label} place deux produits sur la même cellule (${r},${c}).`);
            }
            seen.add(key);
          }
        }
      }
      if (items.length > capacity) {
        errors.push(`La zone ${label} dépasse sa capacité (${items.length} produits pour ${gc.rows}×${gc.cols}).`);
      }
    }
  }
  return errors;
}

// Any zone-level mutation returns the parent layout to draft (live TV keeps last published)
async function setLayoutDraft(prisma, layoutId) {
  return prisma.screenLayout.update({
    where: { id: layoutId },
    data: { status: 'draft' },
  });
}

module.exports = {
  ZONE_TYPES,
  CARD_TEMPLATES,
  REQUIRES_GRID_CONFIG,
  BADGE_STYLES,
  BADGE_POSITIONS,
  ZoneValidationError,
  parseJson,
  serializeJson,
  validateZoneFields,
  validateGridConfig,
  validateBadgeConfig,
  validateBackgroundStyle,
  validateCardLayout,
  validateCardLayouts,
  CARD_SLOT_TYPES,
  validateBackgroundConfig,
  validateElementsConfig,
  zonesOverlap,
  findOverlap,
  parseZone,
  parseZoneLayout,
  zoneDataFromBody,
  replaceLayout,
  setLayoutDraft,
  validatePublishableLayout,
};
