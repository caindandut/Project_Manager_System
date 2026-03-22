import { ValidationError } from './AppError';

/**
 * Parse số nguyên từ `req.params` / query (Express: string | string[]).
 * Dùng chung cho các REST controller (dự án, nhóm task, task).
 */
export function parseRequestId(
  raw: string | string[] | undefined,
  label = 'ID',
): number {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str ?? '', 10);
  if (Number.isNaN(id)) {
    throw new ValidationError(`${label} không hợp lệ`);
  }
  return id;
}
