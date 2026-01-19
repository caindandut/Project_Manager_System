const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());


app.get('/api/health', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        res.json({
            status: 'success',
            message: 'Server hoạt động tốt! Kết nối DB thành công.',
            database_stats: {
                users: userCount
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Lỗi kết nối DB!' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});