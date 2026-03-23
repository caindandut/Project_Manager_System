import { z } from 'zod';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const createChatGroupSchema = z.object({
  project_id: z.coerce.number().int().positive('ID dự án không hợp lệ'),
  name: z
    .string()
    .max(255, 'Tên nhóm tối đa 255 ký tự')
    .optional()
    .nullable()
    .transform((v) => (typeof v === 'string' ? v.trim() : v)),
  member_ids: z.array(z.coerce.number().int().positive()).optional().default([]),
});

export const chatMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const sendMessageSchema = z.object({
  content: z.string().max(5000, 'Nội dung tối đa 5000 ký tự').optional().nullable(),
  type: z.enum(['Text', 'Image', 'File']).optional().default('Text'),
  filePath: z.string().max(255, 'Đường dẫn file tối đa 255 ký tự').optional().nullable(),
}).refine(
  (data) => (data.content?.trim() || data.filePath?.trim()),
  { message: 'Tin nhắn không được để trống' },
);

export type CreateChatGroupInput = z.infer<typeof createChatGroupSchema>;
export type ChatMessagesQueryInput = z.infer<typeof chatMessagesQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

