import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { user_role, user_status } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError';
import type {
  CreateUserInput,
  UpdateProfileInput,
  ChangePasswordInput,
  AcceptInviteInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from '../validators/userValidator';

const INVITE_EXPIRES_MS = 24 * 60 * 60 * 1000; // 24h

const inviteTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function buildInviteEmailHtml(inviteUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #111827;">Xin chào,</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        Bạn vừa được quản trị viên mời tham gia hệ thống <strong>Project Manager</strong>.
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        Vui lòng nhấn vào nút bên dưới để hoàn tất thiết lập tài khoản (đặt Họ tên và Mật khẩu):
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${inviteUrl}" style="background-color: #2563EB; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Chấp nhận lời mời
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">
        Nếu nút không hoạt động, hãy copy đường dẫn sau và dán vào trình duyệt:
      </p>
      <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #111827;">
        ${inviteUrl}
      </p>
      <p style="color: #b91c1c; font-size: 13px; margin-top: 16px;">
        Lưu ý: Link chỉ có hiệu lực trong vòng <strong>24 giờ</strong>.
      </p>
    </div>
  `;
}

export class UserService {
  async getAllUsers() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
        avatar_path: true,
        is_online: true,
        created_at: true,
        updated_at: true,
        company: {
          select: { id: true, company_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return users;
  }

  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        avatar_path: true,
        authProvider: true,
      },
    });
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');
    return user;
  }

  async updateProfile(userId: number, data: UpdateProfileInput) {
    const updateData: { full_name?: string | null; avatar_path?: string | null } = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName === null || data.fullName === '' ? null : data.fullName;
    if (data.avatarPath !== undefined) updateData.avatar_path = data.avatarPath === null || data.avatarPath === '' ? null : data.avatarPath;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        avatar_path: true,
        authProvider: true,
      },
    });
    return updated;
  }

  async changePassword(userId: number, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { authProvider: true, password: true },
    });
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');
    if (user.authProvider === 'google') {
      throw new ValidationError('Tài khoản Google không thể đổi mật khẩu');
    }
    if (!user.password) {
      throw new ValidationError('Tài khoản chưa có mật khẩu. Vui lòng dùng quên mật khẩu.');
    }
    const isMatch = await bcrypt.compare(input.oldPassword, user.password);
    if (!isMatch) throw new ValidationError('Mật khẩu hiện tại không đúng');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.newPassword, salt);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async createUser(input: CreateUserInput, adminId: number) {
    const { email, role } = input;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ValidationError('Email đã tồn tại trong hệ thống');
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + INVITE_EXPIRES_MS);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        full_name: null,
        role: (role as user_role) || 'Employee',
        status: 'Pending',
        inviteToken,
        inviteExpires,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
        avatar_path: true,
        created_at: true,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: adminId,
        action: 'INVITE_USER',
        details: `Mời tài khoản ${email} với role ${role || 'Employee'}`,
        target_table: 'user',
        target_id: newUser.id,
      },
    });

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invite?token=${inviteToken}`;
    console.log('[INVITE_LINK]', inviteUrl);

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await inviteTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: '[ProjectManager] Lời mời tham gia hệ thống',
          html: buildInviteEmailHtml(inviteUrl),
        });
      } catch (mailError) {
        console.error('Gửi email mời thất bại:', mailError);
      }
    } else {
      console.warn('[INVITE_EMAIL] EMAIL_USER / EMAIL_PASS chưa được cấu hình. Hệ thống chỉ log link mời ra console.');
    }

    return newUser;
  }

  async updateUserRole(userId: number, input: UpdateUserRoleInput, adminId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: input.role as user_role },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: adminId,
        action: 'UPDATE_ROLE',
        details: `Cập nhật role của ${user.full_name} từ ${user.role} thành ${input.role}`,
        target_table: 'user',
        target_id: userId,
      },
    });

    return updatedUser;
  }

  async updateUserStatus(userId: number, input: UpdateUserStatusInput, adminId: number) {
    if (userId === adminId) {
      throw new ForbiddenError('Không thể thay đổi trạng thái chính mình');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: input.status as user_status },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: adminId,
        action: input.status === 'Active' ? 'UNLOCK_USER' : 'LOCK_USER',
        details: `${input.status === 'Active' ? 'Mở khóa' : 'Khóa'} tài khoản ${user.full_name} (${user.email})`,
        target_table: 'user',
        target_id: userId,
      },
    });

    return updatedUser;
  }

  async deleteUser(userId: number, adminId: number) {
    if (userId === adminId) {
      throw new ForbiddenError('Không thể xóa chính tài khoản của bạn');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');

    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError?.code === 'P2003') {
        throw new ValidationError(
          'Không thể xóa tài khoản vì còn dữ liệu liên quan (dự án, công việc, v.v.). Hãy chuyển quyền hoặc xóa dữ liệu trước.'
        );
      }
      throw err;
    }

    await prisma.activitylog.create({
      data: {
        user_id: adminId,
        action: 'DELETE_USER',
        details: `Đã xóa tài khoản ${user.full_name ?? user.email} (${user.email})`,
        target_table: 'user',
        target_id: userId,
      },
    });

    return { id: userId };
  }

  async verifyInviteToken(token: string) {
    const trimmed = typeof token === 'string' ? token.trim() : '';
    if (!trimmed) {
      return {
        valid: false,
        message: 'Link mời không hợp lệ. Vui lòng kiểm tra lại email hoặc liên hệ quản trị viên.',
        data: null as { email: string } | null,
      };
    }

    const user = await prisma.user.findFirst({
      where: { inviteToken: trimmed },
      select: { id: true, inviteExpires: true, status: true, email: true },
    });

    if (!user) {
      return {
        valid: false,
        message: 'Link không hợp lệ, đã hết hạn hoặc đã được sử dụng. Bạn có thể đăng nhập nếu đã thiết lập tài khoản.',
        data: null as { email: string } | null,
      };
    }
    if (user.inviteExpires && user.inviteExpires < new Date()) {
      return {
        valid: false,
        message: 'Link mời đã hết hạn. Vui lòng liên hệ quản trị viên để nhận link mới.',
        data: null as { email: string } | null,
      };
    }
    if (user.status !== 'Pending') {
      return {
        valid: false,
        message: 'Link này đã được sử dụng. Bạn có thể đăng nhập bằng tài khoản đã thiết lập.',
        data: null as { email: string } | null,
      };
    }

    return {
      valid: true,
      message: 'Link hợp lệ. Vui lòng điền form để hoàn tất tài khoản.',
      data: { email: user.email },
    };
  }

  async acceptInvite(input: AcceptInviteInput) {
    const { token, fullName, password } = input;
    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new ValidationError('Link mời không hợp lệ hoặc đã hết hạn');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        full_name: fullName,
        password: hashedPassword,
        status: 'Active',
        inviteToken: null,
        inviteExpires: null,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await prisma.activitylog.create({
      data: {
        user_id: user.id,
        action: 'ACCEPT_INVITE',
        details: 'Người dùng đã chấp nhận lời mời và thiết lập tài khoản',
        target_table: 'user',
        target_id: user.id,
      },
    });

    return updatedUser;
  }
}

export const userService = new UserService();
