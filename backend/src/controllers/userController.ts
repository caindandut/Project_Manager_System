import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, UnauthorizedError } from '../utils/AppError';

function parseUserId(req: Request): number {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = parseInt(rawId, 10);
  if (isNaN(userId)) {
    throw new ValidationError('ID người dùng không hợp lệ');
  }
  return userId;
}

export const getProfile = asyncHandler(async (req: Request | any, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('Chưa đăng nhập');
  const data = await userService.getProfile(userId);
  res.status(200).json({
    success: true,
    message: 'Lấy thông tin hồ sơ thành công',
    data: {
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      avatar_path: data.avatar_path,
      authProvider: data.authProvider,
    },
  });
});

export const updateProfile = asyncHandler(async (req: Request | any, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('Chưa đăng nhập');
  const data = await userService.updateProfile(userId, req.body);
  res.status(200).json({
    success: true,
    message: 'Cập nhật hồ sơ thành công',
    data: {
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      avatar_path: data.avatar_path,
      authProvider: data.authProvider,
    },
  });
});

export const changePassword = asyncHandler(async (req: Request | any, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('Chưa đăng nhập');
  await userService.changePassword(userId, req.body);
  res.status(200).json({
    success: true,
    message: 'Đổi mật khẩu thành công',
    data: null,
  });
});

export const getAllUsers = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    success: true,
    message: 'Lấy danh sách người dùng thành công',
    data: users,
  });
});

export const createUser = asyncHandler(async (req: Request | any, res: Response): Promise<void> => {
  const result = await userService.createUser(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: 'Đã tạo lời mời và gửi tới email (console log)',
    data: result,
  });
});

export const updateUserRole = asyncHandler(async (req: Request | any, res: Response): Promise<void> => {
  const userId = parseUserId(req);
  const result = await userService.updateUserRole(userId, req.body, req.user.id);
  res.status(200).json({
    success: true,
    message: `Cập nhật role thành ${req.body.role} thành công`,
    data: result,
  });
});

export const verifyInviteToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const result = await userService.verifyInviteToken(token);
  res.status(200).json({
    success: true,
    valid: result.valid,
    message: result.message,
    data: result.data ?? null,
  });
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await userService.acceptInvite(req.body);
  res.status(200).json({
    success: true,
    message: 'Kích hoạt tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.',
    data: result,
  });
});

export const updateUserStatus = asyncHandler(async (req: Request | any, res: Response): Promise<void> => {
  const userId = parseUserId(req);
  const result = await userService.updateUserStatus(userId, req.body, req.user.id);
  res.status(200).json({
    success: true,
    message: `${req.body.status === 'Active' ? 'Mở khóa' : 'Khóa'} tài khoản thành công`,
    data: result,
  });
});

export const deleteUser = asyncHandler(async (req: Request | any, res: Response): Promise<void> => {
  const userId = parseUserId(req);
  const result = await userService.deleteUser(userId, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Đã xóa tài khoản thành công',
    data: result,
  });
});
