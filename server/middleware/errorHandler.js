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
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred';
  let code = err.code || 'INTERNAL_ERROR';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const firstError = Object.values(err.errors || {})[0];
    message = firstError?.message || 'Validation failed';
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const duplicateField = Object.keys(err.keyPattern || {})[0] || 'field';
    message =
      duplicateField === 'email'
        ? 'An account with this email already exists.'
        : `Duplicate value for ${duplicateField}.`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid identifier format.';
  } else if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  return sendError(res, {
    statusCode,
    message,
    error: {
      code,
    },
  });
};
