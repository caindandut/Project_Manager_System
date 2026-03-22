import { task_priority, task_status } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { Task as TaskDomain, TaskStatus } from '../domain/entities/Task';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError';
import {
  assertProjectAccess,
  assertCanMutateTasksOnProject,
  assertManagerOrAdminOnProject,
} from './helpers/projectAccess';
import { getIo } from '../socket/socketServer';
import { SOCKET_EVENTS } from '../socket/socketEvents';
import type {
  AssignTaskInput,
  CreateSubtaskInput,
  CreateTaskInput,
  MoveTaskInput,
  MyTasksQueryInput,
  UpdateTaskInput,
} from '../validators/taskValidator';

function taskLabelToDb(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const t = value.trim();
  return t === '' ? null : t;
}

function toTaskStatus(value: string | null | undefined): TaskStatus {
  const s = (value || 'Todo') as TaskStatus;
  if (Object.values(TaskStatus).includes(s)) return s;
  return TaskStatus.TODO;
}

function emitTaskUpdated(projectId: number, payload: { task_id: number; project_id: number }): void {
  try {
    getIo().to(`project:${projectId}`).emit(SOCKET_EVENTS.TASK_UPDATED, payload);
  } catch {
    /* Socket chưa init (vd. test) — bỏ qua */
  }
}

const userSelect = {
  id: true,
  full_name: true,
  email: true,
  avatar_path: true,
} as const;

export type TaskAssigneeDto = {
  user_id: number;
  role: string | null;
  user: { id: number; full_name: string | null; email: string; avatar_path: string | null };
};

export type TaskDetailDto = {
  id: number;
  project_id: number;
  task_group_id: number | null;
  parent_task_id: number | null;
  creator_id: number | null;
  title: string;
  label: string | null;
  description: string | null;
  deadline: Date | null;
  priority: string | null;
  status: string | null;
  completion_percent: number | null;
  position: number | null;
  is_archived: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  assignees: TaskAssigneeDto[];
  subtasks: Array<{ id: number; title: string; status: string | null; position: number | null }>;
  predecessors: Array<{ id: number; title: string }>;
  successors: Array<{ id: number; title: string }>;
  comments: Array<{
    id: number;
    content: string | null;
    created_at: Date | null;
    user: { id: number; full_name: string | null; email: string; avatar_path: string | null };
  }>;
  documents: Array<{
    id: number;
    file_name: string;
    type: string;
    file_path: string;
    size_kb: number | null;
    created_at: Date | null;
  }>;
};

export type MyTasksGroupedDto = {
  project_id: number;
  project_name: string;
  color_code: string | null;
  tasks: Array<{
    id: number;
    title: string;
    label: string | null;
    status: string | null;
    priority: string | null;
    deadline: Date | null;
    completion_percent: number | null;
    task_group_id: number | null;
    group_name: string | null;
    assignees: TaskAssigneeDto[];
  }>;
};

/**
 * Quản lý task — GĐ2 mục 2.2; HTTP mount mục 2.4 (taskRoutes, user /me/tasks).
 */
export class TaskService {
  async createTask(taskGroupId: number, data: CreateTaskInput, creatorId: number): Promise<TaskDetailDto> {
    const group = await prisma.taskgroup.findUnique({
      where: { id: taskGroupId },
      select: { id: true, project_id: true },
    });
    if (!group || group.project_id == null) {
      throw new NotFoundError('Không tìm thấy nhóm công việc');
    }

    const projectId = group.project_id;
    await assertCanMutateTasksOnProject(projectId, creatorId);

    const assigneeIds = [...new Set(data.assignee_ids ?? [])];
    if (assigneeIds.length) {
      await this.validateAssigneesAreProjectMembers(projectId, assigneeIds);
    }

    const maxPos = await prisma.task.aggregate({
      where: { task_group_id: taskGroupId, parent_task_id: null },
      _max: { position: true },
    });
    const nextPosition = (maxPos._max.position ?? -1) + 1;

    const task = await prisma.$transaction(async (tx) => {
      const t = await tx.task.create({
        data: {
          task_group_id: taskGroupId,
          creator_id: creatorId,
          title: data.title,
          description: data.description ?? null,
          label: taskLabelToDb(data.label),
          deadline: data.deadline ? new Date(data.deadline) : null,
          priority: (data.priority as task_priority) ?? 'Medium',
          status: 'Todo',
          position: nextPosition,
          completion_percent: 0,
          is_archived: false,
          updated_at: new Date(),
        },
      });

      if (assigneeIds.length) {
        const rows = assigneeIds.map((uid, i) => ({
          task_id: t.id,
          user_id: uid,
          role: (i === 0 ? 'Main' : 'Support') as 'Main' | 'Support',
        }));
        await tx.taskassignee.createMany({ data: rows });
      }

      await tx.activitylog.create({
        data: {
          user_id: creatorId,
          action: 'CREATE_TASK',
          details: `Tạo task "${t.title}"`,
          target_table: 'task',
          target_id: t.id,
        },
      });

      return t;
    });

    emitTaskUpdated(projectId, { task_id: task.id, project_id: projectId });
    return this.getTaskById(task.id, creatorId);
  }

