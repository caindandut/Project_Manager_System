import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        full_name: string;
        email: string;
        role: string;
        avatar_path: string | null;
      };
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true,
          avatar_path: true,
        },
      });

      if (!user) {
        res.status(401).json({ message: 'Token hợp lệ nhưng User không tồn tại' });
        return;
      }

      req.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role ? String(user.role) : 'Employee',
        avatar_path: user.avatar_path,
      };

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
      return;
    }
  } else {
    res.status(401).json({ message: 'Không có quyền truy cập, vui lòng gửi Token' });
    return;
  }
};
