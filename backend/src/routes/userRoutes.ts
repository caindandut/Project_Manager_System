import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/authorizeMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  verifyInviteToken,
  acceptInvite,
  getProfile,
  updateProfile,
  changePassword,
} from '../controllers/userController';
import {
  createUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  acceptInviteSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../validators/userValidator';

const router: Router = express.Router();

// Public: kiểm tra link mời có còn hợp lệ (chưa dùng, chưa hết hạn)
router.get('/verify-invite', verifyInviteToken);
// Public: nhân viên chấp nhận lời mời
router.post('/accept-invite', validate(acceptInviteSchema), acceptInvite);

// Các route phía dưới yêu cầu đăng nhập
router.use(protect);

// Hồ sơ cá nhân & đổi mật khẩu (mọi role)
router.get('/profile', getProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.put('/change-password', validate(changePasswordSchema), changePassword);

// Chỉ Admin mới được truy cập quản lý user
router.get('/', authorizeRoles('Admin'), getAllUsers);
router.post('/', authorizeRoles('Admin'), validate(createUserSchema), createUser);
router.put('/:id/role', authorizeRoles('Admin'), validate(updateUserRoleSchema), updateUserRole);
router.put('/:id/status', authorizeRoles('Admin'), validate(updateUserStatusSchema), updateUserStatus);
router.delete('/:id', authorizeRoles('Admin'), deleteUser);

export default router;
