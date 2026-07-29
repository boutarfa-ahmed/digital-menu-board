const cloudinary = require('../config/cloudinary');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

function toDataURI(file) {
  const b64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${b64}`;
}

async function uploadImage(file, itemId) {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const dataURI = toDataURI(file);
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
