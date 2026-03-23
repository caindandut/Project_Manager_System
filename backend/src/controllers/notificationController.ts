import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/AppError';
import { parseRequestId } from '../utils/parseRequestId';
import { notificationService } from '../services/NotificationService';

export const getNotifications = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const query = req.validatedQuery ?? req.query;
  const data = await notificationService.getNotifications(userId, query);

  res.status(200).json({
    success: true,
    message: 'Lấy danh sách thông báo thành công',
    data,
  });
});

export const getUnreadCount = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const unreadCount = await notificationService.getUnreadCount(userId);
  res.status(200).json({
    success: true,
    message: 'Lấy số lượng thông báo chưa đọc thành công',
    data: { unread_count: unreadCount },
  });
});

export const markAsRead = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const notificationId = parseRequestId(req.params.id, 'ID thông báo');
  const data = await notificationService.markAsRead(notificationId, userId);

  res.status(200).json({
    success: true,
    message: 'Đánh dấu thông báo đã đọc thành công',
    data,
  });
});

export const markAllAsRead = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const data = await notificationService.markAllAsRead(userId);
  res.status(200).json({
    success: true,
    message: 'Đánh dấu tất cả thông báo đã đọc thành công',
    data,
  });
});

