import { projectmember_role, project_status } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../utils/AppError';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
  UpdateMemberRoleInput,
} from '../validators/projectValidator';

export class ProjectService {
  async createProject(input: CreateProjectInput, userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });
    if (!user?.company_id) {
      throw new ValidationError('Người dùng chưa thuộc công ty nào');
    }

    const duplicate = await prisma.project.findFirst({
      where: {
        company_id: user.company_id,
        project_name: input.project_name,
        status: { not: 'Archived' },
      },
    });
    if (duplicate) {
      throw new ValidationError('Tên dự án đã tồn tại trong công ty');
    }

    if (input.start_date && input.end_date) {
      if (new Date(input.end_date) <= new Date(input.start_date)) {
        throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }

    const project = await prisma.project.create({
      data: {
        company_id: user.company_id,
        manager_id: userId,
        project_name: input.project_name,
        description: input.description ?? null,
        start_date: input.start_date ? new Date(input.start_date) : null,
        end_date: input.end_date ? new Date(input.end_date) : null,
        color_code: input.color_code ?? '#2563EB',
        label: input.label ?? null,
        status: 'Active',
      },
    });

    await prisma.projectmember.create({
      data: {
        project_id: project.id,
        user_id: userId,
        role: 'Manager',
      },
    });

    if (input.member_ids?.length) {
      const validMembers = await prisma.user.findMany({
        where: {
          id: { in: input.member_ids },
          company_id: user.company_id,
          status: 'Active',
        },
        select: { id: true },
      });

      const memberData = validMembers
        .filter((m) => m.id !== userId)
        .map((m) => ({
          project_id: project.id,
          user_id: m.id,
          role: 'Member' as projectmember_role,
        }));

      if (memberData.length) {
        await prisma.projectmember.createMany({ data: memberData });
      }
    }

    await prisma.activitylog.create({
      data: {
        user_id: userId,
        action: 'CREATE_PROJECT',
        details: `Tạo dự án "${project.project_name}"`,
        target_table: 'project',
        target_id: project.id,
      },
    });

    return this.getProjectById(project.id, userId);
  }

  async getAllProjects(userId: number, role: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });

    let whereClause: any = {};

    if (role === 'Admin') {
      whereClause = { company_id: user?.company_id };
    } else {
      whereClause = {
        company_id: user?.company_id,
        projectmember: { some: { user_id: userId } },
      };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, full_name: true, avatar_path: true },
        },
        projectmember: {
          include: {
            user: {
              select: { id: true, full_name: true, avatar_path: true },
            },
          },
          take: 5,
        },
        _count: {
          select: { projectmember: true, taskgroup: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const result = await Promise.all(
      projects.map(async (p) => {
        const stats = await this.getProjectStats(p.id);
        return {
          id: p.id,
          project_name: p.project_name,
          description: p.description,
          start_date: p.start_date,
          end_date: p.end_date,
          color_code: p.color_code,
          label: p.label,
          status: p.status,
          created_at: p.created_at,
          manager: p.user,
          members: p.projectmember.map((pm) => ({
            ...pm.user,
            role: pm.role,
          })),
          member_count: p._count.projectmember,
          stats,
        };
      }),
    );

    return result;
  }

  async getProjectById(projectId: number, userId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: { id: true, full_name: true, email: true, avatar_path: true },
        },
        company: {
          select: { id: true, company_name: true },
        },
        projectmember: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                avatar_path: true,
                role: true,
              },
            },
          },
          orderBy: { joined_at: 'asc' },
        },
        _count: {
          select: { taskgroup: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isMember = project.projectmember.some((pm) => pm.user_id === userId);
    if (requester?.role !== 'Admin' && !isMember) {
      throw new ForbiddenError('Bạn không phải thành viên của dự án này');
    }

    const stats = await this.getProjectStats(projectId);

    return {
      id: project.id,
      project_name: project.project_name,
      description: project.description,
      start_date: project.start_date,
      end_date: project.end_date,
      color_code: project.color_code,
      label: project.label,
      status: project.status,
      created_at: project.created_at,
      manager: project.user,
      company: project.company,
      members: project.projectmember.map((pm) => ({
        ...pm.user,
        project_role: pm.role,
        joined_at: pm.joined_at,
      })),
      task_group_count: project._count.taskgroup,
      stats,
    };
  }

  async updateProject(projectId: number, input: UpdateProjectInput, userId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, manager_id: true, project_name: true, company_id: true },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    await this.assertManagerOrAdmin(projectId, userId);

    if (input.start_date && input.end_date) {
      if (new Date(input.end_date) <= new Date(input.start_date)) {
        throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }

    if (input.project_name && input.project_name !== project.project_name) {
      const duplicate = await prisma.project.findFirst({
        where: {
          company_id: project.company_id,
          project_name: input.project_name,
          status: { not: 'Archived' },
          id: { not: projectId },
        },
      });
      if (duplicate) {
        throw new ValidationError('Tên dự án đã tồn tại trong công ty');
      }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.project_name !== undefined && { project_name: input.project_name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.start_date !== undefined && {
          start_date: input.start_date ? new Date(input.start_date) : null,
        }),
        ...(input.end_date !== undefined && {
          end_date: input.end_date ? new Date(input.end_date) : null,
        }),
        ...(input.color_code !== undefined && { color_code: input.color_code }),
        ...(input.label !== undefined && { label: input.label }),
        ...(input.status !== undefined && { status: input.status as project_status }),
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: userId,
        action: 'UPDATE_PROJECT',
        details: `Cập nhật dự án "${updated.project_name}"`,
        target_table: 'project',
        target_id: projectId,
      },
    });

    return this.getProjectById(projectId, userId);
  }

  async deleteProject(projectId: number, userId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, project_name: true, status: true },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    await this.assertManagerOrAdmin(projectId, userId);

    if (project.status === 'Archived') {
      throw new ValidationError('Dự án đã được lưu trữ trước đó');
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'Archived' },
    });

    await prisma.activitylog.create({
      data: {
        user_id: userId,
        action: 'ARCHIVE_PROJECT',
        details: `Lưu trữ dự án "${project.project_name}"`,
        target_table: 'project',
        target_id: projectId,
      },
    });

    return { id: projectId };
  }

  async getProjectMembers(projectId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    const members = await prisma.projectmember.findMany({
      where: { project_id: projectId },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_path: true,
            role: true,
            is_online: true,
          },
        },
      },
      orderBy: { joined_at: 'asc' },
    });

    return members.map((m) => ({
      ...m.user,
      project_role: m.role,
      joined_at: m.joined_at,
    }));
  }

  async addProjectMember(projectId: number, input: AddMemberInput, actorId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, company_id: true, project_name: true },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    await this.assertManagerOrAdmin(projectId, actorId);

    const targetUser = await prisma.user.findUnique({
      where: { id: input.user_id },
      select: { id: true, company_id: true, status: true, full_name: true },
    });
    if (!targetUser) throw new NotFoundError('Không tìm thấy người dùng');
    if (targetUser.company_id !== project.company_id) {
      throw new ValidationError('Người dùng không thuộc cùng công ty');
    }
    if (targetUser.status !== 'Active') {
      throw new ValidationError('Chỉ có thể thêm người dùng đang hoạt động');
    }

    const existing = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: { project_id: projectId, user_id: input.user_id },
      },
    });
    if (existing) {
      throw new ValidationError('Người dùng đã là thành viên của dự án');
    }

    const role = input.role ?? 'Member';

    if (role === 'Manager') {
      const currentManager = await prisma.projectmember.findFirst({
        where: { project_id: projectId, role: 'Manager' },
      });
      if (currentManager) {
        throw new ValidationError(
          'Dự án đã có Manager. Hãy chuyển quyền Manager trước khi thêm Manager mới',
        );
      }
    }

    await prisma.projectmember.create({
      data: {
        project_id: projectId,
        user_id: input.user_id,
        role: role as projectmember_role,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'ADD_PROJECT_MEMBER',
        details: `Thêm ${targetUser.full_name ?? 'user'} vào dự án "${project.project_name}" với vai trò ${role}`,
        target_table: 'projectmember',
        target_id: projectId,
      },
    });

    return this.getProjectMembers(projectId);
  }

  async removeProjectMember(projectId: number, targetUserId: number, actorId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, project_name: true },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    await this.assertManagerOrAdmin(projectId, actorId);

    const member = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: { project_id: projectId, user_id: targetUserId },
      },
      include: {
        user: { select: { full_name: true } },
      },
    });
    if (!member) throw new NotFoundError('Người dùng không phải thành viên dự án');

    if (member.role === 'Manager') {
      throw new ForbiddenError(
        'Không thể xóa Manager khỏi dự án. Hãy chuyển quyền Manager cho người khác trước',
      );
    }

    await prisma.projectmember.delete({
      where: {
        project_id_user_id: { project_id: projectId, user_id: targetUserId },
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'REMOVE_PROJECT_MEMBER',
        details: `Xóa ${member.user.full_name ?? 'user'} khỏi dự án "${project.project_name}"`,
        target_table: 'projectmember',
        target_id: projectId,
      },
    });

    return this.getProjectMembers(projectId);
  }

  async updateMemberRole(
    projectId: number,
    targetUserId: number,
    input: UpdateMemberRoleInput,
    actorId: number,
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, project_name: true },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    await this.assertManagerOrAdmin(projectId, actorId);

    const member = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: { project_id: projectId, user_id: targetUserId },
      },
      include: {
        user: { select: { full_name: true } },
      },
    });
    if (!member) throw new NotFoundError('Người dùng không phải thành viên dự án');

    const newRole = input.role as projectmember_role;

    if (newRole === 'Manager') {
      await prisma.projectmember.updateMany({
        where: { project_id: projectId, role: 'Manager' },
        data: { role: 'Member' },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { manager_id: targetUserId },
      });
    }

    await prisma.projectmember.update({
      where: {
        project_id_user_id: { project_id: projectId, user_id: targetUserId },
      },
      data: { role: newRole },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'UPDATE_MEMBER_ROLE',
        details: `Đổi vai trò ${member.user.full_name ?? 'user'} thành ${newRole} trong dự án "${project.project_name}"`,
        target_table: 'projectmember',
        target_id: projectId,
      },
    });

    return this.getProjectMembers(projectId);
  }

  async getProjectStats(projectId: number) {
    const tasks = await prisma.task.findMany({
      where: {
        taskgroup: { project_id: projectId },
        is_archived: false,
      },
      select: { status: true, deadline: true },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'InProgress').length;
    const now = new Date();
    const overdue = tasks.filter(
      (t) => t.deadline && new Date(t.deadline) < now && t.status !== 'Completed',
    ).length;

    return {
      total_tasks: total,
      completed_tasks: completed,
      in_progress_tasks: inProgress,
      overdue_tasks: overdue,
      completion_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  private async assertManagerOrAdmin(projectId: number, userId: number): Promise<void> {
    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (requester?.role === 'Admin') return;

    const membership = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: { project_id: projectId, user_id: userId },
      },
    });

    if (!membership || membership.role !== 'Manager') {
      throw new ForbiddenError('Chỉ Admin hoặc Manager của dự án mới có quyền thực hiện thao tác này');
    }
  }
}

export const projectService = new ProjectService();
