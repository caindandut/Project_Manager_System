import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError';

const GROUP_NAME_MAX = 255;

export type TaskGroupAssigneeDto = {
  user_id: number;
  role: string | null;
  user: {
    id: number;
    full_name: string | null;
    email: string;
    avatar_path: string | null;
  };
};

export type TaskInGroupDto = {
  id: number;
  title: string;
  label: string | null;
  description: string | null;
  deadline: Date | null;
  priority: string | null;
  status: string | null;
  completion_percent: number | null;
  position: number | null;
  parent_task_id: number | null;
  created_at: Date | null;
  updated_at: Date | null;
  assignees: TaskGroupAssigneeDto[];
};

export type TaskGroupWithTasksDto = {
  id: number;
  project_id: number | null;
  group_name: string;
  position: number | null;
  tasks: TaskInGroupDto[];
};

/**
 * CRUD nhóm công việc (taskgroup) trong dự án — GĐ2 mục 2.1.
 * - Xem danh sách: mọi thành viên dự án (kể cả Viewer) + Admin cùng công ty.
 * - Tạo / sửa tên / sắp xếp: Admin, Manager, Member (không Viewer).
 * - Xóa nhóm: Admin hoặc Manager dự án (task con cascade theo Prisma).
 */
export class TaskGroupService {
  async createTaskGroup(projectId: number, name: string, actorId: number): Promise<TaskGroupWithTasksDto> {
    const groupName = name.trim();
    if (!groupName) {
      throw new ValidationError('Tên nhóm công việc không được để trống');
    }
    if (groupName.length > GROUP_NAME_MAX) {
      throw new ValidationError(`Tên nhóm tối đa ${GROUP_NAME_MAX} ký tự`);
    }

    await this.assertCanMutateTaskGroups(projectId, actorId);

    const maxRow = await prisma.taskgroup.aggregate({
      where: { project_id: projectId },
      _max: { position: true },
    });
    const nextPosition = (maxRow._max.position ?? -1) + 1;

    const created = await prisma.taskgroup.create({
      data: {
        project_id: projectId,
        group_name: groupName,
        position: nextPosition,
      },
    });

    return {
      id: created.id,
      project_id: created.project_id,
      group_name: created.group_name,
      position: created.position,
      tasks: [],
    };
  }

