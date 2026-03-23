import { z } from 'zod';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const markAsReadSchema = z.object({
  id: z.coerce.number().int().positive('ID thông báo không hợp lệ'),
});

export type NotificationsQueryInput = z.infer<typeof notificationsQuerySchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

