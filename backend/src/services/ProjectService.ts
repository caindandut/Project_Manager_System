import { prisma } from '../lib/prisma';
import { user_role, project_status, projectmember_role, task_status } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError';

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  colorCode?: string | null;
  label?: string | null;
  companyId?: number | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  colorCode?: string | null;
  label?: string | null;
}

export interface AddMemberInput {
  userId: number;
  role?: projectmember_role | null;
}

export interface UpdateMemberRoleInput {
  userId: number;
  role: projectmember_role;
}

export class ProjectService {
  private async getCurrentUser(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        company_id: true,
        status: true,
      },
    });
    if (!user) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }
    if (user.status !== 'Active') {
      throw new ForbiddenError('Tài khoản của bạn không ở trạng thái Active');
    }
    if (!user.company_id) {
      throw new ValidationError('Người dùng chưa được gán vào công ty nào');
    }
    return user;
  }

  private assertCanManageProject(currentRole: user_role, projectManagerId: number | null, userId: number) {
    if (currentRole === 'Admin') return;
    if (currentRole === 'Director' && projectManagerId === userId) return;
    throw new ForbiddenError('Bạn không có quyền quản lý dự án này');
  }

  async createProject(data: CreateProjectInput, userId: number) {
    const currentUser = await this.getCurrentUser(userId);

    if (currentUser.role === 'Employee') {
      throw new ForbiddenError('Chỉ Admin hoặc Giám đốc mới có quyền tạo dự án');
    }

    const companyId = data.companyId ?? currentUser.company_id;
    if (!companyId) {
      throw new ValidationError('Dự án phải thuộc về một công ty hợp lệ');
    }

    const trimmedName = data.name?.trim();
    if (!trimmedName) {
      throw new ValidationError('Tên dự án không được để trống');
    }

    const existing = await prisma.project.findFirst({
      where: {
        company_id: companyId,
        project_name: trimmedName,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ValidationError('Tên dự án đã tồn tại trong công ty. Vui lòng chọn tên khác.');
    }

    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      throw new ValidationError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
    }

    const project = await prisma.project.create({
      data: {
        company_id: companyId,
        manager_id: userId,
        project_name: trimmedName,
        description: data.description ?? null,
        start_date: data.startDate ?? null,
        end_date: data.endDate ?? null,
        color_code: data.colorCode ?? undefined,
        label: data.label ?? undefined,
        status: project_status.Active,
      },
    });

    await prisma.projectmember.create({
      data: {
        project_id: project.id,
        user_id: userId,
        role: projectmember_role.Manager,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: userId,
        action: 'CREATE_PROJECT',
        details: `Tạo dự án mới: ${project.project_name}`,
        target_table: 'project',
        target_id: project.id,
      },
    });

    return project;
  }

  async getAllProjects(userId: number, role: user_role) {
    const currentUser = await this.getCurrentUser(userId);

    const baseSelect = {
      id: true,
      project_name: true,
      description: true,
      start_date: true,
      end_date: true,
      status: true,
      color_code: true,
      label: true,
      created_at: true,
      projectmember: {
        select: { user_id: true },
      },
      taskgroup: {
        select: {
          id: true,
          task: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    } as const;

    let projects;

    if (role === 'Admin') {
      projects = await prisma.project.findMany({
        where: { company_id: currentUser.company_id ?? undefined },
        select: baseSelect,
        orderBy: { created_at: 'desc' },
      });
    } else if (role === 'Director') {
      projects = await prisma.project.findMany({
        where: {
          company_id: currentUser.company_id ?? undefined,
          OR: [
            { manager_id: userId },
            {
              projectmember: {
                some: { user_id: userId },
              },
            },
          ],
        },
        select: baseSelect,
        orderBy: { created_at: 'desc' },
      });
    } else {
      projects = await prisma.project.findMany({
        where: {
          company_id: currentUser.company_id ?? undefined,
          projectmember: {
            some: { user_id: userId },
          },
        },
        select: baseSelect,
        orderBy: { created_at: 'desc' },
      });
    }

    return projects.map((p) => {
      const allTasks = p.taskgroup.flatMap((g) => g.task);
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter((t) => t.status === task_status.Completed).length;
      const overdueTasks = allTasks.filter((t) => t.status === task_status.Overdue).length;
      const completionPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      return {
        id: p.id,
        name: p.project_name,
        description: p.description,
        startDate: p.start_date,
        endDate: p.end_date,
        status: p.status,
        colorCode: p.color_code,
        label: p.label,
        createdAt: p.created_at,
        memberCount: p.projectmember.length,
        totalTasks,
        completedTasks,
        overdueTasks,
        completionPercent,
      };
    });
  }

  async getProjectById(id: number, userId: number) {
    const currentUser = await this.getCurrentUser(userId);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        projectmember: {
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
        taskgroup: {
          select: {
            id: true,
            group_name: true,
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                deadline: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    const isAdmin = currentUser.role === 'Admin';
    const isMember = project.projectmember.some((m) => m.user_id === userId);

    if (!isAdmin && !isMember) {
      throw new ForbiddenError('Bạn không có quyền xem dự án này');
    }

    return project;
  }

  async updateProject(id: number, data: UpdateProjectInput, userId: number) {
    const currentUser = await this.getCurrentUser(userId);

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        project_name: true,
        company_id: true,
        manager_id: true,
        start_date: true,
        end_date: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    this.assertCanManageProject(currentUser.role, project.manager_id, userId);

    const updateData: {
      project_name?: string;
      description?: string | null;
      start_date?: Date | null;
      end_date?: Date | null;
      color_code?: string | null;
      label?: string | null;
    } = {};

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new ValidationError('Tên dự án không được để trống');
      }
      if (trimmedName !== project.project_name) {
        const exists = await prisma.project.findFirst({
          where: {
            company_id: project.company_id,
            project_name: trimmedName,
            NOT: { id: project.id },
          },
          select: { id: true },
        });
        if (exists) {
          throw new ValidationError('Tên dự án đã tồn tại trong công ty');
        }
      }
      updateData.project_name = trimmedName;
    }

    if (data.description !== undefined) {
      updateData.description = data.description ?? null;
    }

    const newStart = data.startDate ?? project.start_date ?? null;
    const newEnd = data.endDate ?? project.end_date ?? null;
    if (newStart && newEnd && newEnd < newStart) {
      throw new ValidationError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
    }
    if (data.startDate !== undefined) {
      updateData.start_date = data.startDate;
    }
    if (data.endDate !== undefined) {
      updateData.end_date = data.endDate;
    }

    if (data.colorCode !== undefined) {
      updateData.color_code = data.colorCode;
    }
    if (data.label !== undefined) {
      updateData.label = data.label;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    await prisma.activitylog.create({
      data: {
        user_id: userId,
        action: 'UPDATE_PROJECT',
        details: `Cập nhật thông tin dự án: ${updated.project_name}`,
        target_table: 'project',
        target_id: updated.id,
      },
    });

    return updated;
  }

  async deleteProject(id: number, userId: number) {
    const currentUser = await this.getCurrentUser(userId);

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        project_name: true,
        status: true,
        manager_id: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    this.assertCanManageProject(currentUser.role, project.manager_id, userId);

    if (project.status === project_status.Archived) {
      return project;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { status: project_status.Archived },
    });

    await prisma.activitylog.create({
      data: {
        user_id: userId,
        action: 'ARCHIVE_PROJECT',
        details: `Lưu trữ dự án: ${project.project_name}`,
        target_table: 'project',
        target_id: project.id,
      },
    });

    return updated;
  }

  async getProjectMembers(projectId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    const members = await prisma.projectmember.findMany({
      where: { project_id: projectId },
      select: {
        user_id: true,
        role: true,
        joined_at: true,
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
    });

    return members;
  }

  async addProjectMember(projectId: number, input: AddMemberInput, actorId: number) {
    const currentUser = await this.getCurrentUser(actorId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        project_name: true,
        company_id: true,
        manager_id: true,
      },
    });
    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    this.assertCanManageProject(currentUser.role, project.manager_id, actorId);

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        company_id: true,
        status: true,
        full_name: true,
        email: true,
      },
    });
    if (!user) {
      throw new NotFoundError('Không tìm thấy người dùng cần thêm vào dự án');
    }
    if (user.company_id !== project.company_id) {
      throw new ValidationError('Thành viên phải thuộc cùng công ty với dự án');
    }
    if (user.status !== 'Active') {
      throw new ValidationError('Chỉ có thể thêm thành viên đang ở trạng thái Active');
    }

    const existingMember = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: input.userId,
        },
      },
    });
    if (existingMember) {
      throw new ValidationError('Người dùng đã là thành viên của dự án');
    }

    const memberRole = input.role ?? projectmember_role.Member;

    const member = await prisma.projectmember.create({
      data: {
        project_id: projectId,
        user_id: input.userId,
        role: memberRole,
      },
      select: {
        project_id: true,
        user_id: true,
        role: true,
        joined_at: true,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'ADD_PROJECT_MEMBER',
        details: `Thêm ${user.full_name ?? user.email} vào dự án ${project.project_name} với vai trò ${memberRole}`,
        target_table: 'project',
        target_id: project.id,
      },
    });

    return member;
  }

  async removeProjectMember(projectId: number, memberUserId: number, actorId: number) {
    const currentUser = await this.getCurrentUser(actorId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        project_name: true,
        manager_id: true,
      },
    });
    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    this.assertCanManageProject(currentUser.role, project.manager_id, actorId);

    const member = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: memberUserId,
        },
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });
    if (!member) {
      throw new NotFoundError('Không tìm thấy thành viên trong dự án');
    }
    if (member.role === projectmember_role.Manager) {
      throw new ForbiddenError('Không thể xóa quản lý dự án. Hãy chuyển quyền trước.');
    }

    await prisma.projectmember.delete({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: memberUserId,
        },
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'REMOVE_PROJECT_MEMBER',
        details: `Xóa thành viên ${member.user.full_name ?? member.user.email} khỏi dự án ${project.project_name}`,
        target_table: 'project',
        target_id: project.id,
      },
    });
  }

  async updateMemberRole(projectId: number, input: UpdateMemberRoleInput, actorId: number) {
    const currentUser = await this.getCurrentUser(actorId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        project_name: true,
        manager_id: true,
      },
    });
    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    this.assertCanManageProject(currentUser.role, project.manager_id, actorId);

    const member = await prisma.projectmember.findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: input.userId,
        },
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });
    if (!member) {
      throw new NotFoundError('Không tìm thấy thành viên trong dự án');
    }

    if (input.role === projectmember_role.Manager) {
      const currentManager = await prisma.projectmember.findFirst({
        where: {
          project_id: projectId,
          role: projectmember_role.Manager,
        },
        select: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      });

      if (currentManager && currentManager.user.id !== input.userId) {
        throw new ValidationError('Mỗi dự án chỉ có một Quản lý. Hãy chuyển quyền sau khi bỏ vai trò Manager hiện tại.');
      }
    }

    const updated = await prisma.projectmember.update({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: input.userId,
        },
      },
      data: {
        role: input.role,
      },
      select: {
        project_id: true,
        user_id: true,
        role: true,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'UPDATE_PROJECT_MEMBER_ROLE',
        details: `Cập nhật vai trò thành viên ${member.user.full_name ?? member.user.email} trong dự án ${project.project_name} thành ${input.role}`,
        target_table: 'project',
        target_id: project.id,
      },
    });

    return updated;
  }

  async getProjectStats(projectId: number) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundError('Không tìm thấy dự án');
    }

    const allTasks = await prisma.task.findMany({
      where: {
        taskgroup: {
          project_id: projectId,
        },
      },
      select: {
        status: true,
      },
    });

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === task_status.Completed).length;
    const overdueTasks = allTasks.filter((t) => t.status === task_status.Overdue).length;
    const completionPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      projectId,
      totalTasks,
      completedTasks,
      overdueTasks,
      completionPercent,
    };
  }
}

export const projectService = new ProjectService();

