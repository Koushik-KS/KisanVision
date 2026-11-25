/**
 * Send a standardized success JSON response.
 */
export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a standardized error JSON response.
 */
export const sendError = (res, { statusCode = 500, message = 'Internal server error', error = null } = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};
