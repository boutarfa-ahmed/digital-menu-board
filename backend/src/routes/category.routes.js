const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// POST /api/categories
router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    const newCat = await prisma.category.create({ data: { name } });
    res.status(201).json(newCat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  try {
    const updated = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.category.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
