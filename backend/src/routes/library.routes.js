const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const CATEGORY_TYPES = ['image', 'texture', 'font'];

// GET /api/library/categories  OR  GET /api/library/categories?id=1
// Public: the TV client and the admin builder both just read this list.
router.get('/categories', async (req, res, next) => {
  const { id } = req.query;
  try {
    if (id) {
      const category = await prisma.libraryCategory.findUnique({
        where: { id: parseInt(id) },
        include: { assets: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } },
      });
      if (!category) return res.status(404).json({ error: 'Category not found' });
      return res.json(category);
    }
    const categories = await prisma.libraryCategory.findMany({
      include: { assets: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/library/categories (protected)
router.post('/categories', auth, requireRole('admin'), async (req, res, next) => {
  const { name, order, type } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
  }
  if (type !== undefined && !CATEGORY_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${CATEGORY_TYPES.join(', ')}` });
  }

  try {
    const category = await prisma.libraryCategory.create({
      data: {
        name: name.trim(),
        order: order !== undefined ? parseInt(order) : 0,
        type: type || 'image',
      },
    });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Category "${name.trim()}" already exists` });
    }
    next(err);
  }
});

// PUT /api/library/categories/:id (protected)
router.put('/categories/:id', auth, requireRole('admin'), async (req, res, next) => {
  const { name, order, type } = req.body;
  const id = parseInt(req.params.id);

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Name must be a non-empty string' });
  }
  if (type !== undefined && !CATEGORY_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${CATEGORY_TYPES.join(', ')}` });
  }

  try {
    const updated = await prisma.libraryCategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
        type: type !== undefined ? type : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Category "${name.trim()}" already exists` });
    }
    next(err);
  }
});

// DELETE /api/library/categories/:id (protected) — also drops its assets (DB rows only,
// the underlying Cloudinary images are left in place, same as elsewhere in the app).
router.delete('/categories/:id', auth, requireRole('admin'), async (req, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const category = await prisma.libraryCategory.findUnique({ where: { id } });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    await prisma.libraryCategory.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/library/assets (protected) — registers an already-uploaded image
// (from POST /api/upload) as a reusable library asset in a category.
router.post('/assets', auth, requireRole('admin'), async (req, res, next) => {
  const { categoryId, url, name, order } = req.body;

  if (!categoryId || Number.isNaN(parseInt(categoryId))) {
    return res.status(400).json({ error: 'categoryId is required' });
  }
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    const asset = await prisma.libraryAsset.create({
      data: {
        categoryId: parseInt(categoryId),
        url,
        name: name || null,
        order: order !== undefined ? parseInt(order) : 0,
      },
    });
    res.status(201).json(asset);
  } catch (err) {
    if (err.code === 'P2003') return res.status(400).json({ error: 'Category not found' });
    next(err);
  }
});

// PUT /api/library/assets/:id (protected)
router.put('/assets/:id', auth, requireRole('admin'), async (req, res, next) => {
  const { name, order, categoryId } = req.body;
  const id = parseInt(req.params.id);

  try {
    const updated = await prisma.libraryAsset.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
        categoryId: categoryId !== undefined ? parseInt(categoryId) : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Asset not found' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Category not found' });
    next(err);
  }
});

// DELETE /api/library/assets/:id (protected) — DB row only; delete the
// Cloudinary image separately via DELETE /api/upload/:public_id if desired,
// same two-step pattern the admin UI already uses for product images.
router.delete('/assets/:id', auth, requireRole('admin'), async (req, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const asset = await prisma.libraryAsset.findUnique({ where: { id } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await prisma.libraryAsset.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
