import { Request, Response } from 'express';
import { taskGroupService } from '../services/TaskGroupService';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError, ValidationError } from '../utils/AppError';

function parseId(raw: string | string[] | undefined, label = 'ID'): number {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str ?? '', 10);
  if (isNaN(id)) throw new ValidationError(`${label} không hợp lệ`);
  return id;
}

export const getTaskGroups = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const projectId = parseId(req.params.projectId, 'ID dự án');
  const data = await taskGroupService.getTaskGroups(projectId, actorId);
  res.status(200).json({ success: true, message: 'Lấy danh sách nhóm công việc thành công', data });
});

export const createTaskGroup = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const projectId = parseId(req.params.projectId, 'ID dự án');
  const { group_name } = req.body;
  const data = await taskGroupService.createTaskGroup(projectId, group_name, actorId);
  res.status(201).json({ success: true, message: 'Tạo nhóm công việc thành công', data });
});

export const reorderTaskGroups = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const projectId = parseId(req.params.projectId, 'ID dự án');
  const { ordered_ids } = req.body;
  const data = await taskGroupService.reorderTaskGroups(projectId, ordered_ids, actorId);
  res.status(200).json({ success: true, message: 'Cập nhật thứ tự nhóm thành công', data });
});

export const updateTaskGroup = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const groupId = parseId(req.params.id, 'ID nhóm');
  const data = await taskGroupService.updateTaskGroup(groupId, req.body, actorId);
  res.status(200).json({ success: true, message: 'Cập nhật nhóm công việc thành công', data });
});

export const deleteTaskGroup = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const groupId = parseId(req.params.id, 'ID nhóm');
  await taskGroupService.deleteTaskGroup(groupId, actorId);
  res.status(200).json({ success: true, message: 'Xóa nhóm công việc thành công' });
});
