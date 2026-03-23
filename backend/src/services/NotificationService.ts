import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError';
import { getIo } from '../socket/socketServer';
import { SOCKET_EVENTS } from '../socket/socketEvents';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type NotificationDto = {
  id: number;
  user_id: number;
  content: string | null;
  link_url: string | null;
  is_read: boolean | null;
  created_at: Date | null;
};

export type NotificationListDto = {
  items: NotificationDto[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
};

function normalizePagination(input: { page?: number; limit?: number }): { page: number; limit: number; skip: number } {
  const normalizedPage = Number.isFinite(input.page) && (input.page ?? 0) > 0
    ? Math.floor(input.page as number)
    : DEFAULT_PAGE;

  const normalizedLimit = Number.isFinite(input.limit) && (input.limit ?? 0) > 0
    ? Math.min(Math.floor(input.limit as number), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const skip = (normalizedPage - 1) * normalizedLimit;
  return { page: normalizedPage, limit: normalizedLimit, skip };
}

function emitNotificationNew(userId: number, payload: NotificationDto): void {
  try {
    getIo().to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
  } catch {
    // Socket có thể chưa init (ví dụ unit test/migration) -> không fail request.
  }
}

export class NotificationService {
  async createNotification(userId: number, content: string, linkUrl?: string): Promise<NotificationDto> {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new ValidationError('Nội dung thông báo không được để trống');
    }

    const created = await prisma.notification.create({
      data: {
        user_id: userId,
        content: normalizedContent,
        link_url: linkUrl ?? null,
      },
    });

    emitNotificationNew(userId, created);
    return created;
  }

  async getNotifications(
    userId: number,
    params: { page?: number; limit?: number },
  ): Promise<NotificationListDto> {
    const { page, limit, skip } = normalizePagination(params);

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: { user_id: userId },
      }),
      prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
    };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
  }

  async markAsRead(notificationId: number, userId: number): Promise<NotificationDto> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, user_id: true },
    });

    if (!notification) {
      throw new NotFoundError('Không tìm thấy thông báo');
    }
    if (notification.user_id !== userId) {
      throw new ForbiddenError('Bạn không có quyền cập nhật thông báo này');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
  }

  async markAllAsRead(userId: number): Promise<{ updatedCount: number }> {
    const result = await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    return { updatedCount: result.count };
  }
}

export const notificationService = new NotificationService();

