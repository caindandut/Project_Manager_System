import { Project } from '../Project';

export interface IProjectRepository {
  findById(id: number): Promise<Project | null>;
  findByCompany(companyId: number): Promise<Project[]>;
  findByManager(managerId: number): Promise<Project[]>;

  /**
   * Tạo mới một Project.
   */
  create(project: Project): Promise<Project>;

  /**
   * Cập nhật Project hiện có.
   */
  update(project: Project): Promise<Project>;
}

