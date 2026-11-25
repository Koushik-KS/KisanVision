import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { verifyAuthToken } from '../utils/jwt.js';

/**
 * Extract Bearer token from Authorization header if formatted properly.
 */
export const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return null;
  }
  return parts[1];
};

/**
 * Require valid JWT authentication and attach safe user data to req.user.
 */
export const protect = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next(
        new AppError('Authentication required. Please log in.', 401, 'AUTH_REQUIRED')
      );
    }

    let decoded;
    try {
      decoded = verifyAuthToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(
          new AppError(
            'Your session has expired. Please log in again.',
            401,
            'TOKEN_EXPIRED'
          )
        );
      }
      if (err.name === 'JsonWebTokenError') {
        return next(
          new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN')
        );
      }
      return next(err);
    }

    if (!decoded?.userId) {
      return next(
        new AppError('Invalid authentication token payload.', 401, 'INVALID_TOKEN')
      );
    }

    const user = await User.findById(decoded.userId).select('+tokenVersion');
    if (!user) {
      return next(
        new AppError(
          'User associated with this token no longer exists.',
          401,
          'USER_NOT_FOUND'
        )
      );
    }

    if ((user.tokenVersion ?? 0) !== (decoded.tokenVersion ?? 0)) {
      return next(
        new AppError(
          'Session is no longer valid. Please log in again.',
          401,
          'SESSION_INVALIDATED'
        )
      );
    }

    req.user = user.toSafeObject();
    req.userDoc = user;
    return next();
  } catch (err) {
    return next(err);
  }
};
