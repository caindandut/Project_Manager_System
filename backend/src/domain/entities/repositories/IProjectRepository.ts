import { Project } from '../Project';

export interface IProjectRepository {
  findById(id: number): Promise<Project | null>;
  findByCompany(companyId: number): Promise<Project[]>;
  findByManager(managerId: number): Promise<Project[]>;

  /**
   * Lưu (tạo mới hoặc cập nhật) một Project.
   * Tuỳ cách triển khai, có thể dựa vào id === 0 để phân biệt create/update
   * hoặc tách riêng create/update ở implementation.
   */
  save(project: Project): Promise<Project>;
}

