import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { signAuthToken, verifyAuthToken } from '../utils/jwt.js';
import { extractBearerToken } from '../middleware/authMiddleware.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_PROFILE_FIELDS = ['name', 'phone', 'location', 'avatar'];
const PROTECTED_PROFILE_FIELDS = ['email', 'password', 'role', '_id', 'id', 'tokenVersion'];

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const location = typeof req.body?.location === 'string' ? req.body.location.trim() : '';

    if (!name || !email || !password) {
      return next(
        new AppError('Name, email, and password are required.', 400, 'VALIDATION_ERROR')
      );
    }

    if (name.length < 2) {
      return next(
        new AppError('Name must be at least 2 characters.', 400, 'VALIDATION_ERROR')
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return next(
        new AppError('Please provide a valid email address.', 400, 'VALIDATION_ERROR')
      );
    }

    if (password.length < 6) {
      return next(
        new AppError('Password must be at least 6 characters.', 400, 'VALIDATION_ERROR')
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS')
      );
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      location,
    });

    const token = signAuthToken(user);

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Account registered successfully',
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return next(
        new AppError('Email and password are required.', 400, 'VALIDATION_ERROR')
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return next(
        new AppError('Please provide a valid email address.', 400, 'VALIDATION_ERROR')
      );
    }

    const user = await User.findOne({ email }).select('+password +tokenVersion');
    if (!user) {
      return next(
        new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS')
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(
        new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS')
      );
    }

    const token = signAuthToken(user);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Logged in successfully',
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/logout
 * Invalidates the active JWT session server-side via tokenVersion when a valid token is present.
 */
export const logout = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (token) {
      try {
        const decoded = verifyAuthToken(token);
        if (decoded?.userId) {
          await User.findByIdAndUpdate(decoded.userId, { $inc: { tokenVersion: 1 } });
        }
      } catch (_err) {
        // Ignore expired/invalid tokens during logout so client sign-out always succeeds cleanly.
      }
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Logged out successfully',
      data: null,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = (req, res) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Authenticated user retrieved',
    data: {
      user: req.user,
    },
  });
};

/**
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const bodyKeys = Object.keys(req.body || {});
    const attemptedProtected = bodyKeys.filter((key) =>
      PROTECTED_PROFILE_FIELDS.includes(key)
    );

    if (attemptedProtected.length > 0) {
      return next(
        new AppError(
          `Cannot modify protected field(s): ${attemptedProtected.join(', ')}`,
          400,
          'PROTECTED_FIELD_MODIFICATION'
        )
      );
    }

    const updates = {};
    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        const rawValue = req.body[field];
        if (typeof rawValue !== 'string') {
          return next(
            new AppError(`${field} must be a text string.`, 400, 'VALIDATION_ERROR')
          );
        }
        updates[field] = rawValue.trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return next(
        new AppError('No valid profile fields provided to update.', 400, 'VALIDATION_ERROR')
      );
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'name') && updates.name.length < 2) {
      return next(
        new AppError('Name must be at least 2 characters.', 400, 'VALIDATION_ERROR')
      );
    }

    if (updates.avatar) {
      let parsedUrl;
      try {
        parsedUrl = new URL(updates.avatar);
      } catch (_err) {
        return next(
          new AppError('Avatar must be a valid HTTP or HTTPS URL.', 400, 'VALIDATION_ERROR')
        );
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return next(
          new AppError('Avatar URL must use http or https.', 400, 'VALIDATION_ERROR')
        );
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.toSafeObject(),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * PUT /api/auth/password
 */
export const changePassword = async (req, res, next) => {
  try {
    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword =
      typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return next(
        new AppError(
          'Current password and new password are required.',
          400,
          'VALIDATION_ERROR'
        )
      );
    }

    if (newPassword.length < 6) {
      return next(
        new AppError(
          'New password must be at least 6 characters.',
          400,
          'VALIDATION_ERROR'
        )
      );
    }

    if (currentPassword === newPassword) {
      return next(
        new AppError(
          'New password must be different from your current password.',
          400,
          'VALIDATION_ERROR'
        )
      );
    }

    const user = await User.findById(req.user.id).select('+password +tokenVersion');
    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(
        new AppError('Current password is incorrect.', 401, 'INVALID_CURRENT_PASSWORD')
      );
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    const newToken = signAuthToken(user);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Password updated successfully',
      data: {
        user: user.toSafeObject(),
        token: newToken,
      },
    });
  } catch (err) {
    return next(err);
  }
};
