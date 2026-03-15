import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const DEFAULT_COMPANY_NAME = 'Công ty mặc định';

/** GET /api/company — Lấy thông tin công ty đầu tiên, nếu chưa có thì tạo mới 1 record mặc định */
export const getCompany = async (_req: Request, res: Response): Promise<void> => {
  try {
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

    res.status(200).json({
      success: true,
      message: 'Lấy thông tin công ty thành công',
      data: {
        id: company.id,
        name: company.company_name,
        logo: company.logo_path,
        industry: company.field,
        size: company.scale,
      },
    });
  } catch (error) {
    console.error('getCompany error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin công ty',
      data: null,
    });
  }
};

/** PUT /api/company — Cập nhật thông tin công ty (yêu cầu Role Admin) */
export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, logo, industry, size } = req.body;

    let company = await prisma.company.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          company_name: (name && String(name).trim()) || DEFAULT_COMPANY_NAME,
          logo_path: logo != null ? String(logo) : null,
          field: industry != null ? String(industry) : null,
          scale: size != null ? String(size) : null,
        },
      });
    } else {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          ...(name !== undefined && { company_name: String(name).trim() || company.company_name }),
          ...(logo !== undefined && { logo_path: logo == null || logo === '' ? null : String(logo) }),
          ...(industry !== undefined && { field: industry == null || industry === '' ? null : String(industry) }),
          ...(size !== undefined && { scale: size == null || size === '' ? null : String(size) }),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin công ty thành công',
      data: {
        id: company.id,
        name: company.company_name,
        logo: company.logo_path,
        industry: company.field,
        size: company.scale,
      },
    });
  } catch (error) {
    console.error('updateCompany error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật công ty',
      data: null,
    });
  }
};
