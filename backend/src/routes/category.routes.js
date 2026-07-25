const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');

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
router.post('/', auth, async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
  }

  try {
    const newCat = await prisma.category.create({
      data: { name: name.trim() },
    });
    res.status(201).json(newCat);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Category "${name.trim()}" already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id (protected)
router.put('/:id', auth, async (req, res) => {
  const { name } = req.body;
  const id = parseInt(req.params.id);

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
  }

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
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
router.delete('/:id', auth, async (req, res) => {
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
