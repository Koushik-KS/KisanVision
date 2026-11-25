import { SUPPORTED_CROPS, UNSUPPORTED_CROP_MESSAGE } from '../../../config/constants.js';
import AppError from '../../../utils/AppError.js';

export const SUITABILITY_CATEGORIES = [
  'Highly Suitable',
  'Suitable',
  'Moderate',
  'Low Suitability',
];

export const validateRequestedSupportedCrops = (crops) => {
  if (crops === undefined || crops === null) {
    return [...SUPPORTED_CROPS];
  }

  if (!Array.isArray(crops) || crops.length === 0) {
    throw new AppError(
      'Crops filter must be a non-empty array of supported crops.',
      400,
      'INVALID_CROPS_FILTER'
    );
  }

  const normalized = [];
  for (const rawCrop of crops) {
    const matched = SUPPORTED_CROPS.find(
      (supported) => supported.toLowerCase() === String(rawCrop).trim().toLowerCase()
    );
    if (!matched) {
      throw new AppError(UNSUPPORTED_CROP_MESSAGE, 400, 'UNSUPPORTED_CROP_REQUESTED');
    }
    if (!normalized.includes(matched)) {
      normalized.push(matched);
    }
  }

  return normalized;
};

export const validateWeatherIntelligenceInput = (payload = {}) => {
  const { current, forecast, location, crops } = payload;

  if (!current || typeof current !== 'object') {
    throw new AppError(
      'Current weather measurements are required for Weather Intelligence analysis.',
      400,
      'INVALID_WEATHER_INPUT'
    );
  }

  if (!Array.isArray(forecast) || forecast.length === 0) {
    throw new AppError(
      'A non-empty 5-day forecast array is required for Weather Intelligence analysis.',
      400,
      'INVALID_WEATHER_INPUT'
    );
  }

  const targetCrops = validateRequestedSupportedCrops(crops);

  return {
    current,
    forecast: forecast.slice(0, 5),
    location: location && typeof location === 'object' ? location : null,
    targetCrops,
  };
};

export const validateWeatherIntelligenceOutput = (result) => {
  if (!result || typeof result !== 'object') {
    throw new AppError('Weather Intelligence Agent produced an empty response.', 500, 'AI_RESPONSE_INVALID');
  }

  if (!Array.isArray(result.cropRecommendations) || result.cropRecommendations.length === 0) {
    throw new AppError('Weather Intelligence Agent returned no crop recommendations.', 500, 'AI_RESPONSE_INVALID');
  }

  for (const item of result.cropRecommendations) {
    if (!SUPPORTED_CROPS.includes(item.crop)) {
      throw new AppError(`Unsupported crop "${item.crop}" found in weather recommendations.`, 500, 'AI_RESPONSE_INVALID');
    }
    if (
      typeof item.suitabilityScore !== 'number' ||
      item.suitabilityScore < 0 ||
      item.suitabilityScore > 100
    ) {
      throw new AppError(`Invalid suitability score for ${item.crop}.`, 500, 'AI_RESPONSE_INVALID');
    }
    if (!SUITABILITY_CATEGORIES.includes(item.suitabilityCategory)) {
      throw new AppError(`Invalid suitability category for ${item.crop}.`, 500, 'AI_RESPONSE_INVALID');
    }
  }

  if (!result.weatherInsights || typeof result.weatherInsights !== 'object') {
    throw new AppError('Weather Intelligence Agent output is missing weatherInsights.', 500, 'AI_RESPONSE_INVALID');
  }

  return result;
};
