const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/menu  OR  GET /api/menu?id=1  OR  GET /api/menu?category=Pizzas
router.get('/', async (req, res) => {
  const { id, category } = req.query;
  try {
    if (id) {
      const item = await prisma.menuItem.findUnique({
        where: { id: parseInt(id) },
        include: { category: true },
      });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      return res.json(item);
    }
    const items = await prisma.menuItem.findMany({
      where: category ? { category: { name: category } } : {},
      include: { category: true },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/menu
router.post('/', async (req, res) => {
  const { name, description, price, imageUrl, categoryId, available } = req.body;
  try {
    const newItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        imageUrl,
        categoryId: parseInt(categoryId),
        available: available ?? true,
      },
    });
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/menu/:id
router.put('/:id', async (req, res) => {
  const { name, description, price, imageUrl, categoryId, available } = req.body;
  try {
    const updated = await prisma.menuItem.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        imageUrl,
        categoryId: categoryId !== undefined ? parseInt(categoryId) : undefined,
        available,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/menu/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.menuItem.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
