import env from '../../config/env.js';
import AppError from '../../utils/AppError.js';

const DEFAULT_TIMEOUT_MS = 10000;
const OPEN_METEO_GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OPENWEATHER_GEO_DIRECT_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const OPENWEATHER_GEO_REVERSE_URL = 'https://api.openweathermap.org/geo/1.0/reverse';
const OPENWEATHER_CURRENT_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

const WMO_WEATHER_MAP = {
  0: { condition: 'Clear', description: 'Clear sky' },
  1: { condition: 'Mainly Clear', description: 'Mainly clear sky' },
  2: { condition: 'Partly Cloudy', description: 'Partly cloudy' },
  3: { condition: 'Overcast', description: 'Overcast cloud cover' },
  45: { condition: 'Fog', description: 'Foggy conditions' },
  48: { condition: 'Rime Fog', description: 'Depositing rime fog' },
  51: { condition: 'Drizzle', description: 'Light drizzle' },
  53: { condition: 'Drizzle', description: 'Moderate drizzle' },
  55: { condition: 'Drizzle', description: 'Dense drizzle' },
  56: { condition: 'Freezing Drizzle', description: 'Light freezing drizzle' },
  57: { condition: 'Freezing Drizzle', description: 'Dense freezing drizzle' },
  61: { condition: 'Rain', description: 'Slight rain' },
  63: { condition: 'Rain', description: 'Moderate rain' },
  65: { condition: 'Heavy Rain', description: 'Heavy rain' },
  66: { condition: 'Freezing Rain', description: 'Light freezing rain' },
  67: { condition: 'Freezing Rain', description: 'Heavy freezing rain' },
  71: { condition: 'Snow', description: 'Slight snow fall' },
  73: { condition: 'Snow', description: 'Moderate snow fall' },
  75: { condition: 'Heavy Snow', description: 'Heavy snow fall' },
  77: { condition: 'Snow Grains', description: 'Snow grains' },
  80: { condition: 'Rain Showers', description: 'Slight rain showers' },
  81: { condition: 'Rain Showers', description: 'Moderate rain showers' },
  82: { condition: 'Heavy Showers', description: 'Violent rain showers' },
  85: { condition: 'Snow Showers', description: 'Slight snow showers' },
  86: { condition: 'Snow Showers', description: 'Heavy snow showers' },
  95: { condition: 'Thunderstorm', description: 'Thunderstorm' },
  96: { condition: 'Thunderstorm', description: 'Thunderstorm with slight hail' },
  99: { condition: 'Thunderstorm', description: 'Thunderstorm with heavy hail' },
};

/**
 * Converts numeric provider readings safely without fabricating 0 for missing fields.
 */
export const toFiniteNumberOrNull = (value, decimals = null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  if (typeof decimals === 'number') {
    const factor = 10 ** decimals;
    return Math.round(num * factor) / factor;
  }
  return num;
};

export const sanitizeLocationQuery = (query) => {
  if (typeof query !== 'string') {
    return '';
  }
  return query.trim().replace(/\s+/g, ' ').slice(0, 120);
};

export const validateCoordinates = (rawLat, rawLon) => {
  if (
    rawLat === undefined ||
    rawLat === null ||
    rawLat === '' ||
    rawLon === undefined ||
    rawLon === null ||
    rawLon === ''
  ) {
    throw new AppError(
      'Both latitude and longitude are required.',
      400,
      'INVALID_COORDINATES'
    );
  }

  const lat = Number(rawLat);
  const lon = Number(rawLon);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    throw new AppError(
      'Invalid geographic coordinates. Latitude must be -90..90 and longitude -180..180.',
      400,
      'INVALID_COORDINATES'
    );
  }

  return {
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4)),
  };
};

export const decodeWmoWeatherCode = (code) => {
  const numCode = toFiniteNumberOrNull(code);
  if (numCode === null) {
    return { condition: null, description: null };
  }
  return (
    WMO_WEATHER_MAP[numCode] || {
      condition: 'Weather Update',
      description: `Meteorological code ${numCode}`,
    }
  );
};

const formatDisplayName = ({ name, district, state, country, latitude, longitude }) => {
  const parts = [name, district && district !== name ? district : null, state, country].filter(
    Boolean
  );
  if (parts.length > 0) {
    return parts.join(', ');
  }
  return `Coordinates (${latitude}, ${longitude})`;
};

