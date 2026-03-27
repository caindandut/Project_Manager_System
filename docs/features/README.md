# ✅ Danh Sách Chức Năng — Project Manager System

## Tổng Quan Trạng Thái

| Trạng thái | Ý nghĩa |
|------------|---------|
| ✅ Đã hoàn thành | Có đầy đủ backend API + frontend UI |
| 🔧 Một phần | Backend hoặc Frontend chưa đầy đủ |
| ❌ Chưa làm | Chưa triển khai |

---

## 1. Xác Thực & Phân Quyền (Authentication & Authorization)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 1.1 | Đăng nhập email/password | ✅ | `POST /api/auth/login` + LoginPage |
| 1.2 | Đăng nhập Google OAuth | ✅ | `POST /api/auth/google` + @react-oauth/google |
| 1.3 | Đăng ký tài khoản | ✅ | `POST /api/auth/register` (backend) |
| 1.4 | Quên mật khẩu | ✅ | `POST /api/auth/forgot-password` + ForgotPasswordPage |
| 1.5 | Đặt lại mật khẩu | ✅ | `POST /api/auth/reset-password/:token` + ResetPasswordPage |
| 1.6 | Xác thực reset token | ✅ | `GET /api/auth/verify-reset-token/:token` |
| 1.7 | Lấy user hiện tại | ✅ | `GET /api/auth/me` (JWT protected) |
| 1.8 | Phân quyền theo role (Admin/Director/Employee) | ✅ | `authorizeRoles` middleware |
| 1.9 | Protected/Public route (frontend) | ✅ | ProtectedRoute + PublicRoute components |
| 1.10 | JWT auto-refresh | ❌ | Chưa có refresh token mechanism |
| 1.11 | Rate limiting | ❌ | Chưa triển khai |

---

## 2. Quản Lý Người Dùng (User Management)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 2.1 | Danh sách người dùng (Admin) | ✅ | `GET /api/users` + MembersPage |
| 2.2 | Tạo/mời người dùng (Admin) | ✅ | `POST /api/users` + email mời qua Nodemailer |
| 2.3 | Chấp nhận lời mời | ✅ | `POST /api/users/accept-invite` + AcceptInvitePage |
| 2.4 | Xác minh link mời | ✅ | `GET /api/users/verify-invite` |
| 2.5 | Cập nhật role người dùng (Admin) | ✅ | `PUT /api/users/:id/role` |
| 2.6 | Cập nhật status người dùng (Admin) | ✅ | `PUT /api/users/:id/status` |
| 2.7 | Xóa người dùng (Admin) | ✅ | `DELETE /api/users/:id` |
| 2.8 | Xem hồ sơ cá nhân | ✅ | `GET /api/users/profile` + ProfilePage |
| 2.9 | Cập nhật hồ sơ | ✅ | `PUT /api/users/profile` |
| 2.10 | Đổi mật khẩu | ✅ | `PUT /api/users/change-password` |
| 2.11 | Upload avatar | 🔧 | Backend hỗ trợ Multer, frontend có UI |
| 2.12 | Trạng thái online/offline (real-time) | ✅ | Socket.IO `user:online` / `user:offline` |

---

## 3. Quản Lý Công Ty (Company Management)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 3.1 | Xem thông tin công ty | ✅ | `GET /api/company` |
| 3.2 | Cập nhật thông tin công ty (Admin) | ✅ | `PUT /api/company` + SettingsPage |

---

## 4. Quản Lý Dự Án (Project Management)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 4.1 | Danh sách dự án | ✅ | `GET /api/projects` + ProjectsPage |
| 4.2 | Tạo dự án (Admin/Director) | ✅ | `POST /api/projects` + CreateProjectDialog |
| 4.3 | Chi tiết dự án | ✅ | `GET /api/projects/:id` + ProjectDetailPage |
| 4.4 | Cập nhật dự án | ✅ | `PUT /api/projects/:id` |
| 4.5 | Xóa dự án (Admin/Director) | ✅ | `DELETE /api/projects/:id` |
| 4.6 | Thành viên dự án | ✅ | `GET/POST/PUT/DELETE /api/projects/:id/members` |
| 4.7 | Tìm ứng viên thêm member | ✅ | `GET /api/projects/:id/member-candidates` |
| 4.8 | Thống kê dự án | ✅ | `GET /api/projects/:id/stats` |
| 4.9 | Lọc dự án (label, priority, status) | ✅ | Frontend filtering |
| 4.10 | Mã màu dự án (color_code) | ✅ | Color picker khi tạo/sửa |
| 4.11 | Label selector (chip) | ✅ | LabelChipSelector component |

