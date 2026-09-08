const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const {
  serializeJson,
  validateZoneFields,
  zonesOverlap,
  parseZone,
  zoneDataFromBody,
  setLayoutDraft,
  freeBoxData,
  validateZoneItems,
} = require('../services/zone.service');
const { broadcast } = require('../services/broadcast');

async function screenIdOfZone(zoneId) {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId }, select: { layoutId: true } });
  if (!zone) return null;
  const layout = await prisma.screenLayout.findUnique({ where: { id: zone.layoutId }, select: { screenId: true } });
  return layout ? layout.screenId : null;
}

async function screenIdOfLayout(layoutId) {
  const layout = await prisma.screenLayout.findUnique({ where: { id: layoutId }, select: { screenId: true } });
  return layout ? layout.screenId : null;
}

function emitLayoutUpdated(screenId) {
  if (screenId != null) {
    broadcast({ type: 'layout:updated', screenId, timestamp: Date.now() });
  }
}

// POST /api/layouts/:id/zones — add a zone to a layout
router.post('/layouts/:id/zones', auth, requireRole('admin'), async (req, res, next) => {
  const layoutId = parseInt(req.params.id, 10);
  const errors = validateZoneFields(req.body);
  if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });

  const b = req.body || {};
  const x = b.x ?? 0;
  const y = b.y ?? 0;
  const w = b.w ?? 1;
  const h = b.h ?? 1;

  try {
    const layout = await prisma.screenLayout.findUnique({ where: { id: layoutId } });
    if (!layout) return res.status(404).json({ error: 'Layout not found' });

    const existing = await prisma.zone.findMany({ where: { layoutId }, select: { id: true, name: true, x: true, y: true, w: true, h: true } });
    const clash = existing.find((z) => zonesOverlap({ x, y, w, h }, z));
    if (clash) {
      return res.status(400).json({
        error: `Zone overlaps with existing zone ${clash.name ? `"${clash.name}"` : `#${clash.id}`}`,
      });
    }

    const zone = await prisma.zone.create({
      data: { layoutId, ...zoneDataFromBody(req.body) },
    });
    await setLayoutDraft(prisma, layoutId);
    emitLayoutUpdated(await screenIdOfLayout(layoutId));
    res.status(201).json(parseZone(zone));
  } catch (err) {
    next(err);
  }
});

// PUT /api/zones/:id — update zone config (gridConfig, cardTemplate, position, ...)
router.put('/zones/:id', auth, requireRole('admin'), async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const errors = validateZoneFields(req.body);
  if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });

  const b = req.body || {};
  const data = {};
  for (const f of ['name', 'zoneType', 'cardTemplate', 'layoutMode', 'x', 'y', 'w', 'h', 'order']) {
    if (b[f] !== undefined) data[f] = b[f];
  }
  if (b.gridConfig !== undefined) data.gridConfig = serializeJson(b.gridConfig, '{}');
  if (b.backgroundStyle !== undefined) data.backgroundStyle = serializeJson(b.backgroundStyle, null);
  if (b.badgeConfig !== undefined) data.badgeConfig = serializeJson(b.badgeConfig, null);

  try {
    const zone = await prisma.zone.findUnique({ where: { id } });
    if (!zone) return res.status(404).json({ error: 'Zone not found' });


    const x = b.x ?? zone.x;
    const y = b.y ?? zone.y;
    const w = b.w ?? zone.w;
    const h = b.h ?? zone.h;
    const siblings = await prisma.zone.findMany({
      where: { layoutId: zone.layoutId, id: { not: id } },
      select: { id: true, name: true, x: true, y: true, w: true, h: true },
    });
    const clash = siblings.find((z) => zonesOverlap({ x, y, w, h }, z));
    if (clash) {
      return res.status(400).json({
        error: `Zone overlaps with existing zone ${clash.name ? `"${clash.name}"` : `#${clash.id}`}`,
      });
    }

    const updated = await prisma.zone.update({ where: { id }, data });
    await setLayoutDraft(prisma, zone.layoutId);
    emitLayoutUpdated(await screenIdOfLayout(zone.layoutId));
    res.json(parseZone(updated));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Zone not found' });
    next(err);
  }
});

// DELETE /api/zones/:id
router.delete('/zones/:id', auth, requireRole('admin'), async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  try {
    const zone = await prisma.zone.findUnique({ where: { id } });
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    await prisma.zone.delete({ where: { id } });
    await setLayoutDraft(prisma, zone.layoutId);
    emitLayoutUpdated(await screenIdOfLayout(zone.layoutId));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// PUT /api/zones/:id/items — bulk assign/reorder ZoneItems in a zone
// body: { items: [{ itemId, row?, col?, index?, order?, x?, y?, w?, h? }, ...] }
// x/y/w/h = the product's own box in a free-placement zone (percentages of the
// zone); ignored while the zone stays in "auto".
router.put('/zones/:id/items', auth, requireRole('admin'), async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const items = req.body?.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
  for (const it of items) {
    if (!it || (typeof it.itemId !== 'number' && typeof it.itemId !== 'string') || !parseInt(it.itemId, 10)) {
      return res.status(400).json({ error: 'Each item needs a valid itemId' });
    }
  }

  try {
    const zone = await prisma.zone.findUnique({ where: { id } });
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    const boxErrors = validateZoneItems(items, zone.layoutMode);
    if (boxErrors.length > 0) return res.status(400).json({ error: boxErrors.join('; ') });

    const ops = [prisma.zoneItem.deleteMany({ where: { zoneId: id } })];
    if (items.length > 0) {
      ops.push(
        prisma.zoneItem.createMany({
          data: items.map((it, i) => ({
            zoneId: id,
            itemId: parseInt(it.itemId, 10),
            row: it.row ?? null,
            col: it.col ?? null,
            index: it.index ?? i,
            order: it.order ?? i,
            qty: it.qty !== undefined ? Number(it.qty) || null : null,
            ...freeBoxData(it),
          })),
        })
      );
    }
    await prisma.$transaction(ops);
    await setLayoutDraft(prisma, zone.layoutId);
    emitLayoutUpdated(await screenIdOfLayout(zone.layoutId));

    const updated = await prisma.zone.findUnique({
      where: { id },
      include: { items: { include: { item: true } } },
    });
    res.json(parseZone(updated));
  } catch (err) {
    if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid itemId' });
    if (err.code === 'P2002') return res.status(400).json({ error: 'Duplicate item in zone' });
    next(err);
  }
});

module.exports = router;
