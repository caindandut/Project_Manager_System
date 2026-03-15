import { z } from 'zod';

const projectMemberRoleEnum = z.enum(['Manager', 'Member', 'Viewer'], {
  errorMap: () => ({ message: 'Vai trò phải là Manager, Member hoặc Viewer' }),
});

const projectStatusEnum = z.enum(['Active', 'Completed', 'Archived'], {
  errorMap: () => ({ message: 'Trạng thái phải là Active, Completed hoặc Archived' }),
});

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Mã màu phải đúng định dạng hex (#RRGGBB)')
  .optional();

const dateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Ngày không đúng định dạng' })
  .optional()
  .nullable();

/** Tạo dự án — POST /api/projects */
export const createProjectSchema = z.object({
  project_name: z
    .string({ required_error: 'Vui lòng nhập tên dự án' })
    .min(1, 'Tên dự án không được để trống')
    .max(255, 'Tên dự án tối đa 255 ký tự')
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(5000, 'Mô tả tối đa 5000 ký tự')
    .transform((v) => v.trim())
    .optional()
    .nullable(),
  start_date: dateString,
  end_date: dateString,
  color_code: hexColor,
  label: z
    .string()
    .max(100, 'Nhãn tối đa 100 ký tự')
    .transform((v) => v.trim())
    .optional()
    .nullable(),
  member_ids: z.array(z.number().int().positive()).optional(),
});

/** Cập nhật dự án — PUT /api/projects/:id */
export const updateProjectSchema = z.object({
  project_name: z
    .string()
    .min(1, 'Tên dự án không được để trống')
    .max(255, 'Tên dự án tối đa 255 ký tự')
    .transform((v) => v.trim())
    .optional(),
  description: z
    .string()
    .max(5000, 'Mô tả tối đa 5000 ký tự')
    .transform((v) => v.trim())
    .optional()
    .nullable(),
  start_date: dateString,
  end_date: dateString,
  color_code: hexColor,
  label: z
    .string()
    .max(100, 'Nhãn tối đa 100 ký tự')
    .transform((v) => v.trim())
    .optional()
    .nullable(),
  status: projectStatusEnum.optional(),
});

/** Thêm thành viên — POST /api/projects/:id/members */
export const addMemberSchema = z.object({
  user_id: z
    .number({ required_error: 'Vui lòng chọn người dùng' })
    .int('ID người dùng phải là số nguyên')
    .positive('ID người dùng không hợp lệ'),
  role: projectMemberRoleEnum.optional().default('Member'),
});

/** Đổi vai trò thành viên — PUT /api/projects/:id/members/:userId */
export const updateMemberRoleSchema = z.object({
  role: projectMemberRoleEnum,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
