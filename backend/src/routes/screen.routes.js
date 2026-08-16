const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const {
  TEMPLATES_INFO,
  defaultLayout,
  normalizeLayout,
  validateLayout,
} = require('../services/layout.service');
const {
  parseZoneLayout,
  replaceLayout,
  validatePublishableLayout,
  validateBackgroundConfig,
} = require('../services/zone.service');
const { resolveLayoutTheme, themeExists } = require('../services/theme.service');
const { broadcast } = require('../services/broadcast');

const ONLINE_THRESHOLD_MS = 60 * 1000; // considered online if pinged within 60s

function parseLayout(screen) {
  return { ...screen, layout: normalizeLayout(screen.layout) };
}

function withStatus(screen) {
  const online = Date.now() - new Date(screen.lastPing).getTime() <= ONLINE_THRESHOLD_MS;
  return { ...screen, online, status: online ? 'online' : 'offline' };
}

// GET /api/screens
router.get('/', async (req, res) => {
  try {
    const screens = await prisma.screen.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { categories: true, items: true } },
      },
    });
    res.json(screens.map((s) => withStatus(parseLayout(s))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/screens/templates  (available templates for the layout builder)
router.get('/templates', async (req, res) => {
  res.json(TEMPLATES_INFO);
});

// GET /api/screens/:id
router.get('/:id', async (req, res) => {
  try {
    const screen = await prisma.screen.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { categories: true, items: true },
    });
    if (!screen) return res.status(404).json({ error: 'Screen not found' });
    res.json(withStatus(parseLayout(screen)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/screens (protected, admin)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { name, location, layout } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const screen = await prisma.screen.create({
      data: {
        name: name.trim(),
        location: location || null,
        layout: layout ? JSON.stringify(normalizeLayout(layout)) : JSON.stringify(defaultLayout('grid_2x2')),
      },
    });
    res.status(201).json(withStatus(parseLayout(screen)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/screens/:id (protected, admin)
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { name, location, layout, status } = req.body;
  const id = parseInt(req.params.id);

  try {
    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name must be a non-empty string' });
      }
      data.name = name.trim();
    }
    if (location !== undefined) data.location = location;
    if (layout !== undefined) data.layout = JSON.stringify(normalizeLayout(layout));
    if (status !== undefined) data.status = status;

    const screen = await prisma.screen.update({
      where: { id },
      data,
    });
    res.json(withStatus(parseLayout(screen)));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Screen not found' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/screens/:id/layout — zone-based layout (nested zones + items)
router.get('/:id/layout', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const layout = await prisma.screenLayout.findUnique({
      where: { screenId: id },
      include: {
        zones: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          include: {
            items: {
              orderBy: [{ order: 'asc' }, { id: 'asc' }],
              include: { item: true },
            },
          },
        },
      },
    });
    if (!layout) return res.status(404).json({ error: 'No layout found for this screen' });
    const theme = await resolveLayoutTheme(prisma, layout);
    res.json({ ...parseZoneLayout(layout), theme });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/screens/:id/layout — create a new (draft) zone-based layout
router.post('/:id/layout', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const screen = await prisma.screen.findUnique({ where: { id } });
    if (!screen) return res.status(404).json({ error: 'Screen not found' });

    const existing = await prisma.screenLayout.findUnique({ where: { screenId: id } });
    if (existing) return res.status(409).json({ error: 'A layout already exists for this screen' });

    if (req.body?.themeId != null && !(await themeExists(prisma, req.body.themeId))) {
      return res.status(400).json({ error: 'Theme not found' });
    }

    const bgErrors = validateBackgroundConfig(req.body?.settings?.background);
    if (bgErrors.length > 0) {
      return res.status(400).json({ error: bgErrors.join('; ') });
    }

    const layout = await prisma.screenLayout.create({
      data: {
        screenId: id,
        name: req.body?.name || 'Nouveau layout',
        settings: JSON.stringify(req.body?.settings || { showPrices: true, showImages: true }),
        ...(req.body?.themeId != null ? { themeId: parseInt(req.body.themeId, 10) } : {}),
      },
    });
    const theme = await resolveLayoutTheme(prisma, layout);
    res.status(201).json({ ...parseZoneLayout(layout), theme });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/screens/:id/layout/publish — mark the layout as published (goes live on TV)
router.post('/:id/layout/publish', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const layout = await prisma.screenLayout.findUnique({
      where: { screenId: id },
      include: {
        zones: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          include: { items: { include: { item: true } } },
        },
      },
    });
    if (!layout) return res.status(404).json({ error: 'No layout found for this screen' });

    const issues = validatePublishableLayout(layout);
    if (issues.length > 0) {
      return res.status(400).json({ error: issues.join(' ') });
    }

    const published = await prisma.screenLayout.update({
      where: { id: layout.id },
      data: { status: 'published' },
    });
    const theme = await resolveLayoutTheme(prisma, published);
    broadcast({ type: 'layout:published', screenId: id, timestamp: Date.now() });
    res.json({ ...parseZoneLayout({ ...published, zones: layout.zones }), theme });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/screens/:id/layout — bulk update.
// Zone-based: body { name?, settings?, zones: [...] } -> single transaction for the whole layout.
// Settings-only: body { settings } (e.g. screen background) keeps existing zones.
// Legacy: body { template, rows, cols, cells, settings } (Phase 6 grid builder).
router.put('/:id/layout', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const isZonePayload = req.body && Array.isArray(req.body.zones);
  const isSettingsOnly =
    req.body &&
    req.body.settings &&
    req.body.template === undefined &&
    req.body.rows === undefined &&
    req.body.cells === undefined;
  if (isZonePayload || isSettingsOnly) {
    try {
      const layout = await replaceLayout(prisma, id, req.body);
      const theme = await resolveLayoutTheme(prisma, layout);
      res.json({ ...parseZoneLayout(layout), theme });
    } catch (err) {
      if (err.name === 'ZoneValidationError') return res.status(400).json({ error: err.message });
      if (err.code === 'P2025') return res.status(404).json({ error: 'Screen not found' });
      if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid itemId in zones' });
      res.status(500).json({ error: err.message });
    }
    return;
  }

  const { error, value } = validateLayout(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const screen = await prisma.screen.update({
      where: { id },
      data: { layout: JSON.stringify(value) },
    });
    res.json(withStatus(parseLayout(screen)));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Screen not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/screens/:id (protected, admin)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const screen = await prisma.screen.findUnique({ where: { id } });
    if (!screen) return res.status(404).json({ error: 'Screen not found' });

    await prisma.screen.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/screens/:id/ping  (called by the TV client)
router.post('/:id/ping', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const screen = await prisma.screen.update({
      where: { id },
      data: { lastPing: new Date() },
    });
    res.json(withStatus(parseLayout(screen)));
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Screen not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/screens/:id/assignments (protected, admin)
// body: { categoryIds: number[], itemIds: number[] }
router.put('/:id/assignments', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { categoryIds = [], itemIds = [] } = req.body;

  if (!Array.isArray(categoryIds) || !Array.isArray(itemIds)) {
    return res.status(400).json({ error: 'categoryIds and itemIds must be arrays' });
  }

  try {
    const screen = await prisma.screen.findUnique({ where: { id } });
    if (!screen) return res.status(404).json({ error: 'Screen not found' });

    await prisma.$transaction([
      prisma.screen.update({
        where: { id },
        data: { categories: { set: categoryIds.map((c) => ({ id: parseInt(c) })) } },
      }),
      prisma.screen.update({
        where: { id },
        data: { items: { set: itemIds.map((i) => ({ id: parseInt(i) })) } },
      }),
    ]);

    const updated = await prisma.screen.findUnique({
      where: { id },
      include: { categories: true, items: true },
    });
    res.json(withStatus(parseLayout(updated)));
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(400).json({ error: 'Invalid categoryId or itemId' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
