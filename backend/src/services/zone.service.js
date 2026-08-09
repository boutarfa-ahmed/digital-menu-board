const ZONE_TYPES = ['menu', 'grid', 'list', 'carousel', 'banner', 'hero', 'highlight'];
const CARD_TEMPLATES = ['default', 'compact', 'large', 'minimal', 'media'];
// Zones that need a gridConfig (rows/cols) to place items
const REQUIRES_GRID_CONFIG = ['grid', 'list', 'carousel'];

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
  } else if (b.gridConfig !== undefined) {
    errors.push(...validateGridConfig(b.gridConfig));
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
    items: (zone.items || []).map((zi) => ({
      id: zi.id,
      itemId: zi.itemId,
      row: zi.row,
      col: zi.col,
      index: zi.index,
      order: zi.order,
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
  return {
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
  const zonesInput = Array.isArray(input.zones) ? input.zones : [];

  // Business rules (T6.3): valid zones + no overlaps before touching the DB
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

  return prisma.$transaction(async (tx) => {
    let layout = await tx.screenLayout.findUnique({ where: { screenId } });
    if (!layout) {
      layout = await tx.screenLayout.create({
        data: {
          screenId,
          name: input.name || 'Nouveau layout',
          settings: serializeJson(input.settings, '{}'),
          status: 'draft',
        },
      });
    } else {
      layout = await tx.screenLayout.update({
        where: { id: layout.id },
        data: {
          name: input.name ?? layout.name,
          settings: serializeJson(input.settings, layout.settings),
          status: 'draft', // any edit returns the layout to draft until re-published
        },
      });
    }

    // Delete zones no longer present in the payload
    const existingZones = await tx.zone.findMany({ where: { layoutId: layout.id } });
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
          })),
        });
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
  ZoneValidationError,
  parseJson,
  serializeJson,
  validateZoneFields,
  validateGridConfig,
  zonesOverlap,
  findOverlap,
  parseZone,
  parseZoneLayout,
  zoneDataFromBody,
  replaceLayout,
  setLayoutDraft,
  validatePublishableLayout,
};
