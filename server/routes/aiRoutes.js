import { Router } from 'express';
import {
  analyzeBatch,
  detectDisease,
  getDiseaseAnalyses,
  getDiseaseAnalysisById,
  getMultiImageAnalyses,
  getMultiImageAnalysisById,
  getPlantIdentificationById,
  getPlantIdentifications,
  identifyPlant,
  validateCrop,
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import {
  uploadBatchImages,
  uploadSingleImage,
  validateBatchImages,
  validateUploadedImage,
} from '../middleware/uploadMiddleware.js';

const router = Router();

router.post(
  '/validate-crop',
  protect,
  aiRateLimiter,
  uploadSingleImage('image'),
  validateUploadedImage,
  validateCrop
);

router.post(
  '/disease-detection',
  protect,
  aiRateLimiter,
  uploadSingleImage('image'),
  validateUploadedImage,
  detectDisease
);

router.get('/disease-detection', protect, getDiseaseAnalyses);
router.get('/disease-detection/:id', protect, getDiseaseAnalysisById);

router.post(
  '/plant-identification',
  protect,
  aiRateLimiter,
  uploadSingleImage('image'),
  validateUploadedImage,
  identifyPlant
);

router.get('/plant-identification', protect, getPlantIdentifications);
router.get('/plant-identification/:id', protect, getPlantIdentificationById);

router.post(
  '/multi-image-analysis',
  protect,
  aiRateLimiter,
  uploadBatchImages('images', 5),
  validateBatchImages,
  analyzeBatch
);

router.get('/multi-image-analysis', protect, getMultiImageAnalyses);
router.get('/multi-image-analysis/:id', protect, getMultiImageAnalysisById);

export default router;
