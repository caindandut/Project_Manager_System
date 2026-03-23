import { message_type } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError';
import { getIo } from '../socket/socketServer';
import { SOCKET_EVENTS } from '../socket/socketEvents';
import { notificationService } from './NotificationService';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type SendMessageInput = {
  content?: string | null;
  type?: message_type | null;
  filePath?: string | null;
};

type PaginationInput = {
  page?: number;
  limit?: number;
};

function normalizePagination(params: PaginationInput): { page: number; limit: number; skip: number } {
  const page = Number.isFinite(params.page) && (params.page ?? 0) > 0
    ? Math.floor(params.page as number)
    : DEFAULT_PAGE;
  const limit = Number.isFinite(params.limit) && (params.limit ?? 0) > 0
    ? Math.min(Math.floor(params.limit as number), MAX_LIMIT)
    : DEFAULT_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
}

function normalizeContent(input: string | null | undefined): string | null {
  if (input == null) return null;
  const v = input.trim();
  return v === '' ? null : v;
}

function emitChatSend(groupId: number, payload: unknown): void {
  try {
    getIo().to(`chat:${groupId}`).emit(SOCKET_EVENTS.CHAT_SEND, payload);
  } catch {
    // Socket chưa sẵn sàng (ví dụ test/unit) — không làm fail logic REST.
  }
}

