import api from './api';

export const fetchAnalyticsOverview = async (params = {}) => {
  const response = await api.get('/analytics/overview', {
    params,
    timeout: 20000,
  });
  return response.data;
};

export const fetchCropAnalytics = async () => {
  const response = await api.get('/analytics/crops', {
    timeout: 15000,
  });
  return response.data;
};

export const fetchDiseaseAnalytics = async () => {
  const response = await api.get('/analytics/diseases', {
    timeout: 15000,
  });
  return response.data;
};

export const fetchActivityAnalytics = async (params = {}) => {
  const response = await api.get('/analytics/activity', {
    params,
    timeout: 15000,
  });
  return response.data;
};

export const fetchProfileAnalyticsSummary = async () => {
  const response = await api.get('/analytics/profile-summary', {
    timeout: 20000,
  });
  return response.data;
};
