import express, { Application, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import companyRoutes from './routes/companyRoutes';
import projectRoutes from './routes/projectRoutes';
import { nestedTaskGroupRouter, flatTaskGroupRouter } from './routes/taskGroupRoutes';
import taskRoutes from './routes/taskRoutes';
import commentRoutes from './routes/commentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import chatRoutes from './routes/chatRoutes';
import { projectDocumentRouter, flatDocumentRouter } from './routes/documentRoutes';
import { notFound, errorHandler } from './middlewares/errorMiddleware';
import { initSocket } from './socket/socketServer';

dotenv.config();

const app: Application = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/company', companyRoutes);

/**
 * GĐ2 mục 2.13 — Task & task group (Express: mount trước/sau ảnh hưởng khớp route).
 * - nestedTaskGroupRouter @ /api/projects → GET|POST …/projects/:projectId/task-groups, PUT …/reorder
 * - projectRoutes @ /api/projects → CRUD dự án, members, stats (:id một segment)
 * - flatTaskGroupRouter @ /api/task-groups → PUT|DELETE /api/task-groups/:id
 * - taskRoutes @ /api → POST …/task-groups/:groupId/tasks, CRUD …/tasks/:id, status, assignees, …
 * Công việc của tôi: GET /api/users/me/tasks (app.use('/api/users', userRoutes) — getMyTasks).
 */
app.use('/api/projects', nestedTaskGroupRouter);
app.use('/api/projects', projectDocumentRouter);
app.use('/api/projects', projectRoutes);
app.use('/api/task-groups', flatTaskGroupRouter);
app.use('/api', commentRoutes);
app.use('/api', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', flatDocumentRouter);
app.use('/api', taskRoutes);

app.get('/', (_req: Request, res: Response): void => {
    res.send('API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT: number = Number(process.env.PORT) || 5000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, (): void => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});

function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received — shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
