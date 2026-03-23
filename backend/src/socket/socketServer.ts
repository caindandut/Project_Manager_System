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

type ProjectScopedPayload = {
  project_id?: number;
  [key: string]: unknown;
};

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.IO server chưa được khởi tạo. Hãy gọi initSocket trước.');
  }
  return io;
}

async function getUserProjectRooms(userId: number): Promise<string[]> {
  const memberships = await prisma.projectmember.findMany({
    where: { user_id: userId },
    select: { project_id: true },
  });
  return memberships.map((row) => `project:${row.project_id}`);
}

async function canJoinProjectRoom(userId: number, projectId: number): Promise<boolean> {
  const requester = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, company_id: true },
  });
  if (!requester) return false;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { company_id: true },
  });
  if (!project) return false;

  if (requester.role === 'Admin') {
    return requester.company_id != null && requester.company_id === project.company_id;
  }

  const membership = await prisma.projectmember.findUnique({
    where: {
      project_id_user_id: { project_id: projectId, user_id: userId },
    },
    select: { project_id: true },
  });
  return !!membership;
}

function parseProjectId(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = (payload as ProjectScopedPayload).project_id;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function joinProjectRoom(userId: number): Promise<void> {
  const rooms = await getUserProjectRooms(userId);
  if (!rooms.length) return;
  getIo().in(`user:${userId}`).socketsJoin(rooms);
}

export async function leaveProjectRoom(userId: number): Promise<void> {
  const rooms = await getUserProjectRooms(userId);
  if (!rooms.length) return;
  getIo().in(`user:${userId}`).socketsLeave(rooms);
}

async function handleProjectBroadcast(
  socket: SocketWithUser,
  eventName: string,
  payload: unknown,
): Promise<void> {
  const userId = socket.userId;
  if (!userId) return;

  const projectId = parseProjectId(payload);
  if (!projectId) return;

  const allowed = await canJoinProjectRoom(userId, projectId);
  if (!allowed) return;

  getIo().to(`project:${projectId}`).emit(eventName, payload);
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
    await joinProjectRoom(user.id);
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

    socket.on(SOCKET_EVENTS.COMMENT_NEW, (payload: unknown) => {
      void handleProjectBroadcast(socket, SOCKET_EVENTS.COMMENT_NEW, payload);
    });

    socket.on(SOCKET_EVENTS.TASK_UPDATED, (payload: unknown) => {
      void handleProjectBroadcast(socket, SOCKET_EVENTS.TASK_UPDATED, payload);
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      if (!socket.userId) return;
      try {
        await leaveProjectRoom(socket.userId);
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

