import api from './api';

export const searchWeatherLocations = async (query, limit = 5) => {
  const response = await api.get('/weather/locations', {
    params: { q: query, limit },
    timeout: 15000,
  });
  return response.data;
};

export const fetchCurrentWeather = async (params) => {
  const response = await api.get('/weather/current', {
    params,
    timeout: 15000,
  });
  return response.data;
};

export const fetchWeatherForecast = async (params) => {
  const response = await api.get('/weather/forecast', {
    params,
    timeout: 15000,
  });
  return response.data;
};

export const fetchWeatherIntelligence = async (params) => {
  const response = await api.get('/weather/intelligence', {
    params,
    timeout: 20000,
  });
  return response.data;
};

export const generateWeatherRecommendations = async (payload) => {
  const response = await api.post('/weather/recommendations', payload, {
    timeout: 20000,
  });
  return response.data;
};
