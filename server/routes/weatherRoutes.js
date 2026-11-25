import { Router } from 'express';
import {
  generateCropRecommendations,
  getCurrentWeather,
  getWeatherForecast,
  getWeatherIntelligence,
  searchWeatherLocations,
} from '../controllers/weatherController.js';
import { protect } from '../middleware/authMiddleware.js';
import { weatherRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(protect, weatherRateLimiter);

router.get('/locations', searchWeatherLocations);
router.get('/current', getCurrentWeather);
router.get('/forecast', getWeatherForecast);
router.get('/intelligence', getWeatherIntelligence);
router.post('/recommendations', generateCropRecommendations);

export default router;
