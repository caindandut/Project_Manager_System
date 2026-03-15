import express, { Application, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import companyRoutes from './routes/companyRoutes';
import projectRoutes from './routes/projectRoutes';
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
app.use('/api/projects', projectRoutes);

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
