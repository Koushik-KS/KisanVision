import { sendError } from '../utils/apiResponse.js';

/**
 * Handle unmatched API routes with a structured 404 response.
 */
export const notFoundHandler = (req, res) => {
  return sendError(res, {
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: { code: 'ROUTE_NOT_FOUND' },
  });
};

/**
 * Centralized Express error-handling middleware.
 */
export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  return sendError(res, {
    statusCode,
    message,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
    },
  });
};
