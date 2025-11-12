import { Router } from 'express';
import { getAllAlerts, resolveAlert, createAlert } from '../controllers/alertController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, getAllAlerts);
router.patch('/:id/resolve', authMiddleware, resolveAlert);
router.post('/', authMiddleware, createAlert);

export default router;
