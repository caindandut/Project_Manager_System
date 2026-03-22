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
 * Express 5: req.query là getter chỉ-đọc → khi source='query', lưu vào req.validatedQuery.
 */
export function validate(schema: ZodSchema, source: ValidateSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const raw = (req as any)[source];
    const result = schema.safeParse(raw);

    if (result.success) {
      if (source === 'query') {
        // Express 5: req.query chỉ-đọc → lưu sang property riêng
        (req as any).validatedQuery = result.data;
      } else {
        (req as any)[source] = result.data;
      }
      next();
      return;
    }

    next(new ValidationError(formatZodMessage(result.error)));
  };
}