  async getTaskGroups(projectId: number, actorId: number): Promise<TaskGroupWithTasksDto[]> {
    await this.assertProjectAccess(projectId, actorId);

    const groups = await prisma.taskgroup.findMany({
      where: { project_id: projectId },
      orderBy: { position: 'asc' },
      include: {
        task: {
          where: { is_archived: false },
          orderBy: { position: 'asc' },
          include: {
            taskassignee: {
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    avatar_path: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return groups.map((g) => this.mapGroupToDto(g));
  }

  async updateTaskGroup(
    groupId: number,
    data: { group_name: string },
    actorId: number,
  ): Promise<TaskGroupWithTasksDto> {
    const groupName = data.group_name.trim();
    if (!groupName) {
      throw new ValidationError('Tên nhóm công việc không được để trống');
    }
    if (groupName.length > GROUP_NAME_MAX) {
      throw new ValidationError(`Tên nhóm tối đa ${GROUP_NAME_MAX} ký tự`);
    }

    const group = await prisma.taskgroup.findUnique({
      where: { id: groupId },
      select: { id: true, project_id: true },
    });
    if (!group || group.project_id == null) {
      throw new NotFoundError('Không tìm thấy nhóm công việc');
    }

    await this.assertCanMutateTaskGroups(group.project_id, actorId);

    const updated = await prisma.taskgroup.update({
      where: { id: groupId },
      data: { group_name: groupName },
      include: {
        task: {
          where: { is_archived: false },
          orderBy: { position: 'asc' },
          include: {
            taskassignee: {
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    avatar_path: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.mapGroupToDto(updated);
  }

  async deleteTaskGroup(groupId: number, actorId: number): Promise<void> {
    const group = await prisma.taskgroup.findUnique({
      where: { id: groupId },
      select: { id: true, project_id: true },
    });
    if (!group || group.project_id == null) {
      throw new NotFoundError('Không tìm thấy nhóm công việc');
    }

    await this.assertManagerOrAdmin(group.project_id, actorId);

    await prisma.taskgroup.delete({ where: { id: groupId } });
  }

  async reorderTaskGroups(projectId: number, orderedIds: number[], actorId: number): Promise<TaskGroupWithTasksDto[]> {
    await this.assertCanMutateTaskGroups(projectId, actorId);

    const existing = await prisma.taskgroup.findMany({
      where: { project_id: projectId },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((e) => e.id));

    if (existing.length === 0) {
      if (orderedIds.length > 0) {
        throw new ValidationError('Dự án chưa có nhóm công việc');
      }
      return this.getTaskGroups(projectId, actorId);
    }

    if (orderedIds.length !== existing.length) {
      throw new ValidationError('Số lượng nhóm không khớp với dự án');
    }

    const seen = new Set<number>();
    for (const id of orderedIds) {
      if (!existingSet.has(id)) {
        throw new ValidationError('Có nhóm không thuộc dự án hoặc không tồn tại');
      }
      if (seen.has(id)) {
        throw new ValidationError('Danh sách thứ tự không được trùng id');
      }
      seen.add(id);
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.taskgroup.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    return this.getTaskGroups(projectId, actorId);
  }

  // ─── Mapping ─────────────────────────────────────────────────────────────

  private mapGroupToDto(g: {
    id: number;
    project_id: number | null;
    group_name: string;
    position: number | null;
    task: Array<{
      id: number;
      title: string;
      label: string | null;
      description: string | null;
      deadline: Date | null;
      priority: string | null;
      status: string | null;
      completion_percent: number | null;
      position: number | null;
      parent_task_id: number | null;
      created_at: Date | null;
      updated_at: Date | null;
      taskassignee: Array<{
        user_id: number;
        role: string | null;
        user: {
          id: number;
          full_name: string | null;
          email: string;
          avatar_path: string | null;
        };
      }>;
    }>;
  }): TaskGroupWithTasksDto {
    return {
      id: g.id,
      project_id: g.project_id,
      group_name: g.group_name,
      position: g.position,
      tasks: g.task.map((t) => ({
        id: t.id,
        title: t.title,
        label: t.label,
        description: t.description,
        deadline: t.deadline,
        priority: t.priority,
        status: t.status,
        completion_percent: t.completion_percent,
        position: t.position,
        parent_task_id: t.parent_task_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
        assignees: t.taskassignee.map((ta) => ({
          user_id: ta.user_id,
          role: ta.role,
          user: ta.user,
        })),
      })),
    };
  }

  // ─── Quyền truy cập ─────────────────────────────────────────────────────

  /** Admin (cùng company) hoặc thành viên dự án — dùng cho đọc danh sách. */
  private async assertProjectAccess(projectId: number, actorId: number): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        company_id: true,
        projectmember: { select: { user_id: true } },
      },
    });
    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    const requester = await prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, company_id: true },
    });
    if (!requester) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    if (requester.role === 'Admin') {
      if (project.company_id == null || project.company_id !== requester.company_id) {
        throw new ForbiddenError('Bạn không có quyền truy cập dự án này');
      }
      return;
    }

    const isMember = project.projectmember.some((pm) => pm.user_id === actorId);
    if (!isMember) {
      throw new ForbiddenError('Bạn không phải thành viên của dự án này');
    }
  }

  /** Tạo / đổi tên / reorder nhóm — không cho Viewer. */
  private async assertCanMutateTaskGroups(projectId: number, actorId: number): Promise<void> {
    await this.assertProjectAccess(projectId, actorId);

    const requester = await prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });
    if (requester?.role === 'Admin') {
      return;
    }

    const membership = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: { project_id: projectId, user_id: actorId },
      },
      select: { role: true },
    });

    if (membership?.role === 'Viewer') {
      throw new ForbiddenError('Viewer không được tạo, sửa hoặc sắp xếp nhóm công việc');
    }
  }

  /** Xóa nhóm — chỉ Admin (cùng company) hoặc Manager dự án. */
  private async assertManagerOrAdmin(projectId: number, actorId: number): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, company_id: true },
    });
    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    const requester = await prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, company_id: true },
    });
    if (!requester) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    if (requester.role === 'Admin') {
      if (project.company_id == null || project.company_id !== requester.company_id) {
        throw new ForbiddenError('Bạn không có quyền truy cập dự án này');
      }
      return;
    }

    const membership = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: { project_id: projectId, user_id: actorId },
      },
      select: { role: true },
    });

    if (!membership || membership.role !== 'Manager') {
      throw new ForbiddenError('Chỉ Admin hoặc Manager của dự án mới có quyền xóa nhóm công việc');
    }
  }
}

export const taskGroupService = new TaskGroupService();
