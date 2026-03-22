import { ValidationError } from '../../utils/AppError';

/** Đồng bộ Prisma enum `task_priority` */
export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

/** Đồng bộ Prisma enum `task_status` */
export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'InProgress',
  REVIEW = 'Review',
  COMPLETED = 'Completed',
  OVERDUE = 'Overdue',
}

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.TODO],
  [TaskStatus.REVIEW]: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.OVERDUE]: [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW],
};

export interface TaskProps {
  id: number;
  projectId: number | null;
  taskGroupId: number | null;
  parentTaskId: number | null;
  creatorId: number | null;
  title: string;
  /** Nhãn kỹ thuật cấp task (Backend, Design…) — khác label project */
  label: string | null;
  description: string | null;
  deadline: Date | null;
  priority: TaskPriority | null;
  status: TaskStatus | null;
  completionPercent: number;
  position: number | null;
  isArchived: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Task {
  private readonly _id: number;
  private readonly _projectId: number | null;
  private readonly _taskGroupId: number | null;
  private readonly _parentTaskId: number | null;
  private readonly _creatorId: number | null;
  private readonly _title: string;
  private readonly _label: string | null;
  private readonly _description: string | null;
  private readonly _deadline: Date | null;
  private readonly _priority: TaskPriority | null;
  private readonly _status: TaskStatus | null;
  private readonly _completionPercent: number;
  private readonly _position: number | null;
  private readonly _isArchived: boolean;
  private readonly _createdAt: Date | null;
  private readonly _updatedAt: Date | null;

  constructor(props: TaskProps) {
    this._id = props.id;
    this._projectId = props.projectId;
    this._taskGroupId = props.taskGroupId;
    this._parentTaskId = props.parentTaskId;
    this._creatorId = props.creatorId;
    this._title = props.title;
    this._label = props.label;
    this._description = props.description;
    this._deadline = props.deadline;
    this._priority = props.priority;
    this._status = props.status;
    this._completionPercent = props.completionPercent;
    this._position = props.position;
    this._isArchived = props.isArchived;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): number {
    return this._id;
  }
  get projectId(): number | null {
    return this._projectId;
  }
  get taskGroupId(): number | null {
    return this._taskGroupId;
  }
  get parentTaskId(): number | null {
    return this._parentTaskId;
  }
  get creatorId(): number | null {
    return this._creatorId;
  }
  get title(): string {
    return this._title;
  }
  get label(): string | null {
    return this._label;
  }
  get description(): string | null {
    return this._description;
  }
  get deadline(): Date | null {
    return this._deadline;
  }
  get priority(): TaskPriority | null {
    return this._priority;
  }
  get status(): TaskStatus | null {
    return this._status;
  }
  get completionPercent(): number {
    return this._completionPercent;
  }
  get position(): number | null {
    return this._position;
  }
  get isArchived(): boolean {
    return this._isArchived;
  }
  get createdAt(): Date | null {
    return this._createdAt;
  }
  get updatedAt(): Date | null {
    return this._updatedAt;
  }

  static assertStatusTransition(from: TaskStatus, to: TaskStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new ValidationError(`Không thể chuyển trạng thái từ ${from} sang ${to}`);
    }
  }

  static assertProgress(percent: number): void {
    if (percent < 0 || percent > 100 || !Number.isFinite(percent)) {
      throw new ValidationError('Tiến độ phải từ 0 đến 100');
    }
  }

  static isOverdue(
    deadline: Date | string | null | undefined,
    status: TaskStatus | string | null | undefined,
    isArchived?: boolean | null,
  ): boolean {
    if (isArchived) return false;
    const s = status as string;
    if (s === TaskStatus.COMPLETED || s === 'Completed') return false;
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }
}
