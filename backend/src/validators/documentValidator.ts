import { z } from 'zod';

const MAX_NAME = 255;
const MAX_URL = 255;

const optionalPositiveInt = z
  .preprocess((val) => {
    if (val === '' || val === undefined) return undefined;
    if (val === null) return null;
    return val;
  }, z.coerce.number().int().positive().optional().nullable());

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Tên thư mục không được để trống').max(MAX_NAME, 'Tối đa 255 ký tự').transform((v) => v.trim()),
  parentId: optionalPositiveInt,
});

export const uploadFileSchema = z.object({
  parentId: optionalPositiveInt,
});

export const linkExternalDocumentSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(MAX_NAME, 'Tối đa 255 ký tự').transform((v) => v.trim()),
  url: z.string().min(1, 'URL không được để trống').max(MAX_URL, 'URL quá dài').url('URL không hợp lệ'),
});

export const documentsQuerySchema = z.object({
  parentId: optionalPositiveInt,
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type LinkExternalDocumentInput = z.infer<typeof linkExternalDocumentSchema>;
export type DocumentsQueryInput = z.infer<typeof documentsQuerySchema>;

