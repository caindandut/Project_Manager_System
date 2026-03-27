# 🚀 Kế Hoạch Triển Khai Còn Lại — Project Manager System

## 1. Tổng Quan Tiến Độ Hiện Tại

| Hạng mục | Hoàn thành | Còn lại |
|----------|------------|---------|
| Backend API | ~95% | 5% |
| Frontend UI | ~85% | 15% |
| Real-time (Socket.IO) | ~90% | 10% |
| Testing | 0% | 100% |
| DevOps / Deployment | 0% | 100% |
| Documentation | ~80% | 20% |

---

## 2. Các Hạng Mục Cần Hoàn Thiện

### 2.1. 🔴 Ưu tiên cao (Bắt buộc)

#### A. Bảo mật & Auth
- [ ] **JWT Refresh Token**: Hiện tại chỉ có access token, cần thêm refresh token để tránh đăng nhập lại.
- [ ] **Rate Limiting**: Chống brute-force trên `/auth/login`, `/auth/forgot-password`. Gợi ý: `express-rate-limit`.
- [ ] **Input Sanitization**: Chống XSS trên text fields (content, description). Gợi ý: `dompurify` / `xss`.
- [ ] **Ẩn SECRET keys**: Loại bỏ hard-coded secrets trong `.env` trước khi deploy (sử dụng secrets manager).
- [ ] **HTTPS enforcement**: Bắt buộc HTTPS trên production.

#### B. Chức năng thiếu
- [ ] **Activity Log UI**: Bảng `activitylog` đã có nhưng chưa có API + UI hiển thị.
- [ ] **Email Notification**: Gửi email khi được assign task, nhận comment mới, project deadline gần.
- [ ] **Xuất báo cáo**: Export PDF/Excel cho dashboard + project report.
- [ ] **File/Image trong chat**: UI upload file và preview ảnh trong tin nhắn chat.

#### C. Testing
- [ ] **Unit tests (Backend)**: Service layer tests với mock Prisma. Gợi ý: `vitest` + `@quramy/prisma-fabbrica`.
- [ ] **API integration tests**: Gợi ý: `supertest`.
- [ ] **E2E tests (Frontend)**: Gợi ý: `Playwright` hoặc `Cypress`.
- [ ] Mục tiêu coverage tối thiểu: **70%** cho backend services.

---

### 2.2. 🟡 Ưu tiên trung bình

#### D. UX Improvements
- [ ] **Dark mode**: Thêm theme toggle (TailwindCSS `dark:` variants).
- [ ] **Responsive mobile**: Kiểm tra và tối ưu layout trên mobile/tablet.
- [ ] **Loading states**: Skeleton loaders cho các trang chính (Dashboard, Projects, Tasks).
- [ ] **Optimistic updates**: Cập nhật UI trước khi API response (Kanban drag-drop, comment).
- [ ] **Search global**: Tìm kiếm nhanh project/task/user từ header.
- [ ] **Keyboard shortcuts**: VD: `Ctrl+K` = search, `N` = new task.

#### E. Performance
- [ ] **API pagination**: Đảm bảo tất cả list endpoint hỗ trợ pagination.
- [ ] **Query optimization**: Review N+1 queries trong Prisma (sử dụng `include` hợp lý).
- [ ] **Frontend lazy loading**: Code splitting cho từng page bằng `React.lazy()`.
- [ ] **Image optimization**: Resize + compress avatar/document thumbnails.
- [ ] **Caching**: Redis cache cho dashboard stats, project stats (TTL 5-10 phút).

#### F. Backend Enhancements
- [ ] **Structured Logging**: Thay console.log bằng `pino` hoặc `winston`.
- [ ] **Request validation**: Đảm bảo 100% endpoints có Zod schema.
- [ ] **Swagger/OpenAPI**: Tự động generate API docs. Gợi ý: `swagger-jsdoc` + `swagger-ui-express`.
- [ ] **Health check endpoint**: `GET /api/health` cho monitoring.

---

### 2.3. 🟢 Ưu tiên thấp (Nice-to-have)

- [ ] **Internationalization (i18n)**: Hỗ trợ tiếng Anh (react-i18next).
- [ ] **Audit trail**: Log chi tiết mọi thay đổi trên task/project (diff).
- [ ] **Recurring tasks**: Task lặp lại theo chu kỳ.
- [ ] **Time tracking**: Ghi nhận thời gian làm việc trên từng task.
- [ ] **Template projects**: Tạo dự án từ template có sẵn.
- [ ] **Task tags/labels**: Hệ thống tag linh hoạt (thay vì label cố định).
- [ ] **Webhook integration**: Tích hợp với Slack, Microsoft Teams.
- [ ] **2FA**: Xác thực hai yếu tố cho tài khoản.

---

## 3. Kế Hoạch Deployment

### 3.1. Kiến trúc Production

```
                                    ┌─────────────┐
                                    │   Nginx     │
                                    │  (Reverse   │
                               ┌────┤   Proxy)    ├────┐
                               │    └─────────────┘    │
                               │                       │
                    ┌──────────▼──────────┐  ┌────────▼─────────┐
                    │   Frontend (SPA)    │  │   Backend API    │
                    │   Static files      │  │   Node.js        │
                    │   (Vite build)      │  │   PM2 cluster    │
                    └─────────────────────┘  └────────┬─────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │   MySQL 8        │
                                              │   (RDS / VPS)    │
                                              └──────────────────┘
```

### 3.2. Checklist Deploy

#### Chuẩn bị
- [ ] Build frontend: `npm run build` → `dist/`
- [ ] Build backend: `npm run build` (TypeScript → JavaScript)
- [ ] Prisma generate + migrate prod database
- [ ] Thiết lập biến môi trường production (.env)
- [ ] Cấu hình CORS cho domain production
- [ ] Cấu hình Socket.IO origin cho domain production

#### Infrastructure
- [ ] Chọn hosting: VPS (DigitalOcean / AWS EC2) hoặc PaaS (Railway / Render)
- [ ] Setup MySQL database (RDS hoặc self-hosted)
- [ ] Setup Nginx reverse proxy
- [ ] SSL certificate (Let's Encrypt)
- [ ] Domain name setup

#### Monitoring
- [ ] PM2 process manager cho backend
- [ ] Health check monitoring (UptimeRobot / Healthchecks.io)
- [ ] Error tracking (Sentry)
- [ ] Log aggregation

#### CI/CD (nếu có)
- [ ] GitHub Actions workflow
  - Lint → Test → Build → Deploy
- [ ] Auto-deploy on push to `main` branch
- [ ] Environment separation: staging / production

---

## 4. Timeline Đề Xuất

| Tuần | Hạng mục | Chi tiết |
|------|----------|----------|
| **Tuần 1** | Security + Bug fixes | JWT refresh, rate limiting, input sanitization |
| **Tuần 2** | Missing features | Activity log, email notification, export report |
| **Tuần 3** | Testing | Backend unit tests, API integration tests |
| **Tuần 4** | UX Polish | Dark mode, loading states, responsive mobile |
| **Tuần 5** | Performance | Lazy loading, query optimization, caching |
| **Tuần 6** | Deployment | Production setup, CI/CD, monitoring |

> **Lưu ý**: Timeline trên giả định 1 developer fulltime. Có thể rút ngắn nếu có team.
