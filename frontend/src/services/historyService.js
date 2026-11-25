import api from './api';

export const fetchHistory = async (params = {}) => {
  const cleanParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value;
    }
  });

  const response = await api.get('/history', {
    params: cleanParams,
    timeout: 20000,
  });
  return response.data;
};

export const fetchHistoryDetail = async (analysisType, id) => {
  const path = analysisType ? `/history/${analysisType}/${id}` : `/history/${id}`;
  const response = await api.get(path, {
    timeout: 20000,
  });
  return response.data;
};

export const deleteHistoryRecord = async (analysisType, id) => {
  const path = analysisType ? `/history/${analysisType}/${id}` : `/history/${id}`;
  const response = await api.delete(path, {
    timeout: 30000,
  });
  return response.data;
};
