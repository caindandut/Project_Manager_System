import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import generateToken from '../utils/generateToken';
import nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID as string);

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { full_name, email, password } = req.body;

  try {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      res.status(400).json({ message: 'Email này đã được sử dụng' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        password: hashedPassword,
        role: 'Employee',
      },
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Lỗi Server' });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server' });
  }
};

export const loginGoogle = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ message: 'Token Google không hợp lệ' });
      return;
    }

    const { email, name, picture, sub } = payload;

    if (!email || !name || !sub) {
      res.status(400).json({ message: 'Thông tin Google không đầy đủ' });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          google_id: sub,
          avatar_path: picture || null,
        },
      });
    } else {
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await prisma.user.create({
        data: {
          full_name: name,
          email: email,
          password: hashedPassword,
          google_id: sub,
          avatar_path: picture || null,
          role: 'Employee',
        },
      });
    }

    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      avatar: user.avatar_path,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Token Google không hợp lệ' });
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
    const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

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
    res.status(500).json({ message: 'Lỗi Server' });
  }
};

export const verifyResetToken = async (req: Request, res: Response): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  try {
    const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

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

export const getMe = async (req: Request, res: Response): Promise<void> => {
  res.json(req.user);
};
