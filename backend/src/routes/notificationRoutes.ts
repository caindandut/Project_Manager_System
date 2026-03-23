import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from '../controllers/notificationController';
import { notificationsQuerySchema } from '../validators/notificationValidator';

const router: Router = express.Router();

router.use(protect);

router.get('/notifications', validate(notificationsQuerySchema, 'query'), getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.put('/notifications/:id/read', markAsRead);
router.put('/notifications/read-all', markAllAsRead);

export default router;

