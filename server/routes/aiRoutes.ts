import { Router } from 'express';
import { aiHealth, assignRoom, roomsStatus, predictDuration, detectAnomaly } from '../controllers/aiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Public health for ops visibility (keep unauthenticated)
router.get('/health', aiHealth);

// Protected proxies (require platform auth)
router.post('/assign-room', authMiddleware, assignRoom);
router.get('/rooms/status', authMiddleware, roomsStatus);
router.post('/predict-duration', authMiddleware, predictDuration);
router.post('/detect-anomaly', authMiddleware, detectAnomaly);

export default router;


