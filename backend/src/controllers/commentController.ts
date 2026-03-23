import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/AppError';
import { parseRequestId } from '../utils/parseRequestId';
import { commentService } from '../services/CommentService';

export const createComment = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const taskId = parseRequestId(req.params.taskId, 'ID công việc');
  const data = await commentService.createComment(taskId, userId, req.body.content);

  res.status(201).json({
    success: true,
    message: 'Thêm bình luận thành công',
    data,
  });
});

export const getCommentsByTask = asyncHandler(async (req: Request | any, res: Response) => {
  const taskId = parseRequestId(req.params.taskId, 'ID công việc');
  const query = req.validatedQuery ?? req.query;
  const data = await commentService.getCommentsByTask(taskId, query);

  res.status(200).json({
    success: true,
    message: 'Lấy danh sách bình luận thành công',
    data,
  });
});

export const updateComment = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const commentId = parseRequestId(req.params.id, 'ID bình luận');
  const data = await commentService.updateComment(commentId, userId, req.body.content);

  res.status(200).json({
    success: true,
    message: 'Cập nhật bình luận thành công',
    data,
  });
});

export const deleteComment = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const commentId = parseRequestId(req.params.id, 'ID bình luận');
  await commentService.deleteComment(commentId, userId);

  res.status(200).json({
    success: true,
    message: 'Xóa bình luận thành công',
  });
});

