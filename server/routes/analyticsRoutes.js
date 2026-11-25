import { Router } from 'express';
import {
  getActivityAnalytics,
  getAnalyticsOverview,
  getCropAnalytics,
  getDiseaseAnalytics,
  getProfileAnalyticsSummary,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { analyticsRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(protect, analyticsRateLimiter);

router.get('/', getAnalyticsOverview);
router.get('/overview', getAnalyticsOverview);
router.get('/crops', getCropAnalytics);
router.get('/diseases', getDiseaseAnalytics);
router.get('/activity', getActivityAnalytics);
router.get('/profile-summary', getProfileAnalyticsSummary);

export default router;
