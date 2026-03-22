import { Request, Response } from 'express';
import { task_status } from '@prisma/client';
import { taskService } from '../services/TaskService';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/AppError';
import { parseRequestId } from '../utils/parseRequestId';

export const getMyTasks = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const filters = req.validatedQuery ?? req.query;
  const data = await taskService.getMyTasks(userId, filters);
  res.status(200).json({ success: true, message: 'Lấy công việc được giao thành công', data });
});

export const createTask = asyncHandler(async (req: Request | any, res: Response) => {
  const creatorId = req.user?.id;
  if (!creatorId) throw new UnauthorizedError();
  const groupId = parseRequestId(req.params.groupId, 'ID nhóm');
  const data = await taskService.createTask(groupId, req.body, creatorId);
  res.status(201).json({ success: true, message: 'Tạo công việc thành công', data });
});

export const reorderTasksInGroup = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const groupId = parseRequestId(req.params.groupId, 'ID nhóm');
  const { ordered_ids } = req.body;
  await taskService.reorderTasksInGroup(groupId, ordered_ids, actorId);
  res.status(200).json({ success: true, message: 'Cập nhật thứ tự công việc thành công' });
});

export const getTaskById = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.getTaskById(taskId, actorId);
  res.status(200).json({ success: true, message: 'Lấy chi tiết công việc thành công', data });
});

export const updateTask = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.updateTask(taskId, req.body, actorId);
  res.status(200).json({ success: true, message: 'Cập nhật công việc thành công', data });
});

export const deleteTask = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  await taskService.deleteTask(taskId, actorId);
  res.status(200).json({ success: true, message: 'Xóa công việc thành công' });
});

export const updateTaskStatus = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.updateTaskStatus(taskId, req.body.status as task_status, actorId);
  res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công', data });
});

export const updateTaskProgress = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.updateTaskProgress(taskId, req.body.percent, actorId);
  res.status(200).json({ success: true, message: 'Cập nhật tiến độ thành công', data });
});

export const archiveTask = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.archiveTask(taskId, actorId);
  res.status(200).json({ success: true, message: 'Lưu trữ công việc thành công', data });
});

export const assignTask = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.assignTask(taskId, req.body, actorId);
  res.status(200).json({ success: true, message: 'Giao việc thành công', data });
});

export const unassignTask = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  const targetUserId = parseRequestId(req.params.userId, 'ID người dùng');
  const data = await taskService.unassignTask(taskId, targetUserId, actorId);
  res.status(200).json({ success: true, message: 'Bỏ giao việc thành công', data });
});

export const createSubtask = asyncHandler(async (req: Request | any, res: Response) => {
  const creatorId = req.user?.id;
  if (!creatorId) throw new UnauthorizedError();
  const parentTaskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.createSubtask(parentTaskId, req.body, creatorId);
  res.status(201).json({ success: true, message: 'Tạo subtask thành công', data });
});

export const getSubtasks = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const parentTaskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.getSubtasks(parentTaskId, actorId);
  res.status(200).json({ success: true, message: 'Lấy danh sách subtask thành công', data });
});

export const addDependency = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const successorId = parseRequestId(req.params.id, 'ID công việc');
  const { predecessor_id } = req.body;
  await taskService.addDependency(predecessor_id, successorId, actorId);
  res.status(200).json({ success: true, message: 'Thêm phụ thuộc thành công' });
});

export const removeDependency = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const successorId = parseRequestId(req.params.id, 'ID công việc');
  const predecessorId = parseRequestId(req.params.predecessorId, 'ID task tiền nhiệm');
  await taskService.removeDependency(predecessorId, successorId, actorId);
  res.status(200).json({ success: true, message: 'Gỡ phụ thuộc thành công' });
});

export const moveTask = asyncHandler(async (req: Request | any, res: Response) => {
  const actorId = req.user?.id;
  if (!actorId) throw new UnauthorizedError();
  const taskId = parseRequestId(req.params.id, 'ID công việc');
  const data = await taskService.moveTask(taskId, req.body, actorId);
  res.status(200).json({ success: true, message: 'Di chuyển công việc thành công', data });
});
