const sharp = require('sharp');
const cloudinary = require('../config/cloudinary');
const prisma = require('../db');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Cloudinary's current plan caps a single upload at 10MB. Rather than reject
// large product photos, we resize/re-encode anything over this threshold so
// it lands comfortably under that ceiling — TV displays don't need more than
// MAX_DIMENSION px anyway.
const CLOUDINARY_SAFE_SIZE = 9 * 1024 * 1024;
const MAX_DIMENSION = 2000;

function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No image file provided' };
  }
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return { valid: false, error: `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  return { valid: true };
}

function toDataURI(buffer, mimetype) {
  const b64 = buffer.toString('base64');
  return `data:${mimetype};base64,${b64}`;
}

// Animated GIFs are passed through untouched (resizing would need extra care
// to keep the animation); everything else gets downsized/re-encoded once it's
// past CLOUDINARY_SAFE_SIZE. Re-encoding to WebP (not JPEG) matters here:
// JPEG has no alpha channel, so sharp would flatten a transparent PNG onto a
// black background — WebP keeps transparency intact.
async function prepareForUpload(file) {
  if (file.mimetype === 'image/gif' || file.size <= CLOUDINARY_SAFE_SIZE) {
    return { buffer: file.buffer, mimetype: file.mimetype };
  }
  const buffer = await sharp(file.buffer)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return { buffer, mimetype: 'image/webp' };
}

async function uploadImage(file, itemId) {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { buffer, mimetype } = await prepareForUpload(file);
  const dataURI = toDataURI(buffer, mimetype);
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: 'galaxyfood',
  });

  if (itemId) {
    await prisma.menuItem.update({
      where: { id: parseInt(itemId) },
      data: { imageUrl: result.secure_url },
    });
  }

  return { url: result.secure_url, public_id: result.public_id };
}

async function deleteImage(publicId) {
  if (!publicId) {
    throw new Error('No public_id provided');
  }
  const result = await cloudinary.uploader.destroy(publicId);
  return result;
}

module.exports = {
  uploadImage,
  deleteImage,
};
