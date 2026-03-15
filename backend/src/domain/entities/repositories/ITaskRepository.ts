import { Task } from '../Task';

export interface ITaskRepository {
  findById(id: number): Promise<Task | null>;
  findByProject(projectId: number): Promise<Task[]>;
  findByTaskGroup(taskGroupId: number): Promise<Task[]>;
  findByAssignee(userId: number): Promise<Task[]>;

  create(task: Task): Promise<Task>;
  update(task: Task): Promise<Task>;
}

