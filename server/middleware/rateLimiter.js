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
