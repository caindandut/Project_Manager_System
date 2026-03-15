import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/authorizeMiddleware';
import {
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  verifyInviteToken,
  acceptInvite,
} from '../controllers/userController';

const router: Router = express.Router();

// Public: kiểm tra link mời có còn hợp lệ (chưa dùng, chưa hết hạn)
router.get('/verify-invite', verifyInviteToken);
// Public: nhân viên chấp nhận lời mời
router.post('/accept-invite', acceptInvite);

// Các route phía dưới yêu cầu đăng nhập
router.use(protect);

// Chỉ Admin mới được truy cập quản lý user
router.get('/', authorizeRoles('Admin'), getAllUsers);
router.post('/', authorizeRoles('Admin'), createUser);
router.put('/:id/role', authorizeRoles('Admin'), updateUserRole);
router.put('/:id/status', authorizeRoles('Admin'), updateUserStatus);
router.delete('/:id', authorizeRoles('Admin'), deleteUser);

export default router;
