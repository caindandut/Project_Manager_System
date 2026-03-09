import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/authorizeMiddleware';
import {
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
} from '../controllers/userController';

const router: Router = express.Router();

// Tất cả route đều yêu cầu đăng nhập
router.use(protect);

// Chỉ Admin mới được truy cập quản lý user
router.get('/', authorizeRoles('Admin'), getAllUsers);
router.post('/', authorizeRoles('Admin'), createUser);
router.put('/:id/role', authorizeRoles('Admin'), updateUserRole);
router.put('/:id/status', authorizeRoles('Admin'), updateUserStatus);

export default router;
