import { AI_TASKS, orchestrateAIWorkflow } from '../services/ai/orchestrator.js';
import {
  fetchWeatherByCoordinates,
  fetchWeatherByQuery,
  sanitizeLocationQuery,
  searchLocations,
} from '../services/weather/weatherService.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';

const buildOptionalLocationMeta = (query) => {
  const name = sanitizeLocationQuery(query?.name);
  if (!name) return null;

  return {
    name,
    district: sanitizeLocationQuery(query?.district) || null,
    state: sanitizeLocationQuery(query?.state) || null,
    country: sanitizeLocationQuery(query?.country) || null,
    displayName: sanitizeLocationQuery(query?.displayName) || null,
  };
};

const resolveWeatherBundleFromParams = async (params) => {
  const { lat, lon, q } = params || {};

  if (lat !== undefined || lon !== undefined) {
    const locationMeta = buildOptionalLocationMeta(params);
    return fetchWeatherByCoordinates(lat, lon, {
      locationMeta,
    });
  }

  const query = sanitizeLocationQuery(q);
  if (query) {
    return fetchWeatherByQuery(query);
  }

  throw new AppError(
    'Provide either latitude/longitude coordinates (lat & lon) or a location query (q).',
    400,
    'LOCATION_PARAMS_REQUIRED'
  );
};

/**
 * GET /api/weather/locations?q=...&limit=...
 * Searches real matching geographic locations for manual lookup.
 */
export const searchWeatherLocations = async (req, res, next) => {
  try {
    const result = await searchLocations(req.query.q, {
      limit: req.query.limit,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message:
        result.locations.length > 0
          ? `Found ${result.locations.length} matching location(s).`
          : `No matching locations found for "${result.query}".`,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/weather/current?lat=...&lon=... OR ?q=...
 * Returns actual current weather measurements for the target location.
 */
export const getCurrentWeather = async (req, res, next) => {
  try {
    const weatherBundle = await resolveWeatherBundleFromParams(req.query);

    return sendSuccess(res, {
      statusCode: 200,
      message: `Current weather retrieved for ${weatherBundle.location.displayName}.`,
      data: {
        provider: weatherBundle.provider,
        fetchedAt: weatherBundle.fetchedAt,
        location: weatherBundle.location,
        current: weatherBundle.current,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/weather/forecast?lat=...&lon=... OR ?q=...
 * Returns real 5-day daily forecast for the target location.
 */
export const getWeatherForecast = async (req, res, next) => {
  try {
    const weatherBundle = await resolveWeatherBundleFromParams(req.query);

    return sendSuccess(res, {
      statusCode: 200,
      message: `5-day weather forecast retrieved for ${weatherBundle.location.displayName}.`,
      data: {
        provider: weatherBundle.provider,
        fetchedAt: weatherBundle.fetchedAt,
        location: weatherBundle.location,
        forecast: weatherBundle.forecast,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/weather/intelligence?lat=...&lon=... OR ?q=...
 * Fetches real current weather + 5-day forecast and runs the Weather Intelligence Agent
 * through the AI Orchestrator for all 5 supported crops.
 */
export const getWeatherIntelligence = async (req, res, next) => {
  try {
    const weatherBundle = await resolveWeatherBundleFromParams(req.query);
    const intelligence = await orchestrateAIWorkflow(AI_TASKS.WEATHER_INTELLIGENCE, {
      location: weatherBundle.location,
      current: weatherBundle.current,
      forecast: weatherBundle.forecast,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Weather intelligence ready for ${weatherBundle.location.displayName}.`,
      data: {
        provider: weatherBundle.provider,
        fetchedAt: weatherBundle.fetchedAt,
        location: weatherBundle.location,
        current: weatherBundle.current,
        forecast: weatherBundle.forecast,
        matchingLocations: weatherBundle.matchingLocations || [weatherBundle.location],
        intelligence,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/weather/recommendations
 * Evaluates crop suitability via the AI Orchestrator from either supplied real weather
 * payloads or fetched weather for given coordinates / location query.
 */
export const generateCropRecommendations = async (req, res, next) => {
  try {
    const { current, forecast, location, crops, lat, lon, q } = req.body || {};

    let weatherData = null;
    if (current && forecast) {
      weatherData = {
        provider: 'Client-Supplied Retrieved Weather',
        fetchedAt: new Date().toISOString(),
        location: location || null,
        current,
        forecast,
      };
    } else if (lat !== undefined || lon !== undefined || q) {
      weatherData = await resolveWeatherBundleFromParams({ lat, lon, q, ...(location || {}) });
    } else {
      throw new AppError(
        'Provide either retrieved weather & forecast data or location coordinates/query.',
        400,
        'INVALID_WEATHER_REQUEST'
      );
    }

    const intelligence = await orchestrateAIWorkflow(AI_TASKS.WEATHER_INTELLIGENCE, {
      location: weatherData.location,
      current: weatherData.current,
      forecast: weatherData.forecast,
      crops,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Weather-based crop recommendations generated.',
      data: {
        provider: weatherData.provider,
        fetchedAt: weatherData.fetchedAt,
        location: weatherData.location,
        intelligence,
      },
    });
  } catch (err) {
    return next(err);
  }
};
