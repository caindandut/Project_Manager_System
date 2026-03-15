import { Project } from '../Project';

export interface IProjectRepository {
  findById(id: number): Promise<Project | null>;
  findByCompany(companyId: number): Promise<Project[]>;
  findByManager(managerId: number): Promise<Project[]>;

  create(project: Project): Promise<Project>;
  update(project: Project): Promise<Project>;
}

