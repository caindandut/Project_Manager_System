import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/** 404 - Route không tồn tại */
export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Không tìm thấy đường dẫn - ${req.originalUrl}`, 404));
};

const errorResponse = (message: string, stack?: string | null) => ({
  success: false,
  message,
  data: null,
  ...(stack && { stack }),
});


export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message = err.message || 'Đã xảy ra lỗi không mong muốn';

  if (statusCode >= 500) {
    console.error('[Error]', statusCode, message);
    if (err.stack) {
      console.error(err.stack);
    }
  }

  const includeStack = process.env.NODE_ENV !== 'production' && !!err.stack;
  const payload = errorResponse(message, includeStack ? err.stack : undefined);

  res.status(statusCode).json(payload);
};
