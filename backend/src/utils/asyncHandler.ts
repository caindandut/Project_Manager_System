import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | unknown>;

/**
 * Bọc handler async để lỗi (throw hoặc Promise reject) được chuyển vào next(err).
 * errorMiddleware xử lý thống nhất — không cần try-catch trong từng controller.
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
