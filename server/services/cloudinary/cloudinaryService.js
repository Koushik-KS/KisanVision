import env from '../../config/env.js';

/**
 * Checks whether Cloudinary credentials are configured in server environment variables.
 * Full Cloudinary asset upload/deletion pipeline will be expanded in later phases.
 */
export const isCloudinaryConfigured = () => {
  return Boolean(
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret
  );
};

export const uploadImageIfConfigured = async () => {
  if (!isCloudinaryConfigured()) {
    return { imageUrl: null, imagePublicId: null };
  }
  return { imageUrl: null, imagePublicId: null };
};
