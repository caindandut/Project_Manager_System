import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { SOCKET_EVENTS } from './socketEvents';

interface DecodedToken {
  id: number;
}

interface SocketWithUser extends Socket {
  userId?: number;
}

let io: Server | null = null;

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.IO server chưa được khởi tạo. Hãy gọi initSocket trước.');
  }
  return io;
}

async function authenticateSocket(socket: SocketWithUser): Promise<void> {
  try {
    const token =
      (socket.handshake.auth && (socket.handshake.auth as any).token) ||
      socket.handshake.headers.authorization?.toString().replace('Bearer ', '');

    if (!token) {
      socket.disconnect(true);
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, status: true },
    });

    if (!user || user.status === 'Inactive') {
      socket.disconnect(true);
      return;
    }

    socket.userId = user.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { is_online: true },
    });

    socket.join(`user:${user.id}`);
    getIo().emit(SOCKET_EVENTS.USER_ONLINE, { userId: user.id });
  } catch (error) {
    console.error('Socket auth error:', error);
    socket.disconnect(true);
  }
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket: SocketWithUser) => {
    void authenticateSocket(socket);

    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      if (!socket.userId) return;
      try {
        await prisma.user.update({
          where: { id: socket.userId },
          data: { is_online: false },
        });
        io?.emit(SOCKET_EVENTS.USER_OFFLINE, { userId: socket.userId });
      } catch (err) {
        console.error('Socket disconnect update error:', err);
      }
    });
  });

  console.log('Socket.IO server initialized');

  return io;
}

