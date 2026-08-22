const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

// GET /api/categories  OR  GET /api/categories?id=1
router.get('/', async (req, res) => {
  const { id } = req.query;
  try {
    if (id) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: { items: true },
      });
      if (!category) return res.status(404).json({ error: 'Category not found' });
      return res.json(category);
    }
    const categories = await prisma.category.findMany({
      include: { items: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/:id
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories (protected)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { name, order, icon, color } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
  }

  try {
    const newCat = await prisma.category.create({
      data: {
        name: name.trim(),
        order: order !== undefined ? parseInt(order) : 0,
        icon: icon || null,
        color: color || null,
      },
    });
    res.status(201).json(newCat);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Category "${name.trim()}" already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/reorder (protected) — batch update display order
router.put('/reorder', auth, requireRole('admin'), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.category.update({
          where: { id: parseInt(id) },
          data: { order: index + 1 },
        })
      )
    );
    const categories = await prisma.category.findMany({
      include: { items: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id (protected)
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { name, order, icon, color } = req.body;
  const id = parseInt(req.params.id);

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Name must be a non-empty string' });
  }
  if (order !== undefined && (typeof order !== 'number' || Number.isNaN(order))) {
    return res.status(400).json({ error: 'Order must be a number' });
  }

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        order: order !== undefined ? order : undefined,
        icon: icon !== undefined ? icon : undefined,
        color: color !== undefined ? color : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Category "${name.trim()}" already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id (protected)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    await prisma.menuItem.deleteMany({ where: { categoryId: id } });
    await prisma.category.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
