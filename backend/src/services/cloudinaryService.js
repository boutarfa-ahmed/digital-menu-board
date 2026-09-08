const sharp = require('sharp');
const cloudinary = require('../config/cloudinary');
const prisma = require('../db');

// Le SVG est accepté pour les icônes de la couche décorative : il reste net à
// n'importe quelle taille sur une TV 4K, et il peut être recoloré côté client
// (masque CSS, voir elementVisualStyle dans le schéma partagé). Il n'est jamais
// injecté dans le DOM — toujours affiché via <img> ou un masque CSS — donc un
// script glissé dans le fichier ne s'exécute pas.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

// Animated GIFs are passed through untouched (resizing/trimming would need
// extra care to keep the animation). Everything else is trimmed — product
// photos come in with wildly different amounts of blank/transparent margin
// baked around the subject, which makes cards render at inconsistent visual
// sizes on the TV grid even though the card box itself is identical — then
// downsized/re-encoded once it's past CLOUDINARY_SAFE_SIZE. Re-encoding to
// WebP (not JPEG) matters here: JPEG has no alpha channel, so sharp would
// flatten a transparent PNG onto a black background — WebP keeps
// transparency intact.
// Le SVG passe intact lui aussi : sharp le rasterise, ce qui lui ferait perdre
// exactement ce pour quoi on le veut (vectoriel, recolorable).
async function prepareForUpload(file) {
  if (file.mimetype === 'image/gif' || file.mimetype === 'image/svg+xml') {
    return { buffer: file.buffer, mimetype: file.mimetype };
  }
  let pipeline = sharp(file.buffer).trim();
  if (file.size > CLOUDINARY_SAFE_SIZE) {
    pipeline = pipeline.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });
  }
  const buffer = await pipeline.webp({ quality: 82 }).toBuffer();
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

const ALLOWED_FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];
const MAX_FONT_SIZE = 10 * 1024 * 1024; // 10MB — generous for a single font file

// Font files skip the sharp/webp pipeline entirely — there's nothing to
// re-encode, and Cloudinary stores them as opaque "raw" resources. Browser
// mimetype detection for fonts is unreliable (many send
// application/octet-stream for .ttf), so validation goes by extension.
function validateFontFile(file) {
  if (!file) {
    return { valid: false, error: 'No font file provided' };
  }
  const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  if (!ALLOWED_FONT_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid font type: ${ext || 'unknown'}. Allowed: ${ALLOWED_FONT_EXTENSIONS.join(', ')}` };
  }
  if (file.size > MAX_FONT_SIZE) {
    return { valid: false, error: `File too large. Max ${MAX_FONT_SIZE / 1024 / 1024}MB` };
  }
  return { valid: true };
}

async function uploadFont(file) {
  const validation = validateFontFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const dataURI = toDataURI(file.buffer, file.mimetype || 'application/octet-stream');
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: 'galaxyfood/fonts',
    resource_type: 'raw',
    public_id: file.originalname.replace(/\.[^.]+$/, ''),
  });

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
  uploadFont,
  deleteImage,
};