const resolveActiveProvider = (options = {}) => {
  const apiKey =
    options.weatherApiKey !== undefined ? options.weatherApiKey : env.weatherApiKey;
  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    return {
      providerId: 'openweathermap',
      providerLabel: 'OpenWeatherMap',
      apiKey: apiKey.trim(),
    };
  }
  return {
    providerId: 'open-meteo',
    providerLabel: 'Open-Meteo',
    apiKey: '',
  };
};

const fetchJsonWithTimeout = async (
  url,
  { fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {}, providerName = 'Weather provider' } = {}
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new AppError(
        `${providerName} request timed out. Please retry in a moment.`,
        504,
        'WEATHER_TIMEOUT'
      );
    }
    throw new AppError(
      `Unable to connect to ${providerName}. Please check connectivity and try again.`,
      503,
      'WEATHER_UNAVAILABLE'
    );
  }
  clearTimeout(timer);

  if (response.status === 401 || response.status === 403) {
    throw new AppError(
      `${providerName} authentication failed. Verify server weather API credentials.`,
      502,
      'WEATHER_AUTH_ERROR'
    );
  }

  if (response.status === 429) {
    throw new AppError(
      `${providerName} rate limit reached. Please wait briefly before retrying.`,
      429,
      'WEATHER_RATE_LIMIT'
    );
  }

  if (response.status === 404) {
    throw new AppError(
      'Requested location was not found by the weather provider.',
      404,
      'LOCATION_NOT_FOUND'
    );
  }

  if (!response.ok) {
    throw new AppError(
      `${providerName} returned an unexpected error (HTTP ${response.status}).`,
      502,
      'WEATHER_PROVIDER_ERROR'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new AppError(
      `Received malformed JSON response from ${providerName}.`,
      502,
      'WEATHER_MALFORMED_RESPONSE'
    );
  }

  if (!data || typeof data !== 'object') {
    throw new AppError(
      `Received empty or invalid payload from ${providerName}.`,
      502,
      'WEATHER_MALFORMED_RESPONSE'
    );
  }

  return data;
};

/**
 * Normalizes a geolocation result item from Open-Meteo or OpenWeatherMap.
 */
const normalizeOpenMeteoLocation = (item) => {
  const latitude = toFiniteNumberOrNull(item?.latitude, 4);
  const longitude = toFiniteNumberOrNull(item?.longitude, 4);
  if (latitude === null || longitude === null || !item?.name) {
    return null;
  }

  const normalized = {
    id: `om_${item.id ?? `${latitude}_${longitude}`}`,
    name: String(item.name),
    district: item.admin2 ? String(item.admin2) : null,
    state: item.admin1 ? String(item.admin1) : null,
    country: item.country ? String(item.country) : item.country_code ? String(item.country_code) : null,
    latitude,
    longitude,
    elevationMeters: toFiniteNumberOrNull(item.elevation, 0),
    timezone: item.timezone ? String(item.timezone) : null,
  };

  return {
    ...normalized,
    displayName: formatDisplayName(normalized),
  };
};

const normalizeOpenWeatherLocation = (item, idx = 0) => {
  const latitude = toFiniteNumberOrNull(item?.lat, 4);
  const longitude = toFiniteNumberOrNull(item?.lon, 4);
  if (latitude === null || longitude === null || !item?.name) {
    return null;
  }

  const normalized = {
    id: `ow_${idx}_${latitude}_${longitude}`,
    name: String(item.name),
    district: null,
    state: item.state ? String(item.state) : null,
    country: item.country ? String(item.country) : null,
    latitude,
    longitude,
    elevationMeters: null,
    timezone: null,
  };

  return {
    ...normalized,
    displayName: formatDisplayName(normalized),
  };
};

/**
 * Searches matching locations using server-side geocoding API.
 */
