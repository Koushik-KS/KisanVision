import { SUPPORTED_CROPS } from '../config/constants.js';
import env from '../config/env.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Return server health status and platform configuration summary (non-sensitive).
 */
export const getHealth = (req, res) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'KisanVision AI backend is healthy',
    data: {
      status: 'ok',
      service: 'KisanVision AI API',
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      supportedCrops: SUPPORTED_CROPS,
      capabilities: {
        databaseConfigured: Boolean(env.mongodbUri),
        aiConfigured: Boolean(env.geminiApiKey),
        storageConfigured: Boolean(
          env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret
        ),
        weatherConfigured: Boolean(env.weatherApiKey),
      },
    },
  });
};
