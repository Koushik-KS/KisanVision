import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from './AppError.js';

const getJwtSecret = () => {
  if (!env.jwtSecret) {
    throw new AppError(
      'JWT_SECRET is not configured on the server.',
      500,
      'AUTH_CONFIG_ERROR'
    );
  }
  return env.jwtSecret;
};

/**
 * Sign a JWT token containing only userId and tokenVersion.
 */
export const signAuthToken = (user) => {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion ?? 0,
    },
    secret,
    {
      expiresIn: env.jwtExpiresIn || '7d',
    }
  );
};

/**
 * Verify a JWT token and return its decoded payload.
 */
export const verifyAuthToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};