export const searchLocations = async (rawQuery, options = {}) => {
  const query = sanitizeLocationQuery(rawQuery);
  if (query.length < 2) {
    throw new AppError(
      'Please enter at least 2 characters to search for a location.',
      400,
      'INVALID_LOCATION_QUERY'
    );
  }

  const limit = Math.min(Math.max(Number(options.limit) || 5, 1), 10);
  const provider = resolveActiveProvider(options);

  if (provider.providerId === 'openweathermap') {
    const url = `${OPENWEATHER_GEO_DIRECT_URL}?q=${encodeURIComponent(query)}&limit=${limit}&appid=${encodeURIComponent(provider.apiKey)}`;
    const payload = await fetchJsonWithTimeout(url, {
      fetchFn: options.fetchFn,
      timeoutMs: options.timeoutMs,
      providerName: provider.providerLabel,
    });

    if (!Array.isArray(payload)) {
      throw new AppError(
        'OpenWeatherMap geocoding returned an invalid format.',
        502,
        'WEATHER_MALFORMED_RESPONSE'
      );
    }

    const locations = payload
      .map((item, idx) => normalizeOpenWeatherLocation(item, idx))
      .filter(Boolean);

    return {
      query,
      provider: provider.providerLabel,
      locations,
    };
  }

  const url = `${OPEN_METEO_GEO_URL}?name=${encodeURIComponent(query)}&count=${limit}&language=en&format=json`;
  const payload = await fetchJsonWithTimeout(url, {
    fetchFn: options.fetchFn,
    timeoutMs: options.timeoutMs,
    providerName: provider.providerLabel,
  });

  if (payload.error) {
    throw new AppError(
      payload.reason || 'Open-Meteo geocoding error.',
      502,
      'WEATHER_PROVIDER_ERROR'
    );
  }

  const rawResults = Array.isArray(payload.results) ? payload.results : [];
  const locations = rawResults.map(normalizeOpenMeteoLocation).filter(Boolean);

  return {
    query,
    provider: provider.providerLabel,
    locations,
  };
};

/**
 * Best-effort reverse geocoding for GPS coordinates without failing weather retrieval.
 */
export const reverseGeocodeCoordinates = async (lat, lon, options = {}) => {
  const coords = validateCoordinates(lat, lon);
  const provider = resolveActiveProvider(options);

  try {
    if (provider.providerId === 'openweathermap') {
      const url = `${OPENWEATHER_GEO_REVERSE_URL}?lat=${coords.lat}&lon=${coords.lon}&limit=1&appid=${encodeURIComponent(provider.apiKey)}`;
      const data = await fetchJsonWithTimeout(url, {
        fetchFn: options.fetchFn,
        timeoutMs: 4000,
        providerName: provider.providerLabel,
      });
      const first = Array.isArray(data) ? normalizeOpenWeatherLocation(data[0], 0) : null;
      if (first) {
        return first;
      }
    } else if (options.enableReverseGeocode !== false) {
      const url = `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${coords.lat}&lon=${coords.lon}&zoom=10&addressdetails=1`;
      const data = await fetchJsonWithTimeout(url, {
        fetchFn: options.fetchFn,
        timeoutMs: 4000,
        headers: {
          'User-Agent': 'KisanVision-AI/1.0 (Agricultural Weather Intelligence)',
        },
        providerName: 'OpenStreetMap Nominatim',
      });
      const addr = data?.address || {};
      const name =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        addr.state_district ||
        null;
      const district = addr.state_district || addr.county || null;
      const state = addr.state || null;
      const country = addr.country || null;

      if (name || state || country) {
        const resolved = {
          id: `gps_${coords.lat}_${coords.lon}`,
          name: name || state || 'Selected Coordinates',
          district,
          state,
          country,
          latitude: coords.lat,
          longitude: coords.lon,
          elevationMeters: null,
          timezone: null,
        };
        return {
          ...resolved,
          displayName: formatDisplayName(resolved),
        };
      }
    }
  } catch {
    // Best-effort location naming must never block weather retrieval
  }

  return {
    id: `gps_${coords.lat}_${coords.lon}`,
    name: `Coordinates (${coords.lat}, ${coords.lon})`,
    district: null,
    state: null,
    country: null,
    latitude: coords.lat,
    longitude: coords.lon,
    elevationMeters: null,
    timezone: null,
    displayName: `Coordinates (${coords.lat}, ${coords.lon})`,
  };
};

/**
 * Normalizes Open-Meteo current + 5-day forecast response.
 */
