import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { user_role, user_status } from '@prisma/client';

const VALID_ROLES: string[] = Object.values(user_role);
const VALID_STATUSES: string[] = Object.values(user_status);

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

// POST /api/users
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email, password và full_name',
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        full_name,
        role: (role as user_role) || 'Employee',
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

    // Ghi activity log
    const adminUser = (req as any).user;
    await prisma.activitylog.create({
      data: {
        user_id: adminUser.id,
        action: 'CREATE_USER',
        details: `Tạo tài khoản mới cho ${full_name} (${email}) với role ${role || 'Employee'}`,
        target_table: 'user',
        target_id: newUser.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
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
