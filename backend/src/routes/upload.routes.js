const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const cloudinaryService = require('../services/cloudinaryService');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/', auth, requireRole('admin'), (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 50MB' });
      return next(err);
    }
    next();
  });
}, async (req, res, next) => {
  try {
    // Express 5 no longer defaults req.body to {} — a request that carries
    // neither a multipart body (multer sets it) nor JSON (express.json sets
    // it) leaves it undefined, and destructuring it threw a 500 where the
    // "No image file provided" 400 below belongs.
    const { itemId } = req.body || {};
    const result = await cloudinaryService.uploadImage(req.file, itemId);
    res.json(result);
  } catch (err) {
    const isValidationError = err.message.startsWith('No image') || err.message.startsWith('Invalid') || err.message.startsWith('File too');
    if (isValidationError) return res.status(400).json({ error: err.message });
    next(err);
  }
});

// Cloudinary public_ids keep their folder prefix ("galaxyfood/abc123"), and a
// plain :public_id param stops at the slash — so this route never matched a
// real id and every delete 404'd, leaving the images orphaned on Cloudinary
// forever. Express 5's wildcard captures the remaining path as an array of
// segments; rejoining them rebuilds the id exactly as Cloudinary issued it.
router.delete('/*public_id', auth, requireRole('admin'), async (req, res, next) => {
  const publicId = [].concat(req.params.public_id || []).join('/');
  try {
    await cloudinaryService.deleteImage(publicId);
    res.status(204).end();
  } catch (err) {
    if (err.message === 'No public_id provided') return res.status(400).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