export const normalizeOpenMeteoWeatherPayload = (payload, locationMeta = null) => {
  if (!payload || typeof payload !== 'object' || !payload.current || !payload.daily) {
    throw new AppError(
      'Weather provider response is missing required meteorological fields.',
      502,
      'WEATHER_MALFORMED_RESPONSE'
    );
  }

  const currentRaw = payload.current;
  const dailyRaw = payload.daily;
  const dates = Array.isArray(dailyRaw.time) ? dailyRaw.time : [];

  if (dates.length === 0) {
    throw new AppError(
      'Weather provider response did not include forecast days.',
      502,
      'WEATHER_MALFORMED_RESPONSE'
    );
  }

  const latitude = toFiniteNumberOrNull(payload.latitude, 4) ?? locationMeta?.latitude ?? null;
  const longitude = toFiniteNumberOrNull(payload.longitude, 4) ?? locationMeta?.longitude ?? null;
  const currentCode = decodeWmoWeatherCode(currentRaw.weather_code);

  // Prefer explicit rain when provided; fall back to total precipitation if rain key omitted
  const currentRainfallMm =
    toFiniteNumberOrNull(currentRaw.rain, 2) ??
    toFiniteNumberOrNull(currentRaw.precipitation, 2);

  const current = {
    temperatureC: toFiniteNumberOrNull(currentRaw.temperature_2m, 1),
    feelsLikeC: toFiniteNumberOrNull(currentRaw.apparent_temperature, 1),
    humidityPercent: toFiniteNumberOrNull(currentRaw.relative_humidity_2m, 0),
    windSpeedKmh: toFiniteNumberOrNull(currentRaw.wind_speed_10m, 1),
    windDirectionDeg: toFiniteNumberOrNull(currentRaw.wind_direction_10m, 0),
    rainfallMm: currentRainfallMm,
    pressureHpa: toFiniteNumberOrNull(currentRaw.surface_pressure, 1),
    cloudCoverPercent: toFiniteNumberOrNull(currentRaw.cloud_cover, 0),
    weatherCode: toFiniteNumberOrNull(currentRaw.weather_code, 0),
    condition: currentCode.condition,
    description: currentCode.description,
    observedAt: currentRaw.time ? String(currentRaw.time) : null,
  };

  const forecast = dates.slice(0, 5).map((dateStr, idx) => {
    const code = Array.isArray(dailyRaw.weather_code) ? dailyRaw.weather_code[idx] : null;
    const decoded = decodeWmoWeatherCode(code);
    return {
      date: String(dateStr),
      tempMinC: Array.isArray(dailyRaw.temperature_2m_min)
        ? toFiniteNumberOrNull(dailyRaw.temperature_2m_min[idx], 1)
        : null,
      tempMaxC: Array.isArray(dailyRaw.temperature_2m_max)
        ? toFiniteNumberOrNull(dailyRaw.temperature_2m_max[idx], 1)
        : null,
      humidityAvgPercent: Array.isArray(dailyRaw.relative_humidity_2m_mean)
        ? toFiniteNumberOrNull(dailyRaw.relative_humidity_2m_mean[idx], 0)
        : null,
      rainfallMm: Array.isArray(dailyRaw.precipitation_sum)
        ? toFiniteNumberOrNull(dailyRaw.precipitation_sum[idx], 2)
        : null,
      rainProbabilityPercent: Array.isArray(dailyRaw.precipitation_probability_max)
        ? toFiniteNumberOrNull(dailyRaw.precipitation_probability_max[idx], 0)
        : null,
      windSpeedMaxKmh: Array.isArray(dailyRaw.wind_speed_10m_max)
        ? toFiniteNumberOrNull(dailyRaw.wind_speed_10m_max[idx], 1)
        : null,
      weatherCode: toFiniteNumberOrNull(code, 0),
      condition: decoded.condition,
      description: decoded.description,
    };
  });

  const resolvedLocation = {
    name: locationMeta?.name || `Coordinates (${latitude}, ${longitude})`,
    district: locationMeta?.district || null,
    state: locationMeta?.state || null,
    country: locationMeta?.country || null,
    latitude,
    longitude,
    elevationMeters: toFiniteNumberOrNull(payload.elevation, 0) ?? locationMeta?.elevationMeters ?? null,
    timezone: payload.timezone ? String(payload.timezone) : locationMeta?.timezone || null,
    displayName:
      locationMeta?.displayName ||
      formatDisplayName({
        name: locationMeta?.name,
        district: locationMeta?.district,
        state: locationMeta?.state,
        country: locationMeta?.country,
        latitude,
        longitude,
      }),
  };

  return {
    provider: 'Open-Meteo',
    fetchedAt: new Date().toISOString(),
    location: resolvedLocation,
    current,
    forecast,
  };
};

/**
 * Normalizes OpenWeatherMap current + 3-hourly 5-day forecast payloads.
 */
