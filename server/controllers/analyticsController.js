import { getUserAnalyticsBundle } from '../services/analytics/analyticsService.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';

const parseAnalyticsQueryParams = (query = {}) => {
  let days = 30;
  if (query.days !== undefined) {
    days = Number(query.days);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new AppError(
        'Query parameter "days" must be an integer between 1 and 365.',
        400,
        'INVALID_ANALYTICS_PARAMS'
      );
    }
  }

  let granularity = 'daily';
  if (query.granularity !== undefined) {
    const g = String(query.granularity).trim().toLowerCase();
    if (!['daily', 'monthly'].includes(g)) {
      throw new AppError(
        'Query parameter "granularity" must be "daily" or "monthly".',
        400,
        'INVALID_ANALYTICS_PARAMS'
      );
    }
    granularity = g;
  }

  let recentLimit = 6;
  if (query.recentLimit !== undefined) {
    recentLimit = Number(query.recentLimit);
    if (!Number.isInteger(recentLimit) || recentLimit < 1 || recentLimit > 25) {
      throw new AppError(
        'Query parameter "recentLimit" must be an integer between 1 and 25.',
        400,
        'INVALID_ANALYTICS_PARAMS'
      );
    }
  }

  return { days, granularity, recentLimit };
};

/**
 * GET /api/analytics/overview
 * Returns unified overview, crop analytics, disease analytics, activity timeline,
 * and recent activity scoped strictly to req.user.id.
 */
export const getAnalyticsOverview = async (req, res, next) => {
  try {
    const params = parseAnalyticsQueryParams(req.query);
    const analytics = await getUserAnalyticsBundle(req.user.id, params);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Analytics overview retrieved successfully.',
      data: analytics,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/analytics/crops
 */
export const getCropAnalytics = async (req, res, next) => {
  try {
    const analytics = await getUserAnalyticsBundle(req.user.id, {
      days: 30,
      recentLimit: 1,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Crop analytics retrieved successfully.',
      data: {
        overview: analytics.overview,
        cropAnalytics: analytics.cropAnalytics,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/analytics/diseases
 */
export const getDiseaseAnalytics = async (req, res, next) => {
  try {
    const analytics = await getUserAnalyticsBundle(req.user.id, {
      days: 30,
      recentLimit: 1,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Disease analytics retrieved successfully.',
      data: {
        overview: analytics.overview,
        diseaseAnalytics: analytics.diseaseAnalytics,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/analytics/activity
 */
export const getActivityAnalytics = async (req, res, next) => {
  try {
    const params = parseAnalyticsQueryParams(req.query);
    const analytics = await getUserAnalyticsBundle(req.user.id, params);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Activity analytics retrieved successfully.',
      data: {
        overview: analytics.overview,
        activityAnalytics: analytics.activityAnalytics,
        recentActivity: analytics.recentActivity,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/analytics/profile-summary
 * Returns authenticated user safe details alongside live MongoDB activity & chart analytics.
 */
export const getProfileAnalyticsSummary = async (req, res, next) => {
  try {
    const analytics = await getUserAnalyticsBundle(req.user.id, {
      days: 30,
      recentLimit: 6,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile summary and analytics retrieved successfully.',
      data: {
        user: req.user,
        ...analytics,
      },
    });
  } catch (err) {
    return next(err);
  }
};
