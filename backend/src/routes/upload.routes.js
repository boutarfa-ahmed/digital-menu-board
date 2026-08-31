const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const cloudinaryService = require('../services/cloudinaryService');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/', auth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 20MB' });
      return next(err);
    }
    next();
  });
}, async (req, res, next) => {
  try {
    const { itemId } = req.body;
    const result = await cloudinaryService.uploadImage(req.file, itemId);
    res.json(result);
  } catch (err) {
    const isValidationError = err.message.startsWith('No image') || err.message.startsWith('Invalid') || err.message.startsWith('File too');
    if (isValidationError) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.delete('/:public_id', auth, async (req, res, next) => {
  try {
    await cloudinaryService.deleteImage(req.params.public_id);
    res.status(204).end();
  } catch (err) {
    if (err.message === 'No public_id provided') return res.status(400).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
