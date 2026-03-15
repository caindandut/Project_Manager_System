export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'InProgress',
  REVIEW = 'Review',
  COMPLETED = 'Completed',
  OVERDUE = 'Overdue',
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

export interface TaskProps {
  id: number;
  projectId: number | null;
  taskGroupId: number | null;
  parentTaskId: number | null;
  creatorId: number | null;
  title: string;
  description?: string | null;
  deadline?: Date | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  completionPercent?: number | null;
  position?: number | null;
  isArchived?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

/**
 * Task domain entity.
 * Đóng gói rule về trạng thái, % hoàn thành, deadline.
 */
export class Task {
  private _id: number;
  private _projectId: number | null;
  private _taskGroupId: number | null;
  private _parentTaskId: number | null;
  private _creatorId: number | null;
  private _title: string;
  private _description: string | null;
  private _deadline: Date | null;
  private _priority: TaskPriority;
  private _status: TaskStatus;
  private _completionPercent: number;
  private _position: number | null;
  private _isArchived: boolean;
  private _createdAt: Date | null;
  private _updatedAt: Date | null;

  constructor(props: TaskProps) {
    this._id = props.id;
    this._projectId = props.projectId ?? null;
    this._taskGroupId = props.taskGroupId ?? null;
    this._parentTaskId = props.parentTaskId ?? null;
    this._creatorId = props.creatorId ?? null;
    this._title = props.title.trim();
    this._description = props.description ?? null;
    this._deadline = props.deadline ?? null;
    this._priority = props.priority ?? TaskPriority.MEDIUM;
    this._status = props.status ?? TaskStatus.TODO;
    this._completionPercent = props.completionPercent ?? 0;
    this._position = props.position ?? 0;
    this._isArchived = props.isArchived ?? false;
    this._createdAt = props.createdAt ?? null;
    this._updatedAt = props.updatedAt ?? null;

    this.ensureValidTitle();
    this.ensureValidCompletionPercent();
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

  get description(): string | null {
    return this._description;
  }

  get deadline(): Date | null {
    return this._deadline;
  }

  get priority(): TaskPriority {
    return this._priority;
  }

  get status(): TaskStatus {
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

  private ensureValidTitle(): void {
    if (!this._title) {
      throw new Error('Tiêu đề công việc không được để trống');
    }
  }

  private ensureValidCompletionPercent(): void {
    if (this._completionPercent < 0 || this._completionPercent > 100) {
      throw new Error('Phần trăm hoàn thành phải nằm trong khoảng 0-100');
    }
  }

  /**
   * Cập nhật tiêu đề task.
   */
  rename(newTitle: string): void {
    this._title = newTitle.trim();
    this.ensureValidTitle();
  }

  /**
   * Cập nhật mô tả.
   */
  updateDescription(description: string | null): void {
    this._description = description ?? null;
  }

  /**
   * Cập nhật deadline.
   */
  updateDeadline(deadline: Date | null): void {
    this._deadline = deadline ?? null;
  }

  /**
   * Cập nhật độ ưu tiên.
   */
  updatePriority(priority: TaskPriority): void {
    this._priority = priority;
  }

  /**
   * Cập nhật trạng thái theo flow:
   * Todo -> InProgress -> Review -> Completed.
   * Không cho nhảy cóc (VD: Todo -> Completed).
   */
  updateStatus(newStatus: TaskStatus): void {
    if (this._status === newStatus) return;

    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.TODO],
      [TaskStatus.REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
      [TaskStatus.COMPLETED]: [TaskStatus.COMPLETED],
      [TaskStatus.OVERDUE]: [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.COMPLETED],
    };

    const allowed = validTransitions[this._status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Không cho phép chuyển trạng thái từ ${this._status} sang ${newStatus}`);
    }

    this._status = newStatus;
  }

  /**
   * Cập nhật % hoàn thành.
   * - Giới hạn 0-100.
   * - Nếu % tăng lên 100, tự động chuyển trạng thái sang Completed (nếu chưa Archived).
   * - Không cho giảm % nếu task đã Completed.
   */
  updateCompletionPercent(percent: number): void {
    if (percent < 0 || percent > 100) {
      throw new Error('Phần trăm hoàn thành phải nằm trong khoảng 0-100');
    }

    if (this._status === TaskStatus.COMPLETED && percent < this._completionPercent) {
      throw new Error('Không thể giảm % hoàn thành của công việc đã hoàn thành');
    }

    this._completionPercent = percent;

    if (percent === 100 && this._status !== TaskStatus.COMPLETED && !this._isArchived) {
      this._status = TaskStatus.COMPLETED;
    }
  }

  /**
   * Đánh dấu task đã được lưu trữ.
   * Chỉ cho phép archive khi đã Completed (quy tắc này đảm bảo inside entity).
   */
  archive(): void {
    if (this._status !== TaskStatus.COMPLETED) {
      throw new Error('Chỉ có thể lưu trữ công việc khi đã hoàn thành');
    }
    this._isArchived = true;
  }

  /**
   * Kiểm tra task đã quá hạn hay chưa (deadline < hôm nay và chưa Completed/Archived).
   * Nếu quá hạn, có thể dùng ở layer ngoài để cập nhật status -> Overdue.
   */
  isOverdue(referenceDate: Date = new Date()): boolean {
    if (!this._deadline) return false;
    if (this._status === TaskStatus.COMPLETED || this._isArchived) return false;
    return this._deadline < referenceDate;
  }
}

