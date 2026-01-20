const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true,
          avatar_path: true,
        },
      });

      if (!req.user) {
         return res.status(401).json({ message: 'Token hợp lệ nhưng User không tồn tại' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  } else {
    res.status(401).json({ message: 'Không có quyền truy cập, vui lòng gửi Token' });
  }
};

module.exports = { protect };