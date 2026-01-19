const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const generateToken = require('../utils/generateToken');

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



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

const loginGoogle = async (req, res) => {
  const { token } = req.body; 

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { email, name, picture, sub } = ticket.getPayload(); 

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          google_id: sub,
          avatar_path: picture,
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
          avatar_path: picture,
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

module.exports = { registerUser, loginUser, loginGoogle };