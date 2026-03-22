import { prisma } from '../../lib/prisma';
import { Project, ProjectStatus } from '../../domain/entities/Project';
import { IProjectRepository } from '../../domain/entities/repositories/IProjectRepository';

function toDomain(project: any): Project {
  return new Project({
    id: project.id,
    companyId: project.company_id,
    managerId: project.manager_id,
    name: project.project_name,
    description: project.description,
    startDate: project.start_date,
    endDate: project.end_date,
    colorCode: project.color_code,
    label: project.label,
    priority: project.priority ?? 'Medium',
    status: (project.status as ProjectStatus | null) ?? ProjectStatus.ACTIVE,
    createdAt: project.created_at,
  });
}

export class PrismaProjectRepository implements IProjectRepository {
  async findById(id: number): Promise<Project | null> {
    const record = await prisma.project.findUnique({ where: { id } });
    if (!record) return null;
    return toDomain(record);
  }

  async findByCompany(companyId: number): Promise<Project[]> {
    const records = await prisma.project.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
    return records.map(toDomain);
  }

  async findByManager(managerId: number): Promise<Project[]> {
    const records = await prisma.project.findMany({
      where: { manager_id: managerId },
      orderBy: { created_at: 'desc' },
    });
    return records.map(toDomain);
  }

  async create(project: Project): Promise<Project> {
    const record = await prisma.project.create({
      data: {
        company_id: project.companyId ?? undefined,
        manager_id: project.managerId ?? undefined,
        project_name: project.name,
        description: project.description ?? undefined,
        start_date: project.startDate ?? undefined,
        end_date: project.endDate ?? undefined,
        color_code: project.colorCode ?? undefined,
        label: project.label ?? undefined,
        priority: project.priority ?? undefined,
        status: project.status ?? undefined,
      },
    });
    return toDomain(record);
  }

  async update(project: Project): Promise<Project> {
    const record = await prisma.project.update({
      where: { id: project.id },
      data: {
        company_id: project.companyId ?? undefined,
        manager_id: project.managerId ?? undefined,
        project_name: project.name,
        description: project.description ?? undefined,
        start_date: project.startDate ?? undefined,
        end_date: project.endDate ?? undefined,
        color_code: project.colorCode ?? undefined,
        label: project.label ?? undefined,
        priority: project.priority ?? undefined,
        status: project.status ?? undefined,
      },
    });
    return toDomain(record);
  }
}