export const normalizeOpenWeatherPayloads = (
  currentPayload,
  forecastPayload,
  locationMeta = null
) => {
  if (
    !currentPayload ||
    typeof currentPayload !== 'object' ||
    !currentPayload.main ||
    !forecastPayload ||
    typeof forecastPayload !== 'object' ||
    !Array.isArray(forecastPayload.list)
  ) {
    throw new AppError(
      'OpenWeatherMap response is missing required meteorological fields.',
      502,
      'WEATHER_MALFORMED_RESPONSE'
    );
  }

  const weatherItem = Array.isArray(currentPayload.weather) ? currentPayload.weather[0] : null;
  const windMs = toFiniteNumberOrNull(currentPayload.wind?.speed);
  const rain1h = toFiniteNumberOrNull(currentPayload.rain?.['1h'], 2);
  const rain3h = toFiniteNumberOrNull(currentPayload.rain?.['3h'], 2);
  const hasExplicitRainField = currentPayload.rain !== undefined;
  const currentRainfallMm = rain1h ?? rain3h ?? (hasExplicitRainField ? 0 : null);

  const latitude =
    toFiniteNumberOrNull(currentPayload.coord?.lat, 4) ?? locationMeta?.latitude ?? null;
  const longitude =
    toFiniteNumberOrNull(currentPayload.coord?.lon, 4) ?? locationMeta?.longitude ?? null;

  const current = {
    temperatureC: toFiniteNumberOrNull(currentPayload.main.temp, 1),
    feelsLikeC: toFiniteNumberOrNull(currentPayload.main.feels_like, 1),
    humidityPercent: toFiniteNumberOrNull(currentPayload.main.humidity, 0),
    windSpeedKmh: windMs !== null ? toFiniteNumberOrNull(windMs * 3.6, 1) : null,
    windDirectionDeg: toFiniteNumberOrNull(currentPayload.wind?.deg, 0),
    rainfallMm: currentRainfallMm,
    pressureHpa: toFiniteNumberOrNull(currentPayload.main.pressure, 1),
    cloudCoverPercent: toFiniteNumberOrNull(currentPayload.clouds?.all, 0),
    weatherCode: toFiniteNumberOrNull(weatherItem?.id, 0),
    condition: weatherItem?.main ? String(weatherItem.main) : null,
    description: weatherItem?.description ? String(weatherItem.description) : null,
    observedAt: currentPayload.dt
      ? new Date(Number(currentPayload.dt) * 1000).toISOString()
      : null,
  };

  // Group 3-hourly OpenWeatherMap slots by YYYY-MM-DD
  const byDate = new Map();
  for (const slot of forecastPayload.list) {
    const dtTxt = typeof slot?.dt_txt === 'string' ? slot.dt_txt : '';
    const dateKey = dtTxt.slice(0, 10) || (slot?.dt ? new Date(slot.dt * 1000).toISOString().slice(0, 10) : '');
    if (!dateKey) continue;
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey).push(slot);
  }

  const forecast = Array.from(byDate.entries())
    .slice(0, 5)
    .map(([date, slots]) => {
      const mins = slots
        .map((s) => toFiniteNumberOrNull(s.main?.temp_min ?? s.main?.temp))
        .filter((v) => v !== null);
      const maxs = slots
        .map((s) => toFiniteNumberOrNull(s.main?.temp_max ?? s.main?.temp))
        .filter((v) => v !== null);
      const hums = slots
        .map((s) => toFiniteNumberOrNull(s.main?.humidity))
        .filter((v) => v !== null);
      const pops = slots
        .map((s) => toFiniteNumberOrNull(s.pop))
        .filter((v) => v !== null);
      const winds = slots
        .map((s) => toFiniteNumberOrNull(s.wind?.speed))
        .filter((v) => v !== null);
      const rains = slots
        .map((s) => toFiniteNumberOrNull(s.rain?.['3h']))
        .filter((v) => v !== null);

      const midSlot = slots[Math.floor(slots.length / 2)] || slots[0];
      const cond = Array.isArray(midSlot?.weather) ? midSlot.weather[0] : null;

      return {
        date,
        tempMinC: mins.length > 0 ? toFiniteNumberOrNull(Math.min(...mins), 1) : null,
        tempMaxC: maxs.length > 0 ? toFiniteNumberOrNull(Math.max(...maxs), 1) : null,
        humidityAvgPercent:
          hums.length > 0
            ? Math.round(hums.reduce((a, b) => a + b, 0) / hums.length)
            : null,
        rainfallMm:
          rains.length > 0
            ? toFiniteNumberOrNull(
                rains.reduce((a, b) => a + b, 0),
                2
              )
            : null,
        rainProbabilityPercent:
          pops.length > 0 ? Math.round(Math.max(...pops) * 100) : null,
        windSpeedMaxKmh:
          winds.length > 0 ? toFiniteNumberOrNull(Math.max(...winds) * 3.6, 1) : null,
        weatherCode: toFiniteNumberOrNull(cond?.id, 0),
        condition: cond?.main ? String(cond.main) : null,
        description: cond?.description ? String(cond.description) : null,
      };
    });

  const cityName = locationMeta?.name || currentPayload.name || forecastPayload.city?.name || null;
  const country =
    locationMeta?.country || currentPayload.sys?.country || forecastPayload.city?.country || null;

  const resolvedLocation = {
    name: cityName || `Coordinates (${latitude}, ${longitude})`,
    district: locationMeta?.district || null,
    state: locationMeta?.state || null,
    country,
    latitude,
    longitude,
    elevationMeters: locationMeta?.elevationMeters ?? null,
    timezone: locationMeta?.timezone || null,
    displayName:
      locationMeta?.displayName ||
      formatDisplayName({
        name: cityName,
        district: locationMeta?.district,
        state: locationMeta?.state,
        country,
        latitude,
        longitude,
      }),
  };

  return {
    provider: 'OpenWeatherMap',
    fetchedAt: new Date().toISOString(),
    location: resolvedLocation,
    current,
    forecast,
  };
};

