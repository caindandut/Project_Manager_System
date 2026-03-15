import { prisma } from '../../lib/prisma';
import { Task, TaskPriority, TaskStatus } from '../../domain/entities/Task';
import { ITaskRepository } from '../../domain/entities/repositories/ITaskRepository';

function toDomain(task: any): Task {
  return new Task({
    id: task.id,
    projectId: task.taskgroup?.project_id ?? null,
    taskGroupId: task.task_group_id,
    parentTaskId: task.parent_task_id,
    creatorId: task.creator_id,
    title: task.title,
    description: task.description,
    deadline: task.deadline,
    priority: (task.priority as TaskPriority | null) ?? TaskPriority.MEDIUM,
    status: (task.status as TaskStatus | null) ?? TaskStatus.TODO,
    completionPercent: task.completion_percent ?? 0,
    position: task.position,
    isArchived: task.is_archived ?? false,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  });
}

export class PrismaTaskRepository implements ITaskRepository {
  async findById(id: number): Promise<Task | null> {
    const record = await prisma.task.findUnique({
      where: { id },
      include: { taskgroup: true },
    });
    if (!record) return null;
    return toDomain(record);
  }

  async findByProject(projectId: number): Promise<Task[]> {
    const records = await prisma.task.findMany({
      where: { taskgroup: { project_id: projectId } },
      include: { taskgroup: true },
      orderBy: { position: 'asc' },
    });
    return records.map(toDomain);
  }

  async findByTaskGroup(taskGroupId: number): Promise<Task[]> {
    const records = await prisma.task.findMany({
      where: { task_group_id: taskGroupId },
      include: { taskgroup: true },
      orderBy: { position: 'asc' },
    });
    return records.map(toDomain);
  }

  async findByAssignee(userId: number): Promise<Task[]> {
    const records = await prisma.task.findMany({
      where: {
        taskassignee: {
          some: { user_id: userId },
        },
      },
      include: { taskgroup: true },
      orderBy: { deadline: 'asc' },
    });
    return records.map(toDomain);
  }

  async create(task: Task): Promise<Task> {
    const record = await prisma.task.create({
      data: {
        parent_task_id: task.parentTaskId ?? undefined,
        task_group_id: task.taskGroupId ?? undefined,
        creator_id: task.creatorId ?? undefined,
        title: task.title,
        description: task.description ?? undefined,
        deadline: task.deadline ?? undefined,
        priority: task.priority,
        status: task.status,
        completion_percent: task.completionPercent,
        position: task.position ?? undefined,
        is_archived: task.isArchived,
      },
      include: { taskgroup: true },
    });
    return toDomain(record);
  }

  async update(task: Task): Promise<Task> {
    const record = await prisma.task.update({
      where: { id: task.id },
      data: {
        parent_task_id: task.parentTaskId ?? undefined,
        task_group_id: task.taskGroupId ?? undefined,
        creator_id: task.creatorId ?? undefined,
        title: task.title,
        description: task.description ?? undefined,
        deadline: task.deadline ?? undefined,
        priority: task.priority,
        status: task.status,
        completion_percent: task.completionPercent,
        position: task.position ?? undefined,
        is_archived: task.isArchived,
      },
      include: { taskgroup: true },
    });
    return toDomain(record);
  }
}

