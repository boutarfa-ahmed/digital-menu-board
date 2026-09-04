// Le vocabulaire (types de zone, gabarits de carte, types de slot...), les
// limites et toute la validation vivent dans le schéma partagé : le même
// fichier que les deux frontends utilisent, pour qu'une règle ne puisse pas
// exister ici et pas là-bas.
//
// Original : shared/menu-schema.js — regénérer : `npm run sync:schema`.
// Ne jamais éditer src/shared/menuSchema.js à la main (fichier généré).
const {
  ZONE_TYPES,
  CARD_TEMPLATES,
  CARD_SLOT_TYPES,
  REQUIRES_GRID_CONFIG,
  CONTENT_ZONE_TYPES,
  BADGE_STYLES,
  BADGE_POSITIONS,
  validateGridConfig,
  validateBadgeConfig,
  validateBackgroundConfig,
  validateBackgroundStyle,
  validateCardLayout,
  validateCardLayouts,
  validateElementsConfig,
  validateZoneFields,
} = require('../shared/menuSchema');

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
