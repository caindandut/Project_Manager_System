import { prisma } from '../lib/prisma';
import type { UpdateCompanyInput } from '../validators/companyValidator';

const DEFAULT_COMPANY_NAME = 'Công ty mặc định';

export class CompanyService {
  async getCompany() {
    let company = await prisma.company.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          company_name: DEFAULT_COMPANY_NAME,
          logo_path: null,
          field: null,
          scale: null,
        },
      });
    }

    return company;
  }

  async updateCompany(data: UpdateCompanyInput) {
    const existing = await prisma.company.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!existing) {
      const created = await prisma.company.create({
        data: {
          company_name: (data.name && String(data.name).trim()) || DEFAULT_COMPANY_NAME,
          logo_path: data.logo != null && data.logo !== '' ? String(data.logo) : null,
          field: data.industry != null && data.industry !== '' ? String(data.industry) : null,
          scale: data.size != null && data.size !== '' ? String(data.size) : null,
        },
      });
      return created;
    }

    const updated = await prisma.company.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined && {
          company_name: String(data.name).trim() || existing.company_name,
        }),
        ...(data.logo !== undefined && {
          logo_path: data.logo == null || data.logo === '' ? null : String(data.logo),
        }),
        ...(data.industry !== undefined && {
          field: data.industry == null || data.industry === '' ? null : String(data.industry),
        }),
        ...(data.size !== undefined && {
          scale: data.size == null || data.size === '' ? null : String(data.size),
        }),
      },
    });

    return updated;
  }
}

export const companyService = new CompanyService();

