import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { AuthService } from '../services/AuthService';
import { PrismaUserRepository } from '../infrastructure/repositories/PrismaUserRepository';
import { prisma } from '../lib/prisma';

const userRepository = new PrismaUserRepository();
const authService = new AuthService(userRepository);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, full_name } = req.body; 
        
        const result = await authService.register(email, password, full_name);

        res.status(201).json({
          id: result.user.id,
          full_name: result.user.fullName,
          email: result.user.email,
          role: result.user.role,
          avatar: result.user.avatarPath,
          token: result.token,
        });
    } catch (error) {
        next(error); 
    }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login(email, password);

        res.json({
          id: result.user.id,
          full_name: result.user.fullName,
          email: result.user.email,
          role: result.user.role,
          avatar: result.user.avatarPath,
          token: result.token,
        });
    } catch (error) {
        res.status(401); 
        next(error);
    }
};

export const getMe = async (req: Request | any, res: Response): Promise<void> => {
  const { id, email, fullName, role, avatarPath } = req.user || {};

  res.json({
    id,
    email,
    full_name: fullName,
    role,
    avatar: avatarPath,
  });
};

export const loginGoogle = async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.body.token ?? req.body.credential;
  const idToken = typeof rawToken === 'string' ? rawToken : null;

  try {
    if (!idToken) {
      res.status(400).json({ message: 'Thiếu token Google' });
      return;
    }

    const result = await authService.loginGoogle(idToken);

    res.json({
      id: result.user.id,
      full_name: result.user.fullName,
      email: result.user.email,
      role: result.user.role,
      avatar: result.user.avatarPath ?? null,
      token: result.token,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Token Google không hợp lệ',
    });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: 'Email không tồn tại' });
      return;
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '[ProjectManager] Yêu cầu đặt lại mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0;">Project Manager</h2>
          </div>
          
          <h3 style="color: #333;">Xin chào,</h3>
          <p style="color: #555; line-height: 1.6;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Để thiết lập mật khẩu mới, vui lòng nhấn vào nút bên dưới:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
          </div>
          
          <p style="color: #555; line-height: 1.6;">Nếu nút trên không hoạt động, bạn cũng có thể nhấp vào hoặc sao chép đường dẫn sau:</p>
          <p style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px; color: #333;">
            <a href="${resetUrl}" style="color: #4F46E5; text-decoration: none;">${resetUrl}</a>
          </p>
          
          <p style="color: #dc2626; font-size: 14px; margin-top: 20px;">
            <strong>Lưu ý:</strong> Đường dẫn này chỉ có hiệu lực trong vòng <strong>15 phút</strong>.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          
          <p style="font-size: 13px; color: #888; text-align: center; line-height: 1.5;">
            Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.<br>
            Tài khoản của bạn vẫn được bảo mật an toàn.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email đã được gửi thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi gửi email' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const { password } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ message: 'Link không hợp lệ hoặc đã hết hạn' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Server' });
  }
};

export const verifyResetToken = async (req: Request, res: Response): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      res.status(400).json({
        valid: false,
        message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      });
      return;
    }

    res.json({ valid: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ valid: false, message: 'Lỗi Server' });
  }
};