export class ChatService {
  /**
   * Tạo nhóm chat cho dự án (auto/manual) và thêm thành viên.
   * Mặc định thêm toàn bộ member của dự án; nếu truyền memberIds sẽ lọc subset.
   */
  async createChatGroup(projectId: number, name: string | null, memberIds: number[] = []) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, project_name: true },
    });
    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    const memberships = await prisma.projectmember.findMany({
      where: { project_id: projectId },
      select: { user_id: true },
    });
    if (!memberships.length) {
      throw new ValidationError('Dự án chưa có thành viên để tạo nhóm chat');
    }

    const allMemberIds = memberships.map((m) => m.user_id);
    const requestedIds = Array.from(new Set(memberIds));

    if (requestedIds.length && requestedIds.some((id) => !allMemberIds.includes(id))) {
      throw new ValidationError('Có thành viên không thuộc dự án');
    }

    const finalMemberIds = requestedIds.length ? requestedIds : allMemberIds;
    if (finalMemberIds.length < 2) {
      throw new ValidationError('Nhóm chat cần ít nhất 2 thành viên');
    }

    const groupName = name == null ? null : name.trim() || null;

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.chatgroup.create({
        data: {
          project_id: projectId,
          group_name: groupName,
        },
      });

      await tx.chatgroupmember.createMany({
        data: finalMemberIds.map((userId) => ({
          chat_group_id: created.id,
          user_id: userId,
        })),
      });

      return created;
    });

    return prisma.chatgroup.findUnique({
      where: { id: group.id },
      include: {
        chatgroupmember: {
          include: {
            user: {
              select: { id: true, full_name: true, email: true, avatar_path: true, is_online: true },
            },
          },
        },
      },
    });
  }

  async getChatGroupsByUser(userId: number) {
    const memberships = await prisma.chatgroupmember.findMany({
      where: { user_id: userId },
      include: {
        chatgroup: {
          include: {
            project: { select: { id: true, project_name: true, color_code: true } },
            chatgroupmember: {
              include: {
                user: {
                  select: { id: true, full_name: true, email: true, avatar_path: true, is_online: true },
                },
              },
            },
            message: {
              orderBy: { sent_at: 'desc' },
              take: 1,
              include: {
                user_message_sender_idTouser: {
                  select: { id: true, full_name: true, email: true, avatar_path: true },
                },
              },
            },
          },
        },
      },
      orderBy: { joined_at: 'desc' },
    });

    return memberships.map((m) => ({
      id: m.chatgroup.id,
      project_id: m.chatgroup.project_id,
      group_name: m.chatgroup.group_name,
      group_image: m.chatgroup.group_image,
      project: m.chatgroup.project,
      members: m.chatgroup.chatgroupmember.map((cm) => ({
        user_id: cm.user_id,
        joined_at: cm.joined_at,
        user: cm.user,
      })),
      last_message: m.chatgroup.message[0] || null,
    }));
  }

  async getOrCreateDirectChat(userId: number, targetUserId: number) {
    if (userId === targetUserId) {
      throw new ValidationError('Không thể tạo cuộc trò chuyện với chính mình');
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true },
    });
    if (!target || target.status !== 'Active') {
      throw new NotFoundError('Không tìm thấy người dùng đích');
    }

    const directCandidates = await prisma.chatgroup.findMany({
      where: { group_name: null },
      include: {
        chatgroupmember: {
          select: { user_id: true },
        },
      },
    });

    const existing = directCandidates.find((g) => {
      if (g.chatgroupmember.length !== 2) return false;
      const ids = g.chatgroupmember.map((m) => m.user_id);
      return ids.includes(userId) && ids.includes(targetUserId);
    });

    const groupId = existing
      ? existing.id
      : (
        await prisma.$transaction(async (tx) => {
          const created = await tx.chatgroup.create({
            data: { group_name: null, project_id: null },
          });
          await tx.chatgroupmember.createMany({
            data: [
              { chat_group_id: created.id, user_id: userId },
              { chat_group_id: created.id, user_id: targetUserId },
            ],
          });
          return created;
        })
      ).id;

    return prisma.chatgroup.findUnique({
      where: { id: groupId },
      include: {
        chatgroupmember: {
          include: {
            user: {
              select: { id: true, full_name: true, email: true, avatar_path: true, is_online: true },
            },
          },
        },
      },
    });
  }

  async sendMessage(groupId: number, senderId: number, input: SendMessageInput) {
    const content = normalizeContent(input.content);
    const type = input.type ?? 'Text';
    const filePath = input.filePath?.trim() || null;

    if (!content && !filePath) {
      throw new ValidationError('Tin nhắn không được để trống');
    }

    const membership = await prisma.chatgroupmember.findUnique({
      where: { chat_group_id_user_id: { chat_group_id: groupId, user_id: senderId } },
      select: { chat_group_id: true },
    });
    if (!membership) {
      throw new ForbiddenError('Bạn không thuộc nhóm chat này');
    }

    const group = await prisma.chatgroup.findUnique({
      where: { id: groupId },
      include: {
        project: { select: { id: true, project_name: true } },
        chatgroupmember: {
          include: {
            user: {
              select: { id: true, full_name: true, email: true, is_online: true },
            },
          },
        },
      },
    });
    if (!group) {
      throw new NotFoundError('Không tìm thấy nhóm chat');
    }

    const msg = await prisma.message.create({
      data: {
        chat_group_id: groupId,
        sender_id: senderId,
        content,
        type,
        file_path: filePath,
      },
      include: {
        user_message_sender_idTouser: {
          select: { id: true, full_name: true, email: true, avatar_path: true },
        },
      },
    });

    emitChatSend(groupId, msg);

    const sender = group.chatgroupmember.find((m) => m.user_id === senderId)?.user;
    const senderName = sender?.full_name || sender?.email || 'Một thành viên';
    const targetOfflineUsers = group.chatgroupmember
      .filter((m) => m.user_id !== senderId && m.user?.is_online === false)
      .map((m) => m.user_id);

    if (targetOfflineUsers.length) {
      const title = group.group_name || group.project?.project_name || 'nhóm chat';
      await Promise.all(
        targetOfflineUsers.map((uid) =>
          notificationService.createNotification(uid, `${senderName} gửi tin nhắn mới trong "${title}"`),
        ),
      );
    }

    return msg;
  }

  async getMessages(groupId: number, userId: number, params: PaginationInput) {
    const { page, limit, skip } = normalizePagination(params);
    const membership = await prisma.chatgroupmember.findUnique({
      where: { chat_group_id_user_id: { chat_group_id: groupId, user_id: userId } },
      select: { chat_group_id: true },
    });
    if (!membership) {
      throw new ForbiddenError('Bạn không thuộc nhóm chat này');
    }

    const [total, items] = await Promise.all([
      prisma.message.count({ where: { chat_group_id: groupId } }),
      prisma.message.findMany({
        where: { chat_group_id: groupId },
        orderBy: { sent_at: 'desc' },
        skip,
        take: limit,
        include: {
          user_message_sender_idTouser: {
            select: { id: true, full_name: true, email: true, avatar_path: true, is_online: true },
          },
        },
      }),
    ]);

    return { items, total, page, limit };
  }

  async markAsRead(groupId: number, userId: number): Promise<{ updatedCount: number }> {
    const membership = await prisma.chatgroupmember.findUnique({
      where: { chat_group_id_user_id: { chat_group_id: groupId, user_id: userId } },
      select: { chat_group_id: true },
    });
    if (!membership) {
      throw new ForbiddenError('Bạn không thuộc nhóm chat này');
    }

    const result = await prisma.message.updateMany({
      where: {
        chat_group_id: groupId,
        sender_id: { not: userId },
        OR: [{ receiver_id: userId }, { receiver_id: null }],
        is_read: false,
      },
      data: { is_read: true },
    });
    return { updatedCount: result.count };
  }
}

export const chatService = new ChatService();

