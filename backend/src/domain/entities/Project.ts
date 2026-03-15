export enum ProjectStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  ARCHIVED = 'Archived',
}

export interface ProjectProps {
  id: number;
  companyId: number | null;
  managerId: number | null;
  name: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  colorCode?: string | null;
  label?: string | null;
  status?: ProjectStatus;
  createdAt?: Date | null;
}

/**
 * Project domain entity.
 * Đóng gói các rule cơ bản về ngày và trạng thái.
 */
export class Project {
  private _id: number;
  private _companyId: number | null;
  private _managerId: number | null;
  private _name: string;
  private _description: string | null;
  private _startDate: Date | null;
  private _endDate: Date | null;
  private _colorCode: string | null;
  private _label: string | null;
  private _status: ProjectStatus;
  private _createdAt: Date | null;

  constructor(props: ProjectProps) {
    this._id = props.id;
    this._companyId = props.companyId ?? null;
    this._managerId = props.managerId ?? null;
    this._name = props.name.trim();
    this._description = props.description ?? null;
    this._startDate = props.startDate ?? null;
    this._endDate = props.endDate ?? null;
    this._colorCode = props.colorCode ?? '#000000';
    this._label = props.label ?? null;
    this._status = props.status ?? ProjectStatus.ACTIVE;
    this._createdAt = props.createdAt ?? null;

    this.ensureValidDates();
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

  get status(): ProjectStatus {
    return this._status;
  }

  get createdAt(): Date | null {
    return this._createdAt;
  }

  /**
   * Kiểm tra ngày bắt đầu/kết thúc hợp lệ:
   * - Nếu cả startDate và endDate đều có giá trị → endDate phải >= startDate.
   */
  private ensureValidDates(): void {
    if (this._startDate && this._endDate && this._endDate < this._startDate) {
      throw new Error('Ngày kết thúc dự án không được nhỏ hơn ngày bắt đầu');
    }
  }

  /**
   * Cập nhật tên dự án (trim và không cho phép chuỗi rỗng).
   */
  rename(newName: string): void {
    const value = newName.trim();
    if (!value) {
      throw new Error('Tên dự án không được để trống');
    }
    this._name = value;
  }

  /**
   * Cập nhật mô tả.
   */
  updateDescription(description: string | null): void {
    this._description = description ?? null;
  }

  /**
   * Cập nhật ngày bắt đầu/kết thúc, đồng thời validate lại rule ngày.
   */
  updateDates(startDate: Date | null, endDate: Date | null): void {
    this._startDate = startDate;
    this._endDate = endDate;
    this.ensureValidDates();
  }

  /**
   * Cập nhật màu nhận diện (mã hex 7 ký tự, ví dụ: #FF0000).
   */
  updateColor(colorCode: string | null): void {
    if (colorCode && !/^#[0-9A-Fa-f]{6}$/.test(colorCode)) {
      throw new Error('Mã màu dự án phải là dạng #RRGGBB');
    }
    this._colorCode = colorCode;
  }

  /**
   * Đổi nhãn (label) hiển thị cho dự án.
   */
  updateLabel(label: string | null): void {
    this._label = label ?? null;
  }

  /**
   * Đánh dấu hoàn thành dự án.
   * Thực tế phần kiểm tra “tất cả task đã Done” sẽ được thực hiện ở service,
   * entity chỉ chịu trách nhiệm chuyển trạng thái.
   */
  complete(): void {
    if (this._status === ProjectStatus.ARCHIVED) {
      throw new Error('Không thể hoàn thành dự án đã được lưu trữ');
    }
    this._status = ProjectStatus.COMPLETED;
  }

  /**
   * Lưu trữ (archive) dự án. Thường được gọi sau khi dự án đã hoàn thành,
   * nhưng rule đó sẽ do layer service đảm bảo.
   */
  archive(): void {
    this._status = ProjectStatus.ARCHIVED;
  }

  /**
   * Kiểm tra dự án đã quá hạn hay chưa (endDate < hôm nay và chưa Completed/Archived).
   */
  isOverdue(referenceDate: Date = new Date()): boolean {
    if (!this._endDate) return false;
    if (this._status === ProjectStatus.COMPLETED || this._status === ProjectStatus.ARCHIVED) {
      return false;
    }
    return this._endDate < referenceDate;
  }
}

