import { Router } from 'express';
import {
  createUnlockRequest,
  getUnlockRequests,
  approveUnlockRequest,
  rejectUnlockRequest,
  directUnlockRoom,
} from '../controllers/unlockController.js';
import { authMiddleware, managerOnly } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, createUnlockRequest);
router.post('/direct', authMiddleware, managerOnly, directUnlockRoom);
router.get('/', authMiddleware, getUnlockRequests);
router.patch('/:id/approve', authMiddleware, managerOnly, approveUnlockRequest);
router.patch('/:id/reject', authMiddleware, managerOnly, rejectUnlockRequest);

export default router;