---

## 5. Nhóm Công Việc (Task Groups / Columns)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 5.1 | Danh sách nhóm công việc theo dự án | ✅ | `GET /api/projects/:pid/task-groups` |
| 5.2 | Tạo nhóm | ✅ | `POST /api/projects/:pid/task-groups` |
| 5.3 | Đổi tên nhóm | ✅ | `PUT /api/task-groups/:id` |
| 5.4 | Xóa nhóm (cascade xóa tasks) | ✅ | `DELETE /api/task-groups/:id` |
| 5.5 | Sắp xếp lại nhóm (reorder) | ✅ | `PUT /api/projects/:pid/task-groups/reorder` |

---

## 6. Quản Lý Công Việc (Task Management)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 6.1 | Tạo công việc trong nhóm | ✅ | `POST /api/task-groups/:gid/tasks` |
| 6.2 | Chi tiết công việc | ✅ | `GET /api/tasks/:id` + TaskDetailPanel |
| 6.3 | Cập nhật công việc | ✅ | `PUT /api/tasks/:id` |
| 6.4 | Xóa công việc | ✅ | `DELETE /api/tasks/:id` |
| 6.5 | Cập nhật trạng thái | ✅ | `PUT /api/tasks/:id/status` |
| 6.6 | Cập nhật tiến độ (%) | ✅ | `PUT /api/tasks/:id/progress` |
| 6.7 | Lưu trữ (archive) | ✅ | `PUT /api/tasks/:id/archive` |
| 6.8 | Phân công/bỏ phân công | ✅ | `POST/DELETE /api/tasks/:id/assignees` |
| 6.9 | Sắp xếp lại tasks trong nhóm | ✅ | `PUT /api/task-groups/:gid/tasks/reorder` |
| 6.10 | Di chuyển task sang nhóm khác | ✅ | `POST /api/tasks/:id/move` |
| 6.11 | Subtasks (tạo + lấy danh sách) | ✅ | `POST/GET /api/tasks/:id/subtasks` |
| 6.12 | Task dependencies | ✅ | `POST/DELETE /api/tasks/:id/dependencies` |
| 6.13 | Lọc task (status, priority, assignee, label) | ✅ | TasksFilterBar + taskFilters.js |

---

## 7. Chế Độ Xem Công Việc (Task Views)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 7.1 | **Kanban Board** (kéo-thả) | ✅ | KanbanView.jsx + dnd-kit |
| 7.2 | **List View** (bảng) | ✅ | TaskListView.jsx |
| 7.3 | **Gantt Chart** | ✅ | TaskGanttView.jsx + gantt.jsx (custom) |
| 7.4 | **Calendar View** | ✅ | TaskCalendarView.jsx + calendar.jsx |
| 7.5 | Task Detail Panel (side panel) | ✅ | TaskDetailPanel.jsx (32KB) |

---

## 8. Công Việc Của Tôi (My Tasks)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 8.1 | Xem tất cả task được giao cho mình | ✅ | `GET /api/users/me/tasks` + MyTasksPage |
| 8.2 | Lọc theo status, priority, project | ✅ | Query params filtering |

---

## 9. Bình Luận (Comments)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 9.1 | Xem bình luận của task | ✅ | `GET /api/tasks/:taskId/comments` + TaskComments |
| 9.2 | Thêm bình luận | ✅ | `POST /api/tasks/:taskId/comments` |
| 9.3 | Sửa bình luận | ✅ | `PUT /api/comments/:id` |
| 9.4 | Xóa bình luận | ✅ | `DELETE /api/comments/:id` |
| 9.5 | Real-time comment (Socket.IO) | ✅ | `comment:new` event |

---

## 10. Quản Lý Tài Liệu (Document Management)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 10.1 | Danh sách tài liệu theo dự án | ✅ | `GET /api/projects/:id/documents` + DocumentExplorer |
| 10.2 | Tạo thư mục | ✅ | `POST /api/projects/:id/documents/folder` |
| 10.3 | Upload file | ✅ | `POST /api/projects/:id/documents/upload` (Multer) |
| 10.4 | Liên kết tài liệu bên ngoài | ✅ | `POST /api/projects/:id/documents/link` |
| 10.5 | Tải file | ✅ | `GET /api/documents/:id/download` |
| 10.6 | Xóa file/folder | ✅ | `DELETE /api/documents/:id` |
| 10.7 | Cây thư mục (nested folders) | ✅ | Self-referencing document table |

