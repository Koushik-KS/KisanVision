import axios from 'axios';
import { AUTH_TOKEN_STORAGE_KEY } from '../utils/constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let onUnauthorizedCallback = null;

export const setOnUnauthorized = (callback) => {
  onUnauthorizedCallback = callback;
};

export const getStoredToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota/availability errors
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthCredentialEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/password');

    if (status === 401 && !isAuthCredentialEndpoint && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to reach KisanVision AI server';
    return Promise.reject(new Error(message));
  }
);

export default api;
