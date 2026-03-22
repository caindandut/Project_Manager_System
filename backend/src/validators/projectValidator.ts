import { z } from 'zod';

const projectMemberRoleEnum = z.enum(['Manager', 'Member', 'Viewer']);

const projectStatusEnum = z.enum(['Active', 'Completed', 'Archived']);

const projectPriorityEnum = z.enum(['Low', 'Medium', 'High', 'Urgent']);

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Mã màu phải đúng định dạng hex (#RRGGBB)')
  .optional();

const dateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Ngày không đúng định dạng' })
  .optional()
  .nullable();

/** Chuỗi rỗng / chỉ khoảng trắng → không gửi nhãn (tránh lưu "" hoặc giá trị autofill rác). */
const projectLabelOnCreate = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'string') return val;
  const t = val.trim();
  return t === '' ? undefined : t;
}, z.string().max(100, 'Nhãn phân loại dự án tối đa 100 ký tự').optional());

/** PUT: null = xóa nhãn; undefined = không đổi; chuỗi rỗng coi như xóa. */
const projectLabelOnUpdate = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (typeof val !== 'string') return val;
  const t = val.trim();
  return t === '' ? null : t;
}, z.string().max(100, 'Nhãn phân loại dự án tối đa 100 ký tự').nullable().optional());

/** Khi body có cả hai ngày — kiểm tra trước khi vào service (PUT chỉ validate nếu gửi đủ 2 key). */
function refineProjectDates(
  data: { start_date?: string | null; end_date?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.start_date && data.end_date) {
    if (new Date(data.end_date) <= new Date(data.start_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ngày kết thúc phải sau ngày bắt đầu',
        path: ['end_date'],
      });
    }
  }
}

/** Tạo dự án — POST /api/projects */
export const createProjectSchema = z
  .object({
  project_name: z
    .string()
    .min(1, 'Vui lòng nhập tên dự án')
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
  label: projectLabelOnCreate,
  priority: projectPriorityEnum.optional().default('Medium'),
  member_ids: z.array(z.number().int().positive()).optional(),
  })
  .superRefine(refineProjectDates);

/** Cập nhật dự án — PUT /api/projects/:id */
export const updateProjectSchema = z
  .object({
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
  label: projectLabelOnUpdate,
  priority: projectPriorityEnum.optional(),
  status: projectStatusEnum.optional(),
  })
  .superRefine(refineProjectDates);

/** Thêm thành viên — POST /api/projects/:id/members */
export const addMemberSchema = z.object({
  user_id: z
    .number()
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
