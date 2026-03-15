import { z } from 'zod';

/** Cập nhật thông tin công ty — PUT /api/company */
export const updateCompanySchema = z.object({
  name: z
    .string()
    .min(1, 'Tên công ty không được để trống')
    .max(200, 'Tên công ty tối đa 200 ký tự')
    .transform((v) => v.trim())
    .optional(),
  logo: z
    .string()
    .url('Logo phải là URL hợp lệ')
    .max(500)
    .optional()
    .nullable()
    .or(z.literal('')),
  industry: z
    .string()
    .max(100)
    .transform((v) => (v === '' ? undefined : v))
    .optional()
    .nullable(),
  size: z
    .string()
    .max(50)
    .transform((v) => (v === '' ? undefined : v))
    .optional()
    .nullable(),
}).refine((data) => Object.keys(data).some((k) => data[k as keyof typeof data] !== undefined), {
  message: 'Cần ít nhất một trường để cập nhật',
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
