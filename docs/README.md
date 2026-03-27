# 📋 Project Manager System — Tổng Quan Dự Án

## Mô tả

**Project Manager System** là hệ thống quản lý dự án và công việc dành cho doanh nghiệp, xây dựng theo mô hình **client–server** với giao tiếp **REST API + WebSocket (Socket.IO)**.

Hệ thống hỗ trợ:
- Quản lý dự án, nhóm công việc (task group), công việc (task) với nhiều chế độ xem (Kanban, Gantt, List, Calendar).
- Quản lý thành viên, phân quyền theo vai trò (Admin / Director / Employee).
- Chat real-time (nhóm + trò chuyện riêng).
- Quản lý tài liệu (file/folder) theo dự án.
- Thông báo real-time, báo cáo & biểu đồ burndown.
- Xác thực đa phương thức (email/password + Google OAuth).

---

## Tech Stack

| Layer      | Công nghệ                                                                 |
|------------|---------------------------------------------------------------------------|
| **Frontend** | React 19, Vite 7, TailwindCSS 3, Shadcn/Radix UI, Jotai, dnd-kit, Recharts, Socket.IO Client |
| **Backend**  | Node.js, Express 5, TypeScript, Prisma ORM, Zod, Socket.IO, Multer, Nodemailer, JWT, bcryptjs |
| **Database** | MySQL 8 (via Prisma)                                                     |
| **Auth**     | JWT + Google OAuth 2.0                                                   |

---

## Cấu trúc thư mục

```
project-manager/
├── backend/
│   ├── prisma/               # Prisma schema (MySQL)
│   ├── src/
│   │   ├── app.ts            # Entry point — Express + Socket.IO server
│   │   ├── controllers/      # 11 controller files
│   │   ├── routes/           # 11 route files
│   │   ├── services/         # 11 service files + helpers/
│   │   ├── validators/       # 10 Zod schema files
│   │   ├── middlewares/      # auth, authorize, error, upload, validate
│   │   ├── domain/           # DDD entities (Project, Task, User) + value-objects
│   │   ├── infrastructure/   # Prisma repositories
│   │   ├── socket/           # Socket.IO server + events
│   │   ├── lib/              # Prisma client singleton
│   │   └── utils/            # AppError, asyncHandler, generateToken, parseRequestId
│   ├── docs/                 # Tài liệu cũ (OOP review, implementation plan)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # React Router — 13 trang
│   │   ├── api/              # 12 API module files (axios)
│   │   ├── pages/            # 13 page components
│   │   ├── components/       # UI components theo chức năng
│   │   │   ├── ui/           # Shadcn primitives + Kanban, Gantt, List views
│   │   │   ├── task/         # KanbanView, TaskDetailPanel, TaskListView, Gantt, Calendar, Comments, Filter
│   │   │   ├── project/      # CreateProjectDialog, LabelChipSelector, ProjectBadges
│   │   │   ├── chat/         # ChatSidebar, MessageBubble, MessageInput, MessageList
│   │   │   ├── document/     # DocumentExplorer
│   │   │   ├── notification/ # NotificationDropdown
│   │   │   ├── chart/        # BurndownChart
│   │   │   └── layout/       # DashboardLayout
│   │   ├── context/          # AuthContext, SocketContext
│   │   ├── hooks/            # useSocket
│   │   ├── constants/        # projectUi, taskUi
│   │   ├── utils/            # taskFilters
│   │   └── lib/              # socket client, cn() utility
│   └── package.json
└── docs/                     # 📂 THƯ MỤC NÀY — Tài liệu tổng hợp
```

---

## Khởi chạy dự án

### Yêu cầu
- Node.js ≥ 18
- MySQL 8+
- npm

### Backend
```bash
cd backend
npm install
# Tạo file .env (xem .env.example)
npx prisma generate
npx prisma db push    # hoặc npx prisma migrate dev
npm run dev            # nodemon + ts-node → http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Vite → http://localhost:5173
```

---

## Tài liệu chi tiết

| Tài liệu | Mô tả |
|-----------|--------|
| [architecture.md](./architecture.md) | Kiến trúc tổng thể hệ thống |
| [database.md](./database.md) | Thiết kế cơ sở dữ liệu (ERD, models, enums) |
| [features/README.md](./features/README.md) | Danh sách chức năng (đã hoàn thành & chưa làm) |
| [api/README.md](./api/README.md) | Tài liệu API endpoints |
| [deployment-plan.md](./deployment-plan.md) | Kế hoạch triển khai còn lại |
| [evaluation.md](./evaluation.md) | Đánh giá dự án hiện tại |
