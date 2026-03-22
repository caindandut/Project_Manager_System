import { ValidationError } from '../../utils/AppError';

/** Đồng bộ Prisma enum `project_status` */
export enum ProjectStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  ARCHIVED = 'Archived',
}

/** Đồng bộ Prisma enum `project_priority` */
export type ProjectPriorityValue = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ProjectProps {
  id: number;
  companyId: number | null;
  managerId: number | null;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  colorCode: string | null;
  label: string | null;
  priority: ProjectPriorityValue | null;
  status: ProjectStatus | null;
  createdAt: Date | null;
}

/**
 * Domain entity Project — dùng với PrismaProjectRepository + rule tĩnh cho service.
 */
export class Project {
  private readonly _id: number;
  private readonly _companyId: number | null;
  private readonly _managerId: number | null;
  private readonly _name: string;
  private readonly _description: string | null;
  private readonly _startDate: Date | null;
  private readonly _endDate: Date | null;
  private readonly _colorCode: string | null;
  private readonly _label: string | null;
  private readonly _priority: ProjectPriorityValue | null;
  private readonly _status: ProjectStatus | null;
  private readonly _createdAt: Date | null;

  constructor(props: ProjectProps) {
    this._id = props.id;
    this._companyId = props.companyId;
    this._managerId = props.managerId;
    this._name = props.name;
    this._description = props.description;
    this._startDate = props.startDate;
    this._endDate = props.endDate;
    this._colorCode = props.colorCode;
    this._label = props.label;
    this._priority = props.priority;
    this._status = props.status;
    this._createdAt = props.createdAt;
  }

  get id(): number {
    return this._id;
  }
  get companyId(): number | null {
    return this._companyId;
  }
  get managerId(): number | null {
    return this._managerId;
  }
  get name(): string {
    return this._name;
  }
  get description(): string | null {
    return this._description;
  }
  get startDate(): Date | null {
    return this._startDate;
  }
  get endDate(): Date | null {
    return this._endDate;
  }
  get colorCode(): string | null {
    return this._colorCode;
  }
  get label(): string | null {
    return this._label;
  }
  get priority(): ProjectPriorityValue | null {
    return this._priority;
  }
  get status(): ProjectStatus | null {
    return this._status;
  }
  get createdAt(): Date | null {
    return this._createdAt;
  }

  static assertDateOrder(
    start: Date | string | null | undefined,
    end: Date | string | null | undefined,
  ): void {
    if (start == null || end == null || start === '' || end === '') return;
    if (new Date(end) <= new Date(start)) {
      throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
    }
  }

  static isOverdue(
    endDate: Date | string | null | undefined,
    status: ProjectStatus | string | null | undefined,
  ): boolean {
    if (!endDate) return false;
    if (
      status === ProjectStatus.COMPLETED ||
      status === ProjectStatus.ARCHIVED ||
      status === 'Completed' ||
      status === 'Archived'
    ) {
      return false;
    }
    return new Date(endDate) < new Date();
  }
}
