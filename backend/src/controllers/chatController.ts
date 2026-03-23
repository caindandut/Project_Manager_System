import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/AppError';
import { parseRequestId } from '../utils/parseRequestId';
import { chatService } from '../services/ChatService';

export const getChatGroups = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const data = await chatService.getChatGroupsByUser(userId);
  res.status(200).json({
    success: true,
    message: 'Lấy danh sách nhóm chat thành công',
    data,
  });
});

export const createChatGroup = asyncHandler(async (req: Request | any, res: Response) => {
  const data = await chatService.createChatGroup(
    req.body.project_id,
    req.body.name ?? null,
    req.body.member_ids ?? [],
  );
  res.status(201).json({
    success: true,
    message: 'Tạo nhóm chat thành công',
    data,
  });
});

export const getMessages = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const groupId = parseRequestId(req.params.id, 'ID nhóm chat');
  const query = req.validatedQuery ?? req.query;
  const data = await chatService.getMessages(groupId, userId, query);
  res.status(200).json({
    success: true,
    message: 'Lấy danh sách tin nhắn thành công',
    data,
  });
});

export const sendMessage = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const groupId = parseRequestId(req.params.id, 'ID nhóm chat');
  const data = await chatService.sendMessage(groupId, userId, req.body);
  res.status(201).json({
    success: true,
    message: 'Gửi tin nhắn thành công',
    data,
  });
});

export const getOrCreateDirectChat = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const targetUserId = parseRequestId(req.params.userId, 'ID người dùng');
  const group = await chatService.getOrCreateDirectChat(userId, targetUserId);
  if (!group) {
    throw new UnauthorizedError('Không thể tạo cuộc trò chuyện trực tiếp');
  }

  const messages = await chatService.getMessages(group.id, userId, { page: 1, limit: 20 });
  res.status(200).json({
    success: true,
    message: 'Lấy cuộc trò chuyện trực tiếp thành công',
    data: { group, messages },
  });
});

export const sendDirectMessage = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const targetUserId = parseRequestId(req.params.userId, 'ID người dùng');
  const group = await chatService.getOrCreateDirectChat(userId, targetUserId);
  if (!group) {
    throw new UnauthorizedError('Không thể tạo cuộc trò chuyện trực tiếp');
  }
  const data = await chatService.sendMessage(group.id, userId, req.body);
  res.status(201).json({
    success: true,
    message: 'Gửi tin nhắn trực tiếp thành công',
    data: { group_id: group.id, message: data },
  });
});

export const markGroupAsRead = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const groupId = parseRequestId(req.params.id, 'ID nhóm chat');
  const data = await chatService.markAsRead(groupId, userId);
  res.status(200).json({
    success: true,
    message: 'Đánh dấu tin nhắn đã đọc thành công',
    data,
  });
});

