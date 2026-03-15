import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';
import { user_role, user_status } from '@prisma/client';

const VALID_ROLES: string[] = Object.values(user_role);
const VALID_STATUSES: string[] = Object.values(user_status);

const inviteTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// GET /api/users
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
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

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data: users,
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách người dùng',
      data: null,
    });
  }
};

// POST /api/users  (Invite user)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, role } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email',
        data: null,
      });
      return;
    }

    if (role && !VALID_ROLES.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Role không hợp lệ. Chấp nhận: ${VALID_ROLES.join(', ')}`,
        data: null,
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email đã tồn tại trong hệ thống',
        data: null,
      });
      return;
    }

    // Tạo mật khẩu ngẫu nhiên nội bộ để tránh null (user sẽ đặt lại sau)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

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

    const adminUser = (req as any).user;
    await prisma.activitylog.create({
      data: {
        user_id: adminUser.id,
        action: 'INVITE_USER',
        details: `Mời tài khoản ${email} với role ${role || 'Employee'}`,
        target_table: 'user',
        target_id: newUser.id,
      },
    });

    const inviteUrl = `http://localhost:5173/accept-invite?token=${inviteToken}`;
    console.log('[INVITE_LINK]', inviteUrl);

    // Gửi email mời (nếu đã cấu hình EMAIL_USER / EMAIL_PASS)
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await inviteTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: '[ProjectManager] Lời mời tham gia hệ thống',
          html: `
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
          `,
        });
      } else {
        console.warn('[INVITE_EMAIL]', 'EMAIL_USER / EMAIL_PASS chưa được cấu hình. Hệ thống chỉ log link mời ra console.');
      }
    } catch (mailError) {
      console.error('Gửi email mời thất bại:', mailError);
      // Không fail API nếu gửi mail lỗi, vì admin vẫn có thể copy link từ console
    }

    res.status(201).json({
      success: true,
      message: 'Đã tạo lời mời và gửi tới email (console log)',
      data: newUser,
    });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo tài khoản',
      data: null,
    });
  }
};

// PUT /api/users/:id/role
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = parseInt(rawId, 10);
    const { role } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ', data: null });
      return;
    }

    if (!role || !VALID_ROLES.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Role không hợp lệ. Chấp nhận: ${VALID_ROLES.join(', ')}`,
        data: null,
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng', data: null });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as user_role },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    const adminUser = (req as any).user;
    await prisma.activitylog.create({
      data: {
        user_id: adminUser.id,
        action: 'UPDATE_ROLE',
        details: `Cập nhật role của ${user.full_name} từ ${user.role} thành ${role}`,
        target_table: 'user',
        target_id: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: `Cập nhật role thành ${role} thành công`,
      data: updatedUser,
    });
  } catch (error) {
    console.error('updateUserRole error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật role',
      data: null,
    });
  }
};

// GET /api/users/verify-invite?token=xxx — kiểm tra token ngay khi mở link (đã dùng / hết hạn → báo luôn)
export const verifyInviteToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!token) {
      res.status(200).json({
        success: true,
        valid: false,
        message: 'Link mời không hợp lệ. Vui lòng kiểm tra lại email hoặc liên hệ quản trị viên.',
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { inviteToken: token },
      select: { id: true, inviteExpires: true, status: true, email: true },
    });

    if (!user) {
      res.status(200).json({
        success: true,
        valid: false,
        message: 'Link không hợp lệ, đã hết hạn hoặc đã được sử dụng. Bạn có thể đăng nhập nếu đã thiết lập tài khoản.',
      });
      return;
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      res.status(200).json({
        success: true,
        valid: false,
        message: 'Link mời đã hết hạn. Vui lòng liên hệ quản trị viên để nhận link mới.',
      });
      return;
    }

    if (user.status !== 'Pending') {
      res.status(200).json({
        success: true,
        valid: false,
        message: 'Link này đã được sử dụng. Bạn có thể đăng nhập bằng tài khoản đã thiết lập.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: 'Link hợp lệ. Vui lòng điền form để hoàn tất tài khoản.',
      data: { email: user.email },
    });
  } catch (error) {
    console.error('verifyInviteToken error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Lỗi server khi xác minh link mời.',
    });
  }
};

// POST /api/users/accept-invite
export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, fullName, password } = req.body;

    if (!token || !fullName || !password) {
      res.status(400).json({
        success: false,
        message: 'Thiếu token, họ tên hoặc mật khẩu',
        data: null,
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 8 ký tự',
        data: null,
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Link mời không hợp lệ hoặc đã hết hạn',
        data: null,
      });
      return;
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

    res.status(200).json({
      success: true,
      message: 'Kích hoạt tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.',
      data: updatedUser,
    });
  } catch (error) {
    console.error('acceptInvite error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xác nhận lời mời',
      data: null,
    });
  }
};

// PUT /api/users/:id/status
export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = parseInt(rawId, 10);
    const { status } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ', data: null });
      return;
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Status không hợp lệ. Chấp nhận: ${VALID_STATUSES.join(', ')}`,
        data: null,
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng', data: null });
      return;
    }

    const adminUser = (req as any).user;
    if (userId === adminUser.id) {
      res.status(400).json({
        success: false,
        message: 'Không thể thay đổi trạng thái chính mình',
        data: null,
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: status as user_status },
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
        user_id: adminUser.id,
        action: status === 'Active' ? 'UNLOCK_USER' : 'LOCK_USER',
        details: `${status === 'Active' ? 'Mở khóa' : 'Khóa'} tài khoản ${user.full_name} (${user.email})`,
        target_table: 'user',
        target_id: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: `${status === 'Active' ? 'Mở khóa' : 'Khóa'} tài khoản thành công`,
      data: updatedUser,
    });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái',
      data: null,
    });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = parseInt(rawId, 10);

    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ', data: null });
      return;
    }

    const adminUser = (req as any).user;
    if (userId === adminUser.id) {
      res.status(400).json({
        success: false,
        message: 'Không thể xóa chính tài khoản của bạn',
        data: null,
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng', data: null });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    await prisma.activitylog.create({
      data: {
        user_id: adminUser.id,
        action: 'DELETE_USER',
        details: `Đã xóa tài khoản ${user.full_name ?? user.email} (${user.email})`,
        target_table: 'user',
        target_id: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa tài khoản thành công',
      data: { id: userId },
    });
  } catch (error: any) {
    console.error('deleteUser error:', error);
    if (error?.code === 'P2003') {
      res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản vì còn dữ liệu liên quan (dự án, công việc, v.v.). Hãy chuyển quyền hoặc xóa dữ liệu trước.',
        data: null,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa tài khoản',
      data: null,
    });
  }
};