  async getTaskById(taskId: number, actorId: number): Promise<TaskDetailDto> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        taskgroup: { select: { project_id: true, group_name: true } },
        taskassignee: { include: { user: { select: userSelect } } },
        other_task: {
          where: { is_archived: false },
          orderBy: { position: 'asc' },
          select: { id: true, title: true, status: true, position: true },
        },
        taskdependency_taskdependency_successor_idTotask: {
          include: {
            task_taskdependency_predecessor_idTotask: { select: { id: true, title: true } },
          },
        },
        taskdependency_taskdependency_predecessor_idTotask: {
          include: {
            task_taskdependency_successor_idTotask: { select: { id: true, title: true } },
          },
        },
        comment: {
          take: 5,
          orderBy: { created_at: 'desc' },
          include: { user: { select: userSelect } },
        },
        document: {
          take: 5,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            file_name: true,
            type: true,
            file_path: true,
            size_kb: true,
            created_at: true,
          },
        },
      },
    });

    if (!task || task.taskgroup?.project_id == null) {
      throw new NotFoundError('Không tìm thấy công việc');
    }

    const projectId = task.taskgroup.project_id;
    await assertProjectAccess(projectId, actorId);

    const predecessors = task.taskdependency_taskdependency_successor_idTotask.map((d) => ({
      id: d.task_taskdependency_predecessor_idTotask.id,
      title: d.task_taskdependency_predecessor_idTotask.title,
    }));
    const successors = task.taskdependency_taskdependency_predecessor_idTotask.map((d) => ({
      id: d.task_taskdependency_successor_idTotask.id,
      title: d.task_taskdependency_successor_idTotask.title,
    }));

    return {
      id: task.id,
      project_id: projectId,
      task_group_id: task.task_group_id,
      parent_task_id: task.parent_task_id,
      creator_id: task.creator_id,
      title: task.title,
      label: task.label,
      description: task.description,
      deadline: task.deadline,
      priority: task.priority,
      status: task.status,
      completion_percent: task.completion_percent,
      position: task.position,
      is_archived: task.is_archived,
      created_at: task.created_at,
      updated_at: task.updated_at,
      assignees: task.taskassignee.map((ta) => ({
        user_id: ta.user_id,
        role: ta.role,
        user: ta.user,
      })),
      subtasks: task.other_task,
      predecessors,
      successors,
      comments: task.comment
        .filter((c): c is typeof c & { user: NonNullable<typeof c.user> } => c.user != null)
        .map((c) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          user: c.user,
        })),
      documents: task.document.map((d) => ({
        id: d.id,
        file_name: d.file_name,
        type: d.type,
        file_path: d.file_path,
        size_kb: d.size_kb,
        created_at: d.created_at,
      })),
    };
  }

  async updateTask(taskId: number, data: UpdateTaskInput, actorId: number): Promise<TaskDetailDto> {
    const task = await this.loadTaskForPermission(taskId);
    await this.assertTaskEditPermission(task.project_id, task, actorId);

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.label !== undefined) updateData.label = taskLabelToDb(data.label);
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    if (data.priority !== undefined) updateData.priority = data.priority as task_priority;

    if (Object.keys(updateData).length <= 1) {
      return this.getTaskById(taskId, actorId);
    }

    await prisma.task.update({
      where: { id: taskId },
      data: updateData as any,
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'UPDATE_TASK',
        details: `Cập nhật task #${taskId}`,
        target_table: 'task',
        target_id: taskId,
      },
    });

    emitTaskUpdated(task.project_id, { task_id: taskId, project_id: task.project_id });
    return this.getTaskById(taskId, actorId);
  }

  async updateTaskStatus(taskId: number, newStatus: task_status, actorId: number): Promise<TaskDetailDto> {
    const task = await this.loadTaskForPermission(taskId);
    await this.assertTaskEditPermission(task.project_id, task, actorId);

    const current = toTaskStatus(task.status);
    const next = newStatus as TaskStatus;

    TaskDomain.assertStatusTransition(current, next);

    if (current === TaskStatus.REVIEW && next === TaskStatus.COMPLETED) {
      await this.assertCanCompleteFromReview(task.project_id, task.creator_id, actorId);
    }

    const updateData: any = {
      status: newStatus,
      updated_at: new Date(),
    };
    if (next === TaskStatus.COMPLETED) {
      updateData.completion_percent = 100;
    }

    await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'UPDATE_TASK_STATUS',
        details: `Đổi trạng thái task #${taskId} → ${newStatus}`,
        target_table: 'task',
        target_id: taskId,
      },
    });

    emitTaskUpdated(task.project_id, { task_id: taskId, project_id: task.project_id });
    return this.getTaskById(taskId, actorId);
  }

  async updateTaskProgress(taskId: number, percent: number, actorId: number): Promise<TaskDetailDto> {
    const task = await this.loadTaskForPermission(taskId);
    await this.assertTaskProgressPermission(task.project_id, task, actorId);

    TaskDomain.assertProgress(percent);

    const updateData: any = {
      completion_percent: percent,
      updated_at: new Date(),
    };
    if (percent === 100 && task.status !== 'Completed') {
      updateData.status = 'Review';
    }

    await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'UPDATE_TASK_PROGRESS',
        details: `Cập nhật tiến độ task #${taskId}: ${percent}%`,
        target_table: 'task',
        target_id: taskId,
      },
    });

    emitTaskUpdated(task.project_id, { task_id: taskId, project_id: task.project_id });
    return this.getTaskById(taskId, actorId);
  }

  async archiveTask(taskId: number, actorId: number): Promise<TaskDetailDto> {
    const task = await this.loadTaskForPermission(taskId);
    await assertManagerOrAdminOnProject(
      task.project_id,
      actorId,
      'Chỉ Admin hoặc Manager của dự án mới được lưu trữ task',
    );

    if (task.status !== 'Completed') {
      throw new ValidationError('Chỉ có thể lưu trữ task đã hoàn thành');
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { is_archived: true, updated_at: new Date() },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'ARCHIVE_TASK',
        details: `Lưu trữ task #${taskId}`,
        target_table: 'task',
        target_id: taskId,
      },
    });

    emitTaskUpdated(task.project_id, { task_id: taskId, project_id: task.project_id });
    return this.getTaskById(taskId, actorId);
  }

  async assignTask(taskId: number, input: AssignTaskInput, actorId: number): Promise<TaskDetailDto> {
    const task = await this.loadTaskForPermission(taskId);
    await this.assertAssignUnassignPermission(task.project_id, task.creator_id, actorId);

    await this.validateAssigneesAreProjectMembers(task.project_id, [input.user_id]);

    const existing = await prisma.taskassignee.findUnique({
      where: {
        task_id_user_id: { task_id: taskId, user_id: input.user_id },
      },
    });
    if (existing) {
      throw new ValidationError('Người dùng đã được giao task này');
    }

    await prisma.taskassignee.create({
      data: {
        task_id: taskId,
        user_id: input.user_id,
        role: input.role,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'ASSIGN_TASK',
        details: `Giao task #${taskId} cho user #${input.user_id}`,
        target_table: 'task',
        target_id: taskId,
      },
    });

    emitTaskUpdated(task.project_id, { task_id: taskId, project_id: task.project_id });
    return this.getTaskById(taskId, actorId);
  }

  async unassignTask(taskId: number, targetUserId: number, actorId: number): Promise<TaskDetailDto> {
    const task = await this.loadTaskForPermission(taskId);
    await this.assertAssignUnassignPermission(task.project_id, task.creator_id, actorId);

    const count = await prisma.taskassignee.count({ where: { task_id: taskId } });
    if (count <= 1) {
      throw new ValidationError('Không thể bỏ giao khi task chỉ còn một người thực hiện');
    }

    const deleted = await prisma.taskassignee.deleteMany({
      where: { task_id: taskId, user_id: targetUserId },
    });
    if (deleted.count === 0) {
      throw new NotFoundError('Người dùng không nằm trong danh sách được giao');
    }

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'UNASSIGN_TASK',
        details: `Bỏ giao task #${taskId} khỏi user #${targetUserId}`,
        target_table: 'task',
        target_id: taskId,
      },
    });

    emitTaskUpdated(task.project_id, { task_id: taskId, project_id: task.project_id });
    return this.getTaskById(taskId, actorId);
  }

  async createSubtask(parentTaskId: number, data: CreateSubtaskInput, creatorId: number): Promise<TaskDetailDto> {
    const parent = await prisma.task.findUnique({
      where: { id: parentTaskId },
      include: {
        taskgroup: { select: { project_id: true } },
      },
    });
    if (!parent || parent.taskgroup?.project_id == null) {
      throw new NotFoundError('Không tìm thấy task cha');
    }

    const projectId = parent.taskgroup.project_id;
    if (!parent.task_group_id) {
      throw new ValidationError('Task cha không thuộc nhóm công việc');
    }

    await assertCanMutateTasksOnProject(projectId, creatorId);

    const maxPos = await prisma.task.aggregate({
      where: { task_group_id: parent.task_group_id, parent_task_id: parentTaskId },
      _max: { position: true },
    });
    const nextPosition = (maxPos._max.position ?? -1) + 1;

    const sub = await prisma.task.create({
      data: {
        parent_task_id: parentTaskId,
        task_group_id: parent.task_group_id,
        creator_id: creatorId,
        title: data.title,
        description: data.description ?? null,
        priority: (data.priority as task_priority) ?? 'Medium',
        status: 'Todo',
        position: nextPosition,
        completion_percent: 0,
        is_archived: false,
        updated_at: new Date(),
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: creatorId,
        action: 'CREATE_SUBTASK',
        details: `Tạo subtask "${sub.title}" (cha #${parentTaskId})`,
        target_table: 'task',
        target_id: sub.id,
      },
    });

    emitTaskUpdated(projectId, { task_id: sub.id, project_id: projectId });
    return this.getTaskById(sub.id, creatorId);
  }

  async getSubtasks(parentTaskId: number, actorId: number) {
    const parent = await prisma.task.findUnique({
      where: { id: parentTaskId },
      include: { taskgroup: { select: { project_id: true } } },
    });
    if (!parent || parent.taskgroup?.project_id == null) {
      throw new NotFoundError('Không tìm thấy task cha');
    }
    await assertProjectAccess(parent.taskgroup.project_id, actorId);

    return prisma.task.findMany({
      where: {
        parent_task_id: parentTaskId,
        is_archived: false,
      },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        completion_percent: true,
        position: true,
        deadline: true,
        created_at: true,
      },
    });
  }

  async addDependency(predecessorId: number, successorId: number, actorId: number): Promise<void> {
    if (predecessorId === successorId) {
      throw new ValidationError('Task không thể phụ thuộc chính nó');
    }

    const [pre, suc] = await Promise.all([
      this.loadTaskProjectId(predecessorId),
      this.loadTaskProjectId(successorId),
    ]);
    if (pre.projectId !== suc.projectId) {
      throw new ValidationError('Hai task phải cùng một dự án');
    }

    const taskForPerm = await this.loadTaskForPermission(successorId);
    await this.assertTaskEditPermission(taskForPerm.project_id, taskForPerm, actorId);

    const exists = await prisma.taskdependency.findUnique({
      where: {
        predecessor_id_successor_id: { predecessor_id: predecessorId, successor_id: successorId },
      },
    });
    if (exists) {
      throw new ValidationError('Phụ thuộc này đã tồn tại');
    }

    const wouldCycle = await this.wouldCreateDependencyCycle(predecessorId, successorId);
    if (wouldCycle) {
      throw new ValidationError('Không thể thêm phụ thuộc vì tạo vòng lặp');
    }

    await prisma.taskdependency.create({
      data: { predecessor_id: predecessorId, successor_id: successorId },
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'ADD_TASK_DEPENDENCY',
        details: `Task #${successorId} phụ thuộc #${predecessorId}`,
        target_table: 'task',
        target_id: successorId,
      },
    });

    emitTaskUpdated(pre.projectId, { task_id: successorId, project_id: pre.projectId });
  }

  async removeDependency(predecessorId: number, successorId: number, actorId: number): Promise<void> {
    const taskForPerm = await this.loadTaskForPermission(successorId);
    await this.assertTaskEditPermission(taskForPerm.project_id, taskForPerm, actorId);

    const deleted = await prisma.taskdependency.deleteMany({
      where: { predecessor_id: predecessorId, successor_id: successorId },
    });
    if (deleted.count === 0) {
      throw new NotFoundError('Không tìm thấy phụ thuộc');
    }

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'REMOVE_TASK_DEPENDENCY',
        details: `Gỡ phụ thuộc #${predecessorId} → #${successorId}`,
        target_table: 'task',
        target_id: successorId,
      },
    });

    emitTaskUpdated(taskForPerm.project_id, {
      task_id: successorId,
      project_id: taskForPerm.project_id,
    });
  }

  async getMyTasks(userId: number, filters: MyTasksQueryInput): Promise<MyTasksGroupedDto[]> {
    const where: any = {
      is_archived: false,
      taskassignee: { some: { user_id: userId } },
    };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.project_id) {
      where.taskgroup = { project_id: filters.project_id };
    }
    if (filters.search) {
      where.title = { contains: filters.search };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ taskgroup: { project_id: 'asc' } }, { position: 'asc' }],
      include: {
        taskgroup: {
          select: {
            project_id: true,
            group_name: true,
            project: { select: { project_name: true, color_code: true } },
          },
        },
        taskassignee: { include: { user: { select: userSelect } } },
      },
    });

    const map = new Map<number, MyTasksGroupedDto>();
    for (const t of tasks) {
      const pid = t.taskgroup?.project_id;
      if (pid == null) continue;
      if (!map.has(pid)) {
        map.set(pid, {
          project_id: pid,
          project_name: t.taskgroup?.project?.project_name ?? '',
          color_code: t.taskgroup?.project?.color_code ?? null,
          tasks: [],
        });
      }
      map.get(pid)!.tasks.push({
        id: t.id,
        title: t.title,
        label: t.label,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
        completion_percent: t.completion_percent,
        task_group_id: t.task_group_id,
        group_name: t.taskgroup?.group_name ?? null,
        assignees: t.taskassignee.map((ta) => ({
          user_id: ta.user_id,
          role: ta.role,
          user: ta.user,
        })),
      });
    }

    return [...map.values()];
  }

  async moveTask(taskId: number, input: MoveTaskInput, actorId: number): Promise<TaskDetailDto> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { taskgroup: { select: { project_id: true } } },
    });
    if (!task || task.taskgroup?.project_id == null) {
      throw new NotFoundError('Không tìm thấy công việc');
    }
    if (task.parent_task_id != null) {
      throw new ValidationError('Chỉ có thể di chuyển task gốc trong nhóm (không phải subtask)');
    }

    const projectId = task.taskgroup.project_id;
    await assertCanMutateTasksOnProject(projectId, actorId);

    const targetGroup = await prisma.taskgroup.findUnique({
      where: { id: input.target_group_id },
      select: { id: true, project_id: true },
    });
    if (!targetGroup || targetGroup.project_id !== projectId) {
      throw new ValidationError('Nhóm đích không thuộc cùng dự án');
    }

    const sourceGroupId = task.task_group_id;
    if (sourceGroupId == null) {
      throw new ValidationError('Task không gắn với nhóm công việc');
    }

    const clampPosition = (pos: number, len: number) => Math.max(0, Math.min(pos, len));

    await prisma.$transaction(async (tx) => {
      const sourceRoots = await tx.task.findMany({
        where: { task_group_id: sourceGroupId, parent_task_id: null, id: { not: taskId } },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      const targetRoots =
        sourceGroupId === input.target_group_id
          ? sourceRoots
          : await tx.task.findMany({
              where: { task_group_id: input.target_group_id, parent_task_id: null },
              orderBy: { position: 'asc' },
              select: { id: true },
            });

      if (sourceGroupId === input.target_group_id) {
        const without = sourceRoots.map((r) => r.id);
        const pos = clampPosition(input.position, without.length);
        const ordered = [...without.slice(0, pos), taskId, ...without.slice(pos)];
        await Promise.all(
          ordered.map((id, index) =>
            tx.task.update({
              where: { id },
              data: { position: index, task_group_id: input.target_group_id, updated_at: new Date() },
            }),
          ),
        );
      } else {
        const sourceOrdered = sourceRoots.map((r) => r.id);
        await Promise.all(
          sourceOrdered.map((id, index) =>
            tx.task.update({
              where: { id },
              data: { position: index, updated_at: new Date() },
            }),
          ),
        );

        const targetIds = targetRoots.map((r) => r.id);
        const pos = clampPosition(input.position, targetIds.length);
        const merged = [...targetIds.slice(0, pos), taskId, ...targetIds.slice(pos)];
        await Promise.all(
          merged.map((id, index) =>
            tx.task.update({
              where: { id },
              data: {
                position: index,
                task_group_id: input.target_group_id,
                updated_at: new Date(),
              },
            }),
          ),
        );
      }
    });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'MOVE_TASK',
        details: `Di chuyển task #${taskId} → nhóm #${input.target_group_id}`,
        target_table: 'task',
        target_id: taskId,
      },
    });

    emitTaskUpdated(projectId, { task_id: taskId, project_id: projectId });
    return this.getTaskById(taskId, actorId);
  }

  /**
   * Xóa task (cascade subtask, assignee, dependency theo Prisma).
   * Người tạo task: Member+ (mutate). Người khác: chỉ Manager/Admin dự án.
   */
  async deleteTask(taskId: number, actorId: number): Promise<void> {
    const task = await this.loadTaskForPermission(taskId);
    if (task.creator_id != null && task.creator_id === actorId) {
      await assertCanMutateTasksOnProject(task.project_id, actorId);
    } else {
      await assertManagerOrAdminOnProject(
        task.project_id,
        actorId,
        'Chỉ Admin, Manager dự án hoặc người tạo task mới xóa công việc',
      );
    }

    const projectId = task.project_id;
    await prisma.task.delete({ where: { id: taskId } });

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'DELETE_TASK',
        details: `Xóa task #${taskId}`,
        target_table: 'task',
        target_id: taskId,
      },
    });

    emitTaskUpdated(projectId, { task_id: taskId, project_id: projectId });
  }

  /**
   * Sắp xếp lại thứ tự các task gốc (không archived) trong một nhóm.
   */
  async reorderTasksInGroup(groupId: number, orderedIds: number[], actorId: number): Promise<void> {
    const group = await prisma.taskgroup.findUnique({
      where: { id: groupId },
      select: { id: true, project_id: true },
    });
    if (!group || group.project_id == null) {
      throw new NotFoundError('Không tìm thấy nhóm công việc');
    }

    await assertCanMutateTasksOnProject(group.project_id, actorId);

    const roots = await prisma.task.findMany({
      where: {
        task_group_id: groupId,
        parent_task_id: null,
        is_archived: false,
      },
      select: { id: true },
      orderBy: { position: 'asc' },
    });
    const existingSet = new Set(roots.map((r) => r.id));

    if (roots.length === 0) {
      if (orderedIds.length > 0) {
        throw new ValidationError('Nhóm không có task gốc để sắp xếp');
      }
      return;
    }

    if (orderedIds.length !== roots.length) {
      throw new ValidationError('Số lượng task không khớp với nhóm');
    }

    const seen = new Set<number>();
    for (const id of orderedIds) {
      if (!existingSet.has(id)) {
        throw new ValidationError('Có task không thuộc nhóm hoặc không phải task gốc');
      }
      if (seen.has(id)) {
        throw new ValidationError('Danh sách thứ tự không được trùng id');
      }
      seen.add(id);
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.task.update({
          where: { id },
          data: { position: index, updated_at: new Date() },
        }),
      ),
    );

    await prisma.activitylog.create({
      data: {
        user_id: actorId,
        action: 'REORDER_TASKS',
        details: `Sắp xếp lại task trong nhóm #${groupId}`,
        target_table: 'taskgroup',
        target_id: groupId,
      },
    });

    emitTaskUpdated(group.project_id, {
      task_id: orderedIds[0]!,
      project_id: group.project_id,
    });
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async loadTaskForPermission(taskId: number) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        taskgroup: { select: { project_id: true } },
        taskassignee: { select: { user_id: true } },
      },
    });
    if (!task || task.taskgroup?.project_id == null) {
      throw new NotFoundError('Không tìm thấy công việc');
    }
    return {
      id: task.id,
      project_id: task.taskgroup.project_id,
      creator_id: task.creator_id,
      status: task.status,
      taskassignee: task.taskassignee,
    };
  }

  private async loadTaskProjectId(taskId: number): Promise<{ projectId: number }> {
    const t = await prisma.task.findUnique({
      where: { id: taskId },
      include: { taskgroup: { select: { project_id: true } } },
    });
    if (!t?.taskgroup?.project_id) {
      throw new NotFoundError('Không tìm thấy công việc');
    }
    return { projectId: t.taskgroup.project_id };
  }

  private async validateAssigneesAreProjectMembers(projectId: number, userIds: number[]): Promise<void> {
    const members = await prisma.projectmember.findMany({
      where: { project_id: projectId, user_id: { in: userIds } },
      select: { user_id: true },
    });
    const set = new Set(members.map((m) => m.user_id));
    const missing = userIds.filter((id) => !set.has(id));
    if (missing.length) {
      throw new ValidationError('Một số người được giao không phải thành viên dự án');
    }
  }

  private async assertTaskEditPermission(
    projectId: number,
    task: { creator_id: number | null; taskassignee: { user_id: number }[] },
    actorId: number,
  ): Promise<void> {
    const requester = await prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, company_id: true },
    });
    if (!requester) throw new NotFoundError('Không tìm thấy người dùng');

    if (requester.role === 'Admin') {
      const p = await prisma.project.findUnique({
        where: { id: projectId },
        select: { company_id: true },
      });
      if (!p || p.company_id !== requester.company_id) {
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
    if (membership?.role === 'Manager') return;
    if (task.creator_id === actorId) return;
    if (task.taskassignee.some((a) => a.user_id === actorId)) return;

    throw new ForbiddenError('Bạn không có quyền chỉnh sửa công việc này');
  }

  private async assertTaskProgressPermission(
    projectId: number,
    task: { creator_id: number | null; taskassignee: { user_id: number }[] },
    actorId: number,
  ): Promise<void> {
    await assertProjectAccess(projectId, actorId);
    if (task.creator_id === actorId) return;
    if (task.taskassignee.some((a) => a.user_id === actorId)) return;
    throw new ForbiddenError('Chỉ người tạo hoặc người được giao mới cập nhật tiến độ');
  }

  private async assertAssignUnassignPermission(
    projectId: number,
    creatorId: number | null,
    actorId: number,
  ): Promise<void> {
    if (creatorId === actorId) return;
    await assertManagerOrAdminOnProject(
      projectId,
      actorId,
      'Chỉ Admin, Manager dự án hoặc người tạo task mới giao / bỏ giao được',
    );
  }

  private async assertCanCompleteFromReview(
    projectId: number,
    creatorId: number | null,
    actorId: number,
  ): Promise<void> {
    if (creatorId === actorId) return;
    await assertManagerOrAdminOnProject(
      projectId,
      actorId,
      'Chỉ Admin, Manager dự án hoặc người tạo task mới duyệt hoàn thành từ trạng thái Chờ xác nhận',
    );
  }

  /** BFS: từ successor, đi ngược predecessor_id; nếu gặp predecessor mới → chu trình khi thêm cạnh (pred → succ). */
  private async wouldCreateDependencyCycle(predecessorId: number, successorId: number): Promise<boolean> {
    const visited = new Set<number>();
    const queue: number[] = [successorId];

    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === predecessorId) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);

      const rows = await prisma.taskdependency.findMany({
        where: { successor_id: cur },
        select: { predecessor_id: true },
      });
      for (const r of rows) {
        queue.push(r.predecessor_id);
      }
    }
    return false;
  }
}

export const taskService = new TaskService();
