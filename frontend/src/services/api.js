import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to reach KisanVision AI server';
    return Promise.reject(new Error(message));
  }
);

export default api;
