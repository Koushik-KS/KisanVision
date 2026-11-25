import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from './constants';

export const validateImageFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file format (${file.name}). Please upload JPG, JPEG, PNG, or WEBP.`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds the 10 MB size limit.`,
    };
  }

  return { valid: true, error: null };
};

export const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};