---

## 11. Nhắn Tin / Chat (Messaging)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 11.1 | Danh sách nhóm chat | ✅ | `GET /api/chat/groups` + ChatSidebar |
| 11.2 | Tạo nhóm chat | ✅ | `POST /api/chat/groups` |
| 11.3 | Lấy tin nhắn nhóm (phân trang) | ✅ | `GET /api/chat/groups/:id/messages` |
| 11.4 | Gửi tin nhắn nhóm | ✅ | `POST /api/chat/groups/:id/messages` + Socket.IO |
| 11.5 | Đánh dấu đã đọc | ✅ | `PUT /api/chat/groups/:id/read` + `chat:read` event |
| 11.6 | Chat riêng (direct message) | ✅ | `GET/POST /api/chat/direct/:userId` |
| 11.7 | Typing indicator (real-time) | ✅ | Socket.IO `chat:typing` event |
| 11.8 | Gửi file/ảnh trong chat | 🔧 | Schema hỗ trợ (message_type: Image/File), chưa có UI upload |

---

## 12. Thông Báo (Notifications)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 12.1 | Danh sách thông báo | ✅ | `GET /api/notifications` + NotificationDropdown |
| 12.2 | Đếm chưa đọc | ✅ | `GET /api/notifications/unread-count` |
| 12.3 | Đánh dấu đã đọc (từng cái) | ✅ | `PUT /api/notifications/:id/read` |
| 12.4 | Đánh dấu tất cả đã đọc | ✅ | `PUT /api/notifications/read-all` |
| 12.5 | Real-time notification | ✅ | Socket.IO `notification:new` |
| 12.6 | Email notification | ❌ | Chưa triển khai gửi email thông báo |

---

## 13. Báo Cáo & Thống Kê (Reports & Analytics)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 13.1 | Dashboard tổng quan | ✅ | `GET /api/reports/dashboard` + DashboardPage |
| 13.2 | Báo cáo theo dự án | ✅ | `GET /api/reports/projects/:id` |
| 13.3 | Biểu đồ Burndown | ✅ | `GET /api/reports/projects/:id/burndown` + BurndownChart |
| 13.4 | Báo cáo theo nhân viên | ✅ | `GET /api/reports/employees/:id` |
| 13.5 | Xuất báo cáo (PDF/Excel) | ❌ | Chưa triển khai |

---

## 14. Nhật Ký Hoạt Động (Activity Logs)

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 14.1 | Bảng `activitylog` trong DB | ✅ | Schema đã có |
| 14.2 | API xem activity log | ❌ | Chưa có route/controller |
| 14.3 | UI hiển thị nhật ký | ❌ | Chưa triển khai |

---

## 15. Chức Năng Khác

| # | Chức năng | Trạng thái | Chi tiết |
|---|-----------|------------|----------|
| 15.1 | Responsive layout | ✅ | TailwindCSS responsive |
| 15.2 | Error boundary (frontend) | ✅ | ErrorBoundary.jsx |
| 15.3 | Graceful shutdown (backend) | ✅ | SIGTERM/SIGINT handling |
| 15.4 | Static file serving (uploads) | ✅ | `express.static('uploads')` |
| 15.5 | CORS configuration | ✅ | Whitelist localhost:5173 |
| 15.6 | Internationalization (i18n) | ❌ | Chưa hỗ trợ đa ngôn ngữ |
| 15.7 | Dark mode | ❌ | Chưa triển khai |
| 15.8 | Unit/E2E testing | ❌ | Chưa có test suite |
| 15.9 | CI/CD pipeline | ❌ | Chưa thiết lập |
| 15.10 | Logging (structured) | ❌ | Chỉ console.log/console.error |
| 15.11 | API documentation (Swagger/OpenAPI) | ❌ | Chưa có |

---

## Thống Kê Tổng Hợp

| Metric | Giá trị |
|--------|---------|
| **Tổng chức năng đã liệt kê** | ~75 |
| **Đã hoàn thành (✅)** | ~60 (80%) |
| **Một phần (🔧)** | ~2 (3%) |
| **Chưa làm (❌)** | ~13 (17%) |
