import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive authentication endpoints (login and registration).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Rate limiter for Gemini AI endpoints to protect quota and prevent abuse.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many AI analysis requests. Please wait a few minutes and try again.',
      error: {
        code: 'AI_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Rate limiter for weather lookup and weather-intelligence endpoints.
 */
export const weatherRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many weather requests. Please wait briefly and try again.',
      error: {
        code: 'WEATHER_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Rate limiter for authenticated History retrieval and deletion endpoints.
 */
export const historyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many history requests. Please wait briefly and try again.',
      error: {
        code: 'HISTORY_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Rate limiter for authenticated analytics and dashboard endpoints.
 */
export const analyticsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many analytics requests. Please wait briefly and try again.',
      error: {
        code: 'ANALYTICS_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});
