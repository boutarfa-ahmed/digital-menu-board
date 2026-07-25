const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/upload (protected) - upload image and link to menu item
router.post('/', auth, upload.single('image'), async (req, res) => {
  const { itemId } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  try {
    // Convert buffer to base64 for cloudinary
    const b64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'galaxyfood',
    });

    // Update menu item imageUrl if itemId provided
    if (itemId) {
      await prisma.menuItem.update({
        where: { id: parseInt(itemId) },
        data: { imageUrl: result.secure_url },
      });
    }

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/upload/:public_id (protected) - delete image from cloudinary
router.delete('/:public_id', auth, async (req, res) => {
  try {
    await cloudinary.uploader.destroy(req.params.public_id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
