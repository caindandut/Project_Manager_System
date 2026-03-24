import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../utils/AppError';
import { assertProjectAccess } from './helpers/projectAccess';

type UserRole = 'Admin' | 'Director' | 'Employee';

interface DashboardStats {
  [key: string]: unknown;
}

interface LabelCount {
  label: string;
  count: number;
}

interface AssigneeDistribution {
  userId: number;
  fullName: string;
  avatarPath: string | null;
  total: number;
  completed: number;
}

interface TimelinePoint {
  week: string;
  created: number;
  completed: number;
}

interface BurndownPoint {
  date: string;
  idealRemaining: number;
  actualRemaining: number;
}

export class ReportService {
  /* ─────────────── Dashboard thống kê theo role ─────────────── */

  async getDashboardStats(userId: number, role: UserRole): Promise<DashboardStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, company_id: true, role: true },
    });
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');

    switch (role) {
      case 'Admin':
        return this.getAdminDashboard(user.company_id);
      case 'Director':
        return this.getDirectorDashboard(userId);
      case 'Employee':
        return this.getEmployeeDashboard(userId);
      default:
        throw new ForbiddenError('Vai trò không hợp lệ');
    }
  }

  /* ─────────────── Báo cáo dự án ─────────────── */

  async getProjectReport(projectId: number, actorId: number) {
    await assertProjectAccess(projectId, actorId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        project_name: true,
        start_date: true,
        end_date: true,
        status: true,
      },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    const tasks = await prisma.task.findMany({
      where: {
        taskgroup: { project_id: projectId },
        is_archived: false,
      },
      select: {
        id: true,
        status: true,
        priority: true,
        deadline: true,
        created_at: true,
        updated_at: true,
        taskassignee: {
          select: {
            user: {
              select: { id: true, full_name: true, avatar_path: true },
            },
          },
        },
      },
    });

    const totalTasks = tasks.length;

    const byStatus: LabelCount[] = this.countBy(tasks, (t) => t.status ?? 'Todo');
    const byPriority: LabelCount[] = this.countBy(tasks, (t) => t.priority ?? 'Medium');

    const assigneeMap = new Map<number, AssigneeDistribution>();
    for (const t of tasks) {
      for (const a of t.taskassignee) {
        const uid = a.user.id;
        if (!assigneeMap.has(uid)) {
          assigneeMap.set(uid, {
            userId: uid,
            fullName: a.user.full_name ?? '',
            avatarPath: a.user.avatar_path,
            total: 0,
            completed: 0,
          });
        }
        const entry = assigneeMap.get(uid)!;
        entry.total++;
        if (t.status === 'Completed') entry.completed++;
      }
    }
    const byAssignee = Array.from(assigneeMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    const timelineData = this.buildTimeline(tasks);

    const now = new Date();
    const overdueTasks = tasks
      .filter(
        (t) =>
          t.deadline &&
          new Date(t.deadline) < now &&
          t.status !== 'Completed',
      )
      .map((t) => ({
        id: t.id,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
      }));

    return {
      project: {
        id: project.id,
        projectName: project.project_name,
        startDate: project.start_date,
        endDate: project.end_date,
        status: project.status,
      },
      totalTasks,
      byStatus,
      byPriority,
      byAssignee,
      timelineData,
      overdueTasks,
    };
  }

  /* ─────────────── Burndown chart ─────────────── */

  async getBurndownData(
    projectId: number,
    actorId: number,
  ): Promise<BurndownPoint[]> {
    await assertProjectAccess(projectId, actorId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { start_date: true, end_date: true },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    const tasks = await prisma.task.findMany({
      where: {
        taskgroup: { project_id: projectId },
        is_archived: false,
      },
      select: { id: true, status: true, created_at: true, updated_at: true },
    });

    const totalTasks = tasks.length;
    if (totalTasks === 0) return [];

    const startDate = project.start_date
      ? new Date(project.start_date)
      : this.earliest(tasks.map((t) => t.created_at).filter(Boolean) as Date[]);

    const endDate = project.end_date
      ? new Date(project.end_date)
      : new Date();

    if (!startDate) return [];

    const today = new Date();
    const effectiveEnd = endDate > today ? today : endDate;

    const totalDays = this.daysBetween(startDate, endDate);
    if (totalDays <= 0) return [];

    const completedTasks = tasks.filter((t) => t.status === 'Completed');
    const completedByDate = new Map<string, number>();
    for (const t of completedTasks) {
      const dateKey = this.toDateKey(t.updated_at ?? t.created_at!);
      completedByDate.set(dateKey, (completedByDate.get(dateKey) ?? 0) + 1);
    }

    const points: BurndownPoint[] = [];
    let cumulativeCompleted = 0;
    const cursor = new Date(startDate);

    while (cursor <= effectiveEnd) {
      const dateKey = this.toDateKey(cursor);
      const dayIndex = this.daysBetween(startDate, cursor);

      const idealRemaining = Math.max(
        0,
        Math.round(totalTasks - (totalTasks * dayIndex) / totalDays),
      );

      cumulativeCompleted += completedByDate.get(dateKey) ?? 0;
      const actualRemaining = totalTasks - cumulativeCompleted;

      points.push({ date: dateKey, idealRemaining, actualRemaining });
      cursor.setDate(cursor.getDate() + 1);
    }

    return points;
  }

  /* ─────────────── Báo cáo nhân viên ─────────────── */

  async getEmployeeReport(
    targetUserId: number,
    actorId: number,
    projectId?: number,
  ) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, company_id: true },
    });
    if (!actor) throw new NotFoundError('Không tìm thấy người dùng');

    const isOwnReport = targetUserId === actorId;
    const isPrivileged = actor.role === 'Admin' || actor.role === 'Director';
    if (!isOwnReport && !isPrivileged) {
      throw new ForbiddenError('Bạn không có quyền xem báo cáo của người khác');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, full_name: true, avatar_path: true, email: true },
    });
    if (!targetUser) throw new NotFoundError('Không tìm thấy nhân viên');

    const taskFilter: Record<string, unknown> = {
      taskassignee: { some: { user_id: targetUserId } },
      is_archived: false,
    };
    if (projectId) {
      taskFilter.taskgroup = { project_id: projectId };
    }

    const tasks = await prisma.task.findMany({
      where: taskFilter,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        deadline: true,
        created_at: true,
        updated_at: true,
        completion_percent: true,
        taskgroup: {
          select: {
            project: { select: { id: true, project_name: true } },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    const now = new Date();
    const totalAssigned = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const overdue = tasks.filter(
      (t) =>
        t.deadline && new Date(t.deadline) < now && t.status !== 'Completed',
    ).length;
    const inProgress = tasks.filter((t) => t.status === 'InProgress').length;

    const completedTasks = tasks.filter(
      (t) => t.status === 'Completed' && t.created_at && t.updated_at,
    );
    let averageCompletionDays = 0;
    if (completedTasks.length > 0) {
      const totalMs = completedTasks.reduce((sum, t) => {
        return (
          sum +
          (new Date(t.updated_at!).getTime() -
            new Date(t.created_at!).getTime())
        );
      }, 0);
      averageCompletionDays = Math.round(
        totalMs / completedTasks.length / (1000 * 60 * 60 * 24),
      );
    }

    const avgCompletion =
      totalAssigned > 0
        ? Math.round(
            tasks.reduce((s, t) => s + (t.completion_percent ?? 0), 0) /
              totalAssigned,
          )
        : 0;

    const recentActivity = await prisma.activitylog.findMany({
      where: { user_id: targetUserId },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        action: true,
        details: true,
        target_table: true,
        target_id: true,
        created_at: true,
      },
    });

    return {
      user: {
        id: targetUser.id,
        fullName: targetUser.full_name,
        email: targetUser.email,
        avatarPath: targetUser.avatar_path,
      },
      summary: {
        totalAssigned,
        completed,
        overdue,
        inProgress,
        averageCompletionDays,
        averageCompletionPercent: avgCompletion,
      },
      overdueTasks: tasks
        .filter(
          (t) =>
            t.deadline &&
            new Date(t.deadline) < now &&
            t.status !== 'Completed',
        )
        .map((t) => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          status: t.status,
          projectName: t.taskgroup?.project?.project_name ?? null,
        })),
      recentActivity,
    };
  }

  /* ═══════════════ Private: dashboard theo role ═══════════════ */

  private async getAdminDashboard(companyId: number | null): Promise<DashboardStats> {
    const companyFilter = companyId ? { company_id: companyId } : {};

    const [totalUsers, totalProjects, totalTasks, overdueTasks] =
      await Promise.all([
        prisma.user.count({
          where: { ...companyFilter, status: 'Active' },
        }),
        prisma.project.count({
          where: { ...companyFilter, status: 'Active' },
        }),
        prisma.task.count({
          where: {
            taskgroup: { project: companyId ? { company_id: companyId } : {} },
            is_archived: false,
          },
        }),
        prisma.task.count({
          where: {
            taskgroup: { project: companyId ? { company_id: companyId } : {} },
            is_archived: false,
            status: { not: 'Completed' },
            deadline: { lt: new Date() },
          },
        }),
      ]);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [completedTasksThisWeek, newProjectsThisMonth] = await Promise.all([
      prisma.task.count({
        where: {
          taskgroup: { project: companyId ? { company_id: companyId } : {} },
          status: 'Completed',
          updated_at: { gte: weekAgo },
        },
      }),
      prisma.project.count({
        where: {
          ...companyFilter,
          created_at: { gte: monthAgo },
        },
      }),
    ]);
    const taskRows = await prisma.task.findMany({
      where: {
        taskgroup: { project: companyId ? { company_id: companyId } : {} },
        is_archived: false,
      },
      select: { status: true },
    });
    const taskDistribution = this.countBy(taskRows, (t) => t.status ?? 'Todo');

    const recentActivity = await prisma.activitylog.findMany({
      where: companyId
        ? { user: { company_id: companyId } }
        : {},
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        action: true,
        details: true,
        target_table: true,
        target_id: true,
        created_at: true,
        user: {
          select: { id: true, full_name: true, avatar_path: true },
        },
      },
    });

    return {
      totalUsers,
      totalProjects,
      totalTasks,
      overdueTasks,
      completedTasksThisWeek,
      newProjectsThisMonth,
      taskDistribution,
      recentActivity,
    };
  }

  private async getDirectorDashboard(userId: number): Promise<DashboardStats> {
    const managedProjects = await prisma.project.findMany({
      where: { manager_id: userId, status: 'Active' },
      select: { id: true },
    });
    const projectIds = managedProjects.map((p) => p.id);

    const [overdueTasksInMyProjects, teamMemberCount] = await Promise.all([
      prisma.task.count({
        where: {
          taskgroup: { project_id: { in: projectIds } },
          is_archived: false,
          status: { not: 'Completed' },
          deadline: { lt: new Date() },
        },
      }),
      prisma.projectmember.groupBy({
        by: ['user_id'],
        where: { project_id: { in: projectIds } },
      }),
    ]);

    const tasks = await prisma.task.findMany({
      where: {
        taskgroup: { project_id: { in: projectIds } },
        is_archived: false,
      },
      select: { status: true, completion_percent: true },
    });

    const taskDistribution = this.countBy(tasks, (t) => t.status ?? 'Todo');
    const totalCompletion = tasks.reduce(
      (s, t) => s + (t.completion_percent ?? 0),
      0,
    );
    const averageProgress =
      tasks.length > 0 ? Math.round(totalCompletion / tasks.length) : 0;

    return {
      projectsManagedCount: projectIds.length,
      averageProgress,
      overdueTasksInMyProjects,
      teamMemberCount: teamMemberCount.length,
      taskDistribution,
    };
  }

  private async getEmployeeDashboard(userId: number): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const baseFilter = {
      taskassignee: { some: { user_id: userId } },
      is_archived: false,
    };

    const [myTasksToday, completedThisWeek, upcomingDeadlines, myOverdueTasks] =
      await Promise.all([
        prisma.task.count({
          where: {
            ...baseFilter,
            status: { not: 'Completed' },
            OR: [
              { deadline: { gte: todayStart, lt: todayEnd } },
              { deadline: null, status: 'InProgress' },
            ],
          },
        }),
        prisma.task.count({
          where: {
            ...baseFilter,
            status: 'Completed',
            updated_at: { gte: weekAgo },
          },
        }),
        prisma.task.findMany({
          where: {
            ...baseFilter,
            status: { not: 'Completed' },
            deadline: { gte: now, lte: threeDaysLater },
          },
          select: {
            id: true,
            title: true,
            deadline: true,
            priority: true,
            status: true,
            taskgroup: {
              select: {
                project: { select: { id: true, project_name: true } },
              },
            },
          },
          orderBy: { deadline: 'asc' },
          take: 10,
        }),
        prisma.task.count({
          where: {
            ...baseFilter,
            status: { not: 'Completed' },
            deadline: { lt: now },
          },
        }),
      ]);

    const allMyTasks = await prisma.task.findMany({
      where: { ...baseFilter },
      select: { completion_percent: true, status: true, updated_at: true },
    });
    const myProgress =
      allMyTasks.length > 0
        ? Math.round(
            allMyTasks.reduce(
              (s, t) => s + (t.completion_percent ?? 0),
              0,
            ) / allMyTasks.length,
          )
        : 0;
    const weekMap = new Map<string, number>();
    for (const t of allMyTasks) {
      if (t.status !== 'Completed' || !t.updated_at) continue;
      const week = this.toWeekKey(t.updated_at);
      weekMap.set(week, (weekMap.get(week) ?? 0) + 1);
    }
    const weeklyCompletion = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, completed]) => ({ week, completed }));

    return {
      myTasksToday,
      completedThisWeek,
      upcomingDeadlines,
      myOverdueTasks,
      myProgress,
      weeklyCompletion,
    };
  }

  /* ═══════════════ Utility ═══════════════ */

  private countBy<T>(
    items: T[],
    keyFn: (item: T) => string,
  ): LabelCount[] {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = keyFn(item);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([label, count]) => ({
      label,
      count,
    }));
  }

  private buildTimeline(
    tasks: { created_at: Date | null; updated_at: Date | null; status: string | null }[],
  ): TimelinePoint[] {
    const weekMap = new Map<string, { created: number; completed: number }>();

    for (const t of tasks) {
      if (t.created_at) {
        const week = this.toWeekKey(t.created_at);
        const entry = weekMap.get(week) ?? { created: 0, completed: 0 };
        entry.created++;
        weekMap.set(week, entry);
      }
      if (t.status === 'Completed' && t.updated_at) {
        const week = this.toWeekKey(t.updated_at);
        const entry = weekMap.get(week) ?? { created: 0, completed: 0 };
        entry.completed++;
        weekMap.set(week, entry);
      }
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({ week, ...data }));
  }

  private toWeekKey(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return this.toDateKey(d);
  }

  private toDateKey(date: Date): string {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private daysBetween(a: Date, b: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round(
      (new Date(b).getTime() - new Date(a).getTime()) / msPerDay,
    );
  }

  private earliest(dates: Date[]): Date | null {
    if (dates.length === 0) return null;
    return dates.reduce((min, d) => (d < min ? d : min));
  }
}

export const reportService = new ReportService();
