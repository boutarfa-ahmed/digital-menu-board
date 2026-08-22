const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

function parseItem(item) {
  let images = [];
  let tags = [];
  try {
    images = JSON.parse(item.images || '[]');
  } catch (e) {
    images = [];
  }
  try {
    tags = JSON.parse(item.tags || '[]');
  } catch (e) {
    tags = [];
  }
  return { ...item, images, tags };
}

function statusToAvailable(status) {
  return status === 'available';
}

const VALID_STATUSES = ['available', 'out_of_stock', 'archived'];

// GET /api/menu  OR  ?id=  ?category=  ?categoryId=  ?status=  ?tag=  ?includeArchived=1
router.get('/', async (req, res) => {
  const { id, category, categoryId, status, tag, includeArchived } = req.query;
  try {
    if (id) {
      const item = await prisma.menuItem.findUnique({
        where: { id: parseInt(id) },
        include: { category: true },
      });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      return res.json(parseItem(item));
    }

    const where = {};
    if (!includeArchived) where.status = { not: 'archived' };
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (status) where.status = status;
    if (category) where.category = { name: category };
    if (tag) where.tags = { contains: `"${tag}"` };

    const items = await prisma.menuItem.findMany({
      where,
      include: { category: true },
      orderBy: [
        { category: { order: 'asc' } },
        { order: 'asc' },
        { id: 'asc' },
      ],
    });
    res.json(items.map(parseItem));
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
    res.json(parseItem(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/menu (protected)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { name, description, price, categoryId, imageUrl, images, tags, status, order } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
  }
  if (price !== undefined && price !== null && (typeof price !== 'number' || price <= 0)) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }
  if (categoryId === undefined || categoryId === null) {
    return res.status(400).json({ error: 'categoryId is required' });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const nextStatus = status || 'available';
    if (!VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const newItem = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        description: description || null,
        price: price ?? null,
        imageUrl: imageUrl || null,
        images: JSON.stringify(Array.isArray(images) ? images : []),
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        status: nextStatus,
        available: statusToAvailable(nextStatus),
        order: order !== undefined ? parseInt(order) : 0,
        categoryId: parseInt(categoryId),
      },
      include: { category: true },
    });
    res.status(201).json(parseItem(newItem));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/menu/:id/duplicate (protected)
router.post('/:id/duplicate', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const source = await prisma.menuItem.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ error: 'Item not found' });

    const lastInCat = await prisma.menuItem.findFirst({
      where: { categoryId: source.categoryId },
      orderBy: { order: 'desc' },
    });

    const dup = await prisma.menuItem.create({
      data: {
        name: `${source.name} (copie)`,
        description: source.description,
        price: source.price,
        imageUrl: source.imageUrl,
        images: source.images,
        tags: source.tags,
        status: source.status,
        available: source.available,
        order: (lastInCat ? lastInCat.order : 0) + 1,
        categoryId: source.categoryId,
      },
      include: { category: true },
    });
    res.status(201).json(parseItem(dup));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/menu/:id/archive (protected) — soft delete
router.patch('/:id/archive', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { status: 'archived', available: false },
      include: { category: true },
    });
    res.json(parseItem(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/menu/:id/status (protected) — quick toggle
router.patch('/:id/status', auth, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Allowed: available, out_of_stock, archived' });
  }

  try {
    const updated = await prisma.menuItem.update({
      where: { id },
      data: { status, available: statusToAvailable(status) },
      include: { category: true },
    });
    res.json(parseItem(updated));
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/menu/reorder (protected) — batch update order within a category
router.put('/reorder', auth, requireRole('admin'), async (req, res) => {
  const { categoryId, ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  try {
    await prisma.$transaction(
      ids.map((itemId, index) =>
        prisma.menuItem.update({
          where: { id: parseInt(itemId) },
          data: { order: index + 1 },
        })
      )
    );
    const items = await prisma.menuItem.findMany({
      where: categoryId ? { categoryId: parseInt(categoryId) } : undefined,
      include: { category: true },
      orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }, { id: 'asc' }],
    });
    res.json(items.map(parseItem));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/menu/:id (protected)
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { name, description, price, imageUrl, images, tags, categoryId, status, order } = req.body;
  const id = parseInt(req.params.id);

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Name must be a non-empty string' });
  }
  if (price !== undefined && price !== null && (typeof price !== 'number' || price <= 0)) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    if (categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = price;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (images !== undefined) data.images = JSON.stringify(images);
    if (tags !== undefined) data.tags = JSON.stringify(tags);
    if (status !== undefined) {
      data.status = status;
      data.available = statusToAvailable(status);
    }
    if (categoryId !== undefined) data.categoryId = parseInt(categoryId);
    if (order !== undefined) data.order = parseInt(order);

    const updated = await prisma.menuItem.update({
      where: { id },
      data,
      include: { category: true },
    });
    res.json(parseItem(updated));
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/menu/:id (protected) — physical delete (legacy; prefer PATCH /archive)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
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
