import { Task } from '../Task';

export interface ITaskRepository {
  findById(id: number): Promise<Task | null>;
  findByProject(projectId: number): Promise<Task[]>;
  findByTaskGroup(taskGroupId: number): Promise<Task[]>;
  findByAssignee(userId: number): Promise<Task[]>;

  /**
   * Lưu (tạo mới hoặc cập nhật) một Task.
   * Chi tiết ánh xạ sang Prisma/ORM sẽ do lớp triển khai phụ trách.
   */
  save(task: Task): Promise<Task>;
}

