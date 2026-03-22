import { projectmember_role, project_status, project_priority } from '@prisma/client';
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
import { companyService } from './CompanyService';
import { Project as ProjectDomain } from '../domain/entities/Project';

/** Lưu DB: không lưu chuỗi rỗng; null = không có nhãn. */
function projectLabelToDb(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const t = value.trim();
  return t === '' ? null : t;
}

export class ProjectService {
  async createProject(input: CreateProjectInput, userId: number) {
    const companyId = await this.ensureUserCompany(userId);

    const duplicate = await prisma.project.findFirst({
      where: {
        company_id: companyId,
        project_name: input.project_name,
        status: { not: 'Archived' },
      },
    });
    if (duplicate) {
      throw new ValidationError('Tên dự án đã tồn tại trong công ty');
    }

    ProjectDomain.assertDateOrder(input.start_date, input.end_date);

    const project = await prisma.project.create({
      data: {
        company_id: companyId,
        manager_id: userId,
        project_name: input.project_name,
        description: input.description ?? null,
        start_date: input.start_date ? new Date(input.start_date) : null,
        end_date: input.end_date ? new Date(input.end_date) : null,
        color_code: input.color_code ?? '#2563EB',
        label: projectLabelToDb(input.label),
        priority: (input.priority as project_priority) ?? 'Medium',
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
          company_id: companyId,
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
    const companyId = await this.ensureUserCompany(userId);
    let whereClause: any = {};

    if (role === 'Admin') {
      whereClause = { company_id: companyId };
    } else {
      whereClause = {
        company_id: companyId,
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
          priority: p.priority,
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
      priority: project.priority,
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
      select: {
        id: true,
        manager_id: true,
        project_name: true,
        company_id: true,
        start_date: true,
        end_date: true,
      },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    await this.assertManagerOrAdmin(projectId, userId);

    const effectiveStart =
      input.start_date !== undefined ? input.start_date : project.start_date;
    const effectiveEnd = input.end_date !== undefined ? input.end_date : project.end_date;
    ProjectDomain.assertDateOrder(effectiveStart, effectiveEnd);

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
        ...(input.label !== undefined && { label: projectLabelToDb(input.label) }),
        ...(input.priority !== undefined && { priority: input.priority as project_priority }),
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

  /**
   * Người có thể thêm vào dự án: Active, cùng company_id với dự án, chưa trong project.
   * Admin hoặc Manager dự án mới gọi được (không dùng GET /users — route đó chỉ Admin).
   */
  async getMemberCandidates(projectId: number, actorId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, company_id: true },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    await this.assertManagerOrAdmin(projectId, actorId);

    if (project.company_id == null) {
      return [];
    }

    const existing = await prisma.projectmember.findMany({
      where: { project_id: projectId },
      select: { user_id: true },
    });
    const excludeIds = existing.map((e) => e.user_id);

    const users = await prisma.user.findMany({
      where: {
        company_id: project.company_id,
        status: 'Active',
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
      },
      orderBy: [{ full_name: 'asc' }, { email: 'asc' }],
    });

    return users;
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

  private async ensureUserCompany(userId: number): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, company_id: true },
    });

    if (!user) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    if (user.company_id) {
      return user.company_id;
    }

    const company = await companyService.getCompany();

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { company_id: company.id },
      select: { company_id: true },
    });

    return updated.company_id as number;
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
