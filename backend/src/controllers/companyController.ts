import { Request, Response } from 'express';
import { companyService } from '../services/CompanyService';
import { asyncHandler } from '../utils/asyncHandler';

/** GET /api/company — Lấy thông tin công ty đầu tiên, nếu chưa có thì tạo mới 1 record mặc định */
export const getCompany = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const company = await companyService.getCompany();

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
});

/** PUT /api/company — Cập nhật thông tin công ty (yêu cầu Role Admin) */
export const updateCompany = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const company = await companyService.updateCompany(req.body);

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
});

