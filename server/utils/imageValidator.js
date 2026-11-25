import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from '../config/constants.js';
import AppError from './AppError.js';

const JPEG_SOI = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const hasPrefix = (buffer, signature) => {
  if (!buffer || buffer.length < signature.length) return false;
  return signature.every((byte, idx) => buffer[idx] === byte);
};

const isWebpBuffer = (buffer) => {
  if (!buffer || buffer.length < 16) return false;
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  return riff === 'RIFF' && webp === 'WEBP';
};

/**
 * Inspect actual file magic bytes and structural minimum size to reject empty,
 * spoofed, or malformed image uploads before sending data to AI services.
 */
export const detectImageMimeFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return null;
  }

  if (hasPrefix(buffer, JPEG_SOI) && buffer.length >= 12) {
    // Require JPEG EOI marker (0xFF 0xD9) somewhere after header or valid segment marker
    const hasSegment = buffer[3] >= 0xc0;
    if (hasSegment) return 'image/jpeg';
  }

  if (hasPrefix(buffer, PNG_SIGNATURE) && buffer.length >= 24) {
    const ihdr = buffer.subarray(12, 16).toString('ascii');
    if (ihdr === 'IHDR') return 'image/png';
  }

  if (isWebpBuffer(buffer) && buffer.length >= 20) {
    const vp8Chunk = buffer.subarray(12, 15).toString('ascii');
    if (vp8Chunk === 'VP8') return 'image/webp';
  }

  return null;
};

/**
 * Validate uploaded Multer file metadata and binary header.
 */
export const validateUploadedImageFile = (file) => {
  if (!file) {
    throw new AppError(
      'Please upload an image file using the "image" field.',
      400,
      'IMAGE_REQUIRED'
    );
  }

  if (!file.buffer || file.size === 0 || file.buffer.length === 0) {
    throw new AppError('Uploaded image file is empty.', 400, 'EMPTY_FILE');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES || file.buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError(
      'Uploaded image exceeds the maximum 10 MB size limit.',
      413,
      'FILE_TOO_LARGE'
    );
  }

  const declaredMime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(declaredMime)) {
    throw new AppError(
      'Unsupported file type. Only JPG, JPEG, PNG, and WEBP images are allowed.',
      400,
      'UNSUPPORTED_FILE_TYPE'
    );
  }

  const detectedMime = detectImageMimeFromBuffer(file.buffer);
  if (!detectedMime) {
    throw new AppError(
      'Uploaded file appears to be corrupted or is not a valid JPG, PNG, or WEBP image.',
      400,
      'MALFORMED_IMAGE'
    );
  }

  return {
    buffer: file.buffer,
    mimeType: detectedMime,
    size: file.buffer.length,
  };
};
