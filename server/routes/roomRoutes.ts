import { Router } from 'express';
import { 
  getAllRooms, 
  getRoomDetails, 
  updateRoomStatus,
  assignCustomerToRoom,
  assignRoomWithProducts,
  scanProductIn,
  scanProductOut,
  addProductToRoom,
  searchProducts,
  getPendingScanOutItems
} from '../controllers/roomController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, getAllRooms);
router.get('/:id', authMiddleware, getRoomDetails);
router.patch('/:id/status', authMiddleware, updateRoomStatus);
router.post('/assign', authMiddleware, assignRoomWithProducts); // New unified endpoint
router.post('/:id/assign-customer', authMiddleware, assignCustomerToRoom);
router.post('/:id/scan-in', authMiddleware, scanProductIn);
router.post('/:id/scan-out', authMiddleware, scanProductOut);
router.post('/:id/add-product', authMiddleware, addProductToRoom);

// Product search endpoint (not room-specific)
router.get('/products/search', authMiddleware, searchProducts);

// Get pending scan-out items by customer card ID or room
router.get('/pending-scan-out', authMiddleware, getPendingScanOutItems);

export default router;
