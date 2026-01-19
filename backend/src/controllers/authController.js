const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

const prisma = new PrismaClient();


const registerUser = async (req, res) => {
  const { full_name, email, password } = req.body;

  try {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(400).json({ message: 'Email này đã được sử dụng' });
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

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server' });
  }
};

module.exports = { registerUser, loginUser };