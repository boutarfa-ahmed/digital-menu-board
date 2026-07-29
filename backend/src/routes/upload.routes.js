const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const cloudinaryService = require('../services/cloudinaryService');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { itemId } = req.body;
    const result = await cloudinaryService.uploadImage(req.file, itemId);
    res.json(result);
  } catch (err) {
    const status = err.message.startsWith('No image') || err.message.startsWith('Invalid') || err.message.startsWith('File too') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

router.delete('/:public_id', auth, async (req, res) => {
  try {
    await cloudinaryService.deleteImage(req.params.public_id);
    res.status(204).end();
  } catch (err) {
    res.status(err.message === 'No public_id provided' ? 400 : 500).json({ error: err.message });
  }
});

module.exports = router;
