import { prisma } from '../lib/prisma';
import { ValidationError, NotFoundError } from '../utils/AppError';
import { assertManagerOrAdminOnProject, assertProjectAccess } from './helpers/projectAccess';
import { getIo } from '../socket/socketServer';
import { SOCKET_EVENTS } from '../socket/socketEvents';
import { notificationService } from './NotificationService';

const userSelect = {
  id: true,
  full_name: true,
  email: true,
  avatar_path: true,
} as const;

export type CommentUserDto = {
  id: number;
  full_name: string | null;
  email: string;
  avatar_path: string | null;
};

export type CommentDto = {
  id: number;
  task_id: number | null;
  user_id: number | null;
  content: string | null;
  created_at: Date | null;
  user: CommentUserDto;
};

export type CommentsByTaskDto = {
  items: CommentDto[];
  total: number;
  page: number;
  limit: number;
};

function toCommentDto(row: {
  id: number;
  task_id: number | null;
  user_id: number | null;
  content: string | null;
  created_at: Date | null;
  user: CommentUserDto | null;
}): CommentDto {
  if (!row.user) {
    // Trường hợp dữ liệu lỗi/khuyết referential integrity (hiếm).
    throw new NotFoundError('Không tìm thấy người dùng của bình luận');
  }

  return {
    id: row.id,
    task_id: row.task_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    user: row.user,
  };
}

function emitCommentNew(projectId: number, payload: unknown): void {
  try {
    getIo().to(`project:${projectId}`).emit(SOCKET_EVENTS.COMMENT_NEW, payload);
  } catch {
    // Socket chưa init (vd: chạy migration/test). Bỏ qua để không fail REST.
  }
}

export class CommentService {
  async createComment(taskId: number, userId: number, content: string): Promise<CommentDto> {
    const normalized = content.trim();
    if (!normalized) {
      throw new ValidationError('Nội dung bình luận không được để trống');
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        taskgroup: { select: { project_id: true } },
      },
    });

    const projectId = task?.taskgroup?.project_id;
    if (!task || projectId == null) {
      throw new NotFoundError('Không tìm thấy công việc');
    }

    await assertProjectAccess(projectId, userId);

    const created = await prisma.comment.create({
      data: {
        task_id: taskId,
        user_id: userId,
        content: normalized,
      },
      include: { user: { select: userSelect } },
    });

    const dto = toCommentDto(created);
    emitCommentNew(projectId, dto);

    const actorName = dto.user.full_name || dto.user.email;
    const assignees = await prisma.taskassignee.findMany({
      where: { task_id: taskId },
      select: { user_id: true },
    });

    const recipientIds = Array.from(new Set(assignees.map((a) => a.user_id))).filter((id) => id !== userId);
    if (recipientIds.length) {
      const message = `${actorName} bình luận trên task "${task.title}"`;
      await Promise.all(recipientIds.map((recipientId) => notificationService.createNotification(recipientId, message)));
    }

    return dto;
  }

  async getCommentsByTask(
    taskId: number,
    params: { page?: number; limit?: number },
  ): Promise<CommentsByTaskDto> {
    const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Math.floor(params.limit) : 20;
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.comment.count({ where: { task_id: taskId } }),
      prisma.comment.findMany({
        where: { task_id: taskId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: { user: { select: userSelect } },
      }),
    ]);

    const items = rows.map((r) => toCommentDto(r as any));
    return { items, total, page, limit };
  }

  async updateComment(commentId: number, userId: number, newContent: string): Promise<CommentDto> {
    const normalized = newContent.trim();
    if (!normalized) {
      throw new ValidationError('Nội dung bình luận không được để trống');
    }

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        user_id: true,
        task: { select: { taskgroup: { select: { project_id: true } } } },
      },
    });

    const projectId = existing?.task?.taskgroup?.project_id;
    if (!existing || projectId == null) {
      throw new NotFoundError('Không tìm thấy bình luận');
    }

    await assertProjectAccess(projectId, userId);

    if (existing.user_id !== userId) {
      await assertManagerOrAdminOnProject(
        projectId,
        userId,
        'Chỉ chủ bình luận hoặc Admin/Manager của dự án mới có quyền sửa',
      );
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: normalized },
      include: { user: { select: userSelect } },
    });

    return toCommentDto(updated);
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        user_id: true,
        task: { select: { taskgroup: { select: { project_id: true } } } },
      },
    });

    const projectId = existing?.task?.taskgroup?.project_id;
    if (!existing || projectId == null) {
      throw new NotFoundError('Không tìm thấy bình luận');
    }

    await assertProjectAccess(projectId, userId);

    if (existing.user_id !== userId) {
      await assertManagerOrAdminOnProject(
        projectId,
        userId,
        'Chỉ chủ bình luận hoặc Admin/Manager của dự án mới có quyền xóa',
      );
    }

    await prisma.comment.delete({ where: { id: commentId } });
  }
}

export const commentService = new CommentService();

