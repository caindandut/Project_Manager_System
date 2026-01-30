import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaUserRepository } from '../infrastructure/repositories/PrismaUserRepository';

interface DecodedToken {
  id: number;
}

const userRepository = new PrismaUserRepository();

export const protect = async (req: Request | any, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;

      const userEntity = await userRepository.findById(decoded.id);

      if (!userEntity) {
        res.status(401);
        throw new Error('Token hợp lệ nhưng User không tồn tại');
      }

      req.user = {
        id: userEntity.id,
        email: userEntity.email,
        fullName: userEntity.fullName,
        role: userEntity.role,
        avatarPath: userEntity.avatarPath
      };

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  } else {
    res.status(401).json({ message: 'Không có quyền truy cập, vui lòng gửi Token' });
  }
};