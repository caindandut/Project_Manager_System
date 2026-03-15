import { z } from 'zod';

const roleEnum = z.enum(['Admin', 'Director', 'Employee'], {
  errorMap: () => ({ message: 'Vai trò phải là Admin, Director hoặc Employee' }),
});

const statusEnum = z.enum(['Active', 'Inactive', 'Pending'], {
  errorMap: () => ({ message: 'Trạng thái phải là Active, Inactive hoặc Pending' }),
});

/** Mật khẩu mạnh: min 8 ký tự, có chữ in hoa, có ký tự đặc biệt */
const strongPassword = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất một chữ in hoa')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất một ký tự đặc biệt');

/** Admin mời user — POST /api/users */
export const createUserSchema = z.object({
  email: z
    .string({ required_error: 'Vui lòng cung cấp email' })
    .min(1, 'Vui lòng cung cấp email')
    .email('Email không đúng định dạng')
    .max(255)
    .transform((v) => v.trim().toLowerCase()),
  role: roleEnum.optional().default('Employee'),
});

/** Cập nhật hồ sơ — PUT /api/users/profile */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên tối đa 100 ký tự')
    .transform((v) => v.trim())
    .optional()
    .nullable(),
  avatarPath: z
    .string()
    .url('Đường dẫn avatar phải là URL hợp lệ')
    .max(500)
    .optional()
    .nullable()
    .or(z.literal('')),
}).refine((data) => data.fullName !== undefined || data.avatarPath !== undefined, {
  message: 'Cần ít nhất một trường để cập nhật',
});

/** Đổi mật khẩu — PUT /api/users/change-password */
export const changePasswordSchema = z.object({
  oldPassword: z.string({ required_error: 'Vui lòng nhập mật khẩu hiện tại' }).min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: strongPassword,
}).refine((data) => data.oldPassword !== data.newPassword, {
  message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  path: ['newPassword'],
});

/** Chấp nhận lời mời — POST /api/users/accept-invite */
export const acceptInviteSchema = z.object({
  token: z.string({ required_error: 'Thiếu token' }).min(1, 'Thiếu token'),
  fullName: z
    .string({ required_error: 'Vui lòng nhập họ tên' })
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100)
    .transform((v) => v.trim()),
  password: strongPassword,
});

/** Đổi vai trò user — PUT /api/users/:id/role */
export const updateUserRoleSchema = z.object({
  role: roleEnum,
});

/** Đổi trạng thái user (khóa/mở) — PUT /api/users/:id/status */
export const updateUserStatusSchema = z.object({
  status: statusEnum,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
