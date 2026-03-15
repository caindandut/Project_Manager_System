import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/AppError';

type ValidateSource = 'body' | 'query' | 'params';

/**
 * Trích message lỗi đầu tiên từ Zod (hoặc gộp nhiều lỗi) để trả về cho client.
 */
function formatZodMessage(err: ZodError): string {
  const first = err.issues[0];
  if (!first) return 'Dữ liệu không hợp lệ';
  const path = first.path.length ? `${first.path.join('.')}: ` : '';
  return path + (first.message || 'Giá trị không hợp lệ');
}

/**
 * Middleware validate dữ liệu request theo Zod schema.
 * - Nếu sai → trả 400 + message lỗi chi tiết (ValidationError)
 * - Nếu đúng → gán dữ liệu đã parse/transform vào req[source], gọi next()
 */
export function validate(schema: ZodSchema, source: ValidateSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const raw = (req as any)[source];
    const result = schema.safeParse(raw);

    if (result.success) {
      (req as any)[source] = result.data;
      next();
      return;
    }

    next(new ValidationError(formatZodMessage(result.error)));
  };
}
