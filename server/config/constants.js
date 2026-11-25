/**
 * Strict list of crops supported across all KisanVision AI features.
 */
export const SUPPORTED_CROPS = [
  'Coffee',
  'Black Pepper',
  'Ginger',
  'Cardamom',
  'Arecanut',
];

export const UNSUPPORTED_CROP_MESSAGE =
  'This crop is not currently supported by KisanVision AI. We can analyze only Coffee, Black Pepper, Ginger, Cardamom, and Arecanut.';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_BATCH_IMAGES = 5;
