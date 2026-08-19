const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { broadcast } = require('../services/broadcast');
const {
  DEFAULT_THEME,
  parseTheme,
  validateThemeInput,
  themeDataFromBody,
  getDefaultTheme,
} = require('../services/theme.service');

// GET /api/themes — list all themes
router.get('/', async (req, res) => {
  try {
    const themes = await prisma.theme.findMany({ orderBy: { id: 'asc' } });
    res.json(themes.map(parseTheme));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/themes/default — fallback theme (Galaxy Food default if no DB theme)
router.get('/default', async (req, res) => {
  try {
    const theme = await getDefaultTheme(prisma);
    res.json(theme ? parseTheme(theme) : { ...DEFAULT_THEME });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/themes/:id
router.get('/:id', async (req, res) => {
  try {
    const theme = await prisma.theme.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!theme) return res.status(404).json({ error: 'Theme not found' });
    res.json(parseTheme(theme));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/themes (protected, admin)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const errors = validateThemeInput(req.body);
  if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });

  try {
    const data = themeDataFromBody(req.body);
    if (data.isDefault === true) {
      await prisma.theme.updateMany({ data: { isDefault: false } });
    }
    const theme = await prisma.theme.create({ data });
    broadcast({ type: 'theme:created', themeId: theme.id, timestamp: Date.now() });
    res.status(201).json(parseTheme(theme));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A theme with this name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/themes/:id (protected, admin)
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const errors = validateThemeInput(req.body);
  if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });

  try {
    const existing = await prisma.theme.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Theme not found' });

    const data = themeDataFromBody(req.body);
    if (data.isDefault === true && !existing.isDefault) {
      await prisma.theme.updateMany({ data: { isDefault: false } });
    }
    const theme = await prisma.theme.update({ where: { id }, data });
    broadcast({ type: 'theme:updated', themeId: theme.id, timestamp: Date.now() });
    res.json(parseTheme(theme));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Theme not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'A theme with this name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/themes/:id (protected, admin)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const theme = await prisma.theme.findUnique({ where: { id } });
    if (!theme) return res.status(404).json({ error: 'Theme not found' });
    if (theme.isDefault) {
      return res.status(400).json({ error: 'Cannot delete the default theme' });
    }
    await prisma.theme.delete({ where: { id } });
    broadcast({ type: 'theme:deleted', themeId: id, timestamp: Date.now() });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Theme not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
