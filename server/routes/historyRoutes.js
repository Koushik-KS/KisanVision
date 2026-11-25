import { Router } from 'express';
import {
  deleteHistoryRecord,
  getHistoryDetail,
  getUnifiedHistory,
} from '../controllers/historyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { historyRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(protect, historyRateLimiter);

router.get('/', getUnifiedHistory);
router.get('/:type/:id', getHistoryDetail);
router.get('/:id', getHistoryDetail);
router.delete('/:type/:id', deleteHistoryRecord);
router.delete('/:id', deleteHistoryRecord);

export default router;
