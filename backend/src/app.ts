import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import { notFound, errorHandler } from './middlewares/errorMiddleware';

dotenv.config();

const app: Application = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);

app.get('/', (_req: Request, res: Response): void => {
    res.send('API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT: number = Number(process.env.PORT) || 5000;

app.listen(PORT, (): void => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});
