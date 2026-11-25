import api from './api';

export const validateCropImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/ai/validate-crop', formData, {
    timeout: 45000,
  });
  return response.data;
};

export const runDiseaseDetection = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/ai/disease-detection', formData, {
    timeout: 70000,
  });
  return response.data;
};

export const fetchDiseaseHistory = async (limit = 20) => {
  const response = await api.get(`/ai/disease-detection?limit=${limit}`);
  return response.data;
};

export const runPlantIdentification = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/ai/plant-identification', formData, {
    timeout: 70000,
  });
  return response.data;
};

export const fetchPlantIdentificationHistory = async (limit = 20) => {
  const response = await api.get(`/ai/plant-identification?limit=${limit}`);
  return response.data;
};

export const runMultiImageAnalysis = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await api.post('/ai/multi-image-analysis', formData, {
    timeout: 180000,
  });
  return response.data;
};

export const fetchMultiImageHistory = async (limit = 20) => {
  const response = await api.get(`/ai/multi-image-analysis?limit=${limit}`);
  return response.data;
};
