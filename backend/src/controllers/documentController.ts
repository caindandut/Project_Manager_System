import path from 'path';
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/AppError';
import { parseRequestId } from '../utils/parseRequestId';
import { documentService } from '../services/DocumentService';

function resolveDownloadPath(filePath: string): string {
  // file_path dự kiến lưu dạng `uploads/...` hoặc đường dẫn tuyệt đối.
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(process.cwd(), filePath);
}

export const createFolder = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const projectId = parseRequestId(req.params.id, 'ID dự án');
  const data = await documentService.createFolder(projectId, req.body.name, req.body.parentId, userId);

  res.status(201).json({
    success: true,
    message: 'Tạo thư mục thành công',
    data,
  });
});

export const uploadFile = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const projectId = parseRequestId(req.params.id, 'ID dự án');
  const file = req.file;
  if (!file) {
    res.status(400);
    throw new Error('Thiếu file upload');
  }

  const data = await documentService.uploadFile(projectId, file, req.body.parentId, userId);
  res.status(201).json({
    success: true,
    message: 'Upload file thành công',
    data,
  });
});

export const linkExternalDocument = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const projectId = parseRequestId(req.params.id, 'ID dự án');
  const data = await documentService.linkExternalDocument(projectId, req.body, userId);

  res.status(201).json({
    success: true,
    message: 'Link tài liệu thành công',
    data,
  });
});

export const listDocuments = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const projectId = parseRequestId(req.params.id, 'ID dự án');
  const query = req.validatedQuery ?? req.query;
  const parentId = query.parentId ?? null;

  const data = await documentService.getDocuments(projectId, parentId, userId);

  res.status(200).json({
    success: true,
    message: 'Lấy danh sách tài liệu thành công',
    data,
  });
});

export const downloadDocument = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const documentId = parseRequestId(req.params.id, 'ID tài liệu');
  const { file_path } = await documentService.downloadDocument(documentId, userId);

  if (!file_path.startsWith('http')) {
    const absPath = resolveDownloadPath(file_path);
    return res.download(absPath);
  }

  // Link ngoài không stream trực tiếp tại đây (chỉ trả file_path để frontend xử lý).
  res.status(200).json({
    success: true,
    message: 'Tài liệu là link ngoài',
    data: { file_path },
  });
});

export const deleteDocument = asyncHandler(async (req: Request | any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const documentId = parseRequestId(req.params.id, 'ID tài liệu');
  await documentService.deleteDocument(documentId, userId);

  res.status(200).json({
    success: true,
    message: 'Xóa tài liệu thành công',
  });
});

