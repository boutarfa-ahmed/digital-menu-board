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

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
  }
  if (price === undefined || price === null) {
    return res.status(400).json({ error: 'Price is required' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }
  if (categoryId === undefined || categoryId === null) {
    return res.status(400).json({ error: 'categoryId is required' });
  }

  try {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const newItem = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        description: description || null,
        price,
        imageUrl: imageUrl || null,
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
  const id = parseInt(req.params.id);

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Name must be a non-empty string' });
  }
  if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  try {
    // Check if category exists if provided
    if (categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description,
        price: price !== undefined ? price : undefined,
        imageUrl,
        categoryId: categoryId !== undefined ? parseInt(categoryId) : undefined,
        available,
      },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/menu/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    await prisma.menuItem.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
