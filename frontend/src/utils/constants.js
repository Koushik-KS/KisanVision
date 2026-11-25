export const SUPPORTED_CROPS = [
  'Coffee',
  'Black Pepper',
  'Ginger',
  'Cardamom',
  'Arecanut',
];

export const UNSUPPORTED_CROP_MESSAGE =
  'This crop is not currently supported by KisanVision AI. We can analyze only Coffee, Black Pepper, Ginger, Cardamom, and Arecanut.';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_BATCH_IMAGES = 5;

export const ROUTES = {
  HOME: '/',
  DISEASE_DETECTION: '/disease-detection',
  PLANT_IDENTIFICATION: '/plant-identification',
  MULTI_IMAGE_ANALYSIS: '/multi-image-analysis',
  WEATHER_PREDICTION: '/weather-prediction',
  HISTORY: '/history',
  PROFILE: '/profile',
};
