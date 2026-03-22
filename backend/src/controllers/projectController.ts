import { Request, Response } from 'express';
import { projectService } from '../services/ProjectService';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, UnauthorizedError } from '../utils/AppError';

function parseId(raw: string | string[] | undefined, label = 'ID'): number {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str ?? '', 10);
  if (isNaN(id)) throw new ValidationError(`${label} không hợp lệ`);
  return id;
}

export const createProject = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const data = await projectService.createProject(req.body, userId);
  res.status(201).json({ success: true, message: 'Tạo dự án thành công', data });
});

export const getAllProjects = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const data = await projectService.getAllProjects(userId, req.user.role);
  res.status(200).json({ success: true, message: 'Lấy danh sách dự án thành công', data });
});

export const getProjectById = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const projectId = parseId(req.params.id, 'ID dự án');
  const data = await projectService.getProjectById(projectId, userId);
  res.status(200).json({ success: true, message: 'Lấy thông tin dự án thành công', data });
});

export const updateProject = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const projectId = parseId(req.params.id, 'ID dự án');
  const data = await projectService.updateProject(projectId, req.body, userId);
  res.status(200).json({ success: true, message: 'Cập nhật dự án thành công', data });
});

export const deleteProject = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const projectId = parseId(req.params.id, 'ID dự án');
  const data = await projectService.deleteProject(projectId, userId);
  res.status(200).json({ success: true, message: 'Lưu trữ dự án thành công', data });
});

export const getProjectMembers = asyncHandler(async (req: Request | any, res: Response) => {
  const projectId = parseId(req.params.id, 'ID dự án');
  const data = await projectService.getProjectMembers(projectId);
  res.status(200).json({ success: true, message: 'Lấy danh sách thành viên thành công', data });
});

export const getMemberCandidates = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const projectId = parseId(req.params.id, 'ID dự án');
  const data = await projectService.getMemberCandidates(projectId, actorId);
  res.status(200).json({ success: true, message: 'Lấy danh sách ứng viên thành công', data });
});

export const addProjectMember = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const projectId = parseId(req.params.id, 'ID dự án');
  const data = await projectService.addProjectMember(projectId, req.body, userId);
  res.status(201).json({ success: true, message: 'Thêm thành viên thành công', data });
});

export const removeProjectMember = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const projectId = parseId(req.params.id, 'ID dự án');
  const targetUserId = parseId(req.params.userId, 'ID người dùng');
  const data = await projectService.removeProjectMember(projectId, targetUserId, actorId);
  res.status(200).json({ success: true, message: 'Xóa thành viên thành công', data });
});

export const updateMemberRole = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const projectId = parseId(req.params.id, 'ID dự án');
  const targetUserId = parseId(req.params.userId, 'ID người dùng');
  const data = await projectService.updateMemberRole(projectId, targetUserId, req.body, actorId);
  res.status(200).json({ success: true, message: 'Cập nhật vai trò thành viên thành công', data });
});

export const getProjectStats = asyncHandler(async (req: Request | any, res: Response) => {
  const projectId = parseId(req.params.id, 'ID dự án');
  const data = await projectService.getProjectStats(projectId);
  res.status(200).json({ success: true, message: 'Lấy thống kê dự án thành công', data });
});
