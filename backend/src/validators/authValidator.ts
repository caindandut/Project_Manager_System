import { z } from 'zod';

/** Đăng nhập email/password */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Vui lòng nhập email' })
    .min(1, 'Vui lòng nhập email')
    .email('Email không đúng định dạng')
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu' })
    .min(1, 'Vui lòng nhập mật khẩu'),
});

/** Quên mật khẩu — gửi email */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Vui lòng nhập email' })
    .min(1, 'Vui lòng nhập email')
    .email('Email không đúng định dạng')
    .transform((v) => v.trim().toLowerCase()),
});

/** Đặt lại mật khẩu (sau khi click link reset) — mật khẩu mạnh */
const strongPassword = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất một chữ in hoa')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất một ký tự đặc biệt');

export const resetPasswordSchema = z.object({
  password: strongPassword,
});

/** Đăng nhập Google — token hoặc credential từ client */
export const loginGoogleSchema = z.object({
  token: z.string().min(1, 'Thiếu token Google').optional(),
  credential: z.string().min(1, 'Thiếu credential Google').optional(),
}).refine((data) => data.token || data.credential, {
  message: 'Vui lòng cung cấp token hoặc credential từ Google',
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type LoginGoogleInput = z.infer<typeof loginGoogleSchema>;