/**
 * Fetches actual current weather and 5-day forecast for verified coordinates.
 */
export const fetchWeatherByCoordinates = async (lat, lon, options = {}) => {
  const coords = validateCoordinates(lat, lon);
  const provider = resolveActiveProvider(options);

  let locationMeta = options.locationMeta || null;
  if (!locationMeta) {
    locationMeta = await reverseGeocodeCoordinates(coords.lat, coords.lon, options);
  }

  if (provider.providerId === 'openweathermap') {
    const currentUrl = `${OPENWEATHER_CURRENT_URL}?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${encodeURIComponent(provider.apiKey)}`;
    const forecastUrl = `${OPENWEATHER_FORECAST_URL}?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${encodeURIComponent(provider.apiKey)}`;

    const [currentPayload, forecastPayload] = await Promise.all([
      fetchJsonWithTimeout(currentUrl, {
        fetchFn: options.fetchFn,
        timeoutMs: options.timeoutMs,
        providerName: provider.providerLabel,
      }),
      fetchJsonWithTimeout(forecastUrl, {
        fetchFn: options.fetchFn,
        timeoutMs: options.timeoutMs,
        providerName: provider.providerLabel,
      }),
    ]);

    return normalizeOpenWeatherPayloads(currentPayload, forecastPayload, locationMeta);
  }

  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean',
    forecast_days: '5',
    timezone: 'auto',
  });

  const url = `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
  const payload = await fetchJsonWithTimeout(url, {
    fetchFn: options.fetchFn,
    timeoutMs: options.timeoutMs,
    providerName: provider.providerLabel,
  });

  if (payload.error) {
    throw new AppError(
      payload.reason || 'Open-Meteo returned a forecast error.',
      502,
      'WEATHER_PROVIDER_ERROR'
    );
  }

  return normalizeOpenMeteoWeatherPayload(payload, locationMeta);
};

/**
 * Resolves a location name via geocoding and fetches real weather for the best match.
 */
export const fetchWeatherByQuery = async (rawQuery, options = {}) => {
  const geoResult = await searchLocations(rawQuery, { ...options, limit: options.limit || 5 });
  if (!geoResult.locations || geoResult.locations.length === 0) {
    throw new AppError(
      `No matching locations found for "${geoResult.query}". Try a nearby town, city, or district.`,
      404,
      'LOCATION_NOT_FOUND'
    );
  }

  const selectedLocation = geoResult.locations[0];
  const weatherBundle = await fetchWeatherByCoordinates(
    selectedLocation.latitude,
    selectedLocation.longitude,
    {
      ...options,
      locationMeta: selectedLocation,
    }
  );

  return {
    ...weatherBundle,
    matchingLocations: geoResult.locations,
  };
};
