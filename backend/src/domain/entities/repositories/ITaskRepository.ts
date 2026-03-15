import { Task } from '../Task';

export interface ITaskRepository {
  findById(id: number): Promise<Task | null>;
  findByProject(projectId: number): Promise<Task[]>;
  findByTaskGroup(taskGroupId: number): Promise<Task[]>;
  findByAssignee(userId: number): Promise<Task[]>;

  /**
   * Tạo mới một Task.
   */
  create(task: Task): Promise<Task>;

  /**
   * Cập nhật Task hiện có.
   */
  update(task: Task): Promise<Task>;
}

