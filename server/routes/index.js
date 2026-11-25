import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import aiRoutes from './aiRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import historyRoutes from './historyRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/weather', weatherRoutes);
router.use('/history', historyRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
