import { Request, Response } from 'express';
import { reportService } from '../services/ReportService';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/AppError';
import { parseRequestId } from '../utils/parseRequestId';

export const getDashboardStats = asyncHandler(
  async (req: Request | any, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) throw new UnauthorizedError();

    const data = await reportService.getDashboardStats(userId, role);
    res.status(200).json({
      success: true,
      message: 'Lấy thống kê dashboard thành công',
      data,
    });
  },
);

export const getProjectReport = asyncHandler(
  async (req: Request | any, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const projectId = parseRequestId(req.params.id, 'ID dự án');
    const data = await reportService.getProjectReport(projectId, userId);
    res.status(200).json({
      success: true,
      message: 'Lấy báo cáo dự án thành công',
      data,
    });
  },
);

export const getBurndownData = asyncHandler(
  async (req: Request | any, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const projectId = parseRequestId(req.params.id, 'ID dự án');
    const data = await reportService.getBurndownData(projectId, userId);
    res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu burndown thành công',
      data,
    });
  },
);

export const getEmployeeReport = asyncHandler(
  async (req: Request | any, res: Response) => {
    const actorId = req.user?.id;
    if (!actorId) throw new UnauthorizedError();

    const targetUserId = parseRequestId(req.params.id, 'ID nhân viên');
    const projectId = req.query.projectId
      ? parseRequestId(req.query.projectId as string, 'ID dự án')
      : undefined;

    const data = await reportService.getEmployeeReport(
      targetUserId,
      actorId,
      projectId,
    );
    res.status(200).json({
      success: true,
      message: 'Lấy báo cáo nhân viên thành công',
      data,
    });
  },
);
