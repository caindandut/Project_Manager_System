import { z } from 'zod';

const COMMENT_MAX = 5000;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Nội dung bình luận không được để trống')
    .max(COMMENT_MAX, `Nội dung bình luận tối đa ${COMMENT_MAX} ký tự`)
    .transform((v) => v.trim()),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Nội dung bình luận không được để trống')
    .max(COMMENT_MAX, `Nội dung bình luận tối đa ${COMMENT_MAX} ký tự`)
    .transform((v) => v.trim()),
});

export const commentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentsQueryInput = z.infer<typeof commentsQuerySchema>;

