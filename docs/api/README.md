# 🔌 API Reference — Project Manager System

> **Base URL**: `http://localhost:5000/api`
> **Authentication**: Bearer JWT token (header `Authorization: Bearer <token>`)
> **Content-Type**: `application/json` (trừ upload file dùng `multipart/form-data`)

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Auth | Body/Params | Mô tả |
|--------|----------|------|-------------|-------|
| `POST` | `/auth/register` | ❌ | `{ email, password, full_name }` | Đăng ký tài khoản |
| `POST` | `/auth/login` | ❌ | `{ email, password }` | Đăng nhập → trả JWT |
| `POST` | `/auth/google` | ❌ | `{ credential }` | Đăng nhập Google OAuth |
| `POST` | `/auth/forgot-password` | ❌ | `{ email }` | Gửi email reset password |
| `POST` | `/auth/reset-password/:token` | ❌ | `{ password }` | Đặt lại mật khẩu |
| `GET` | `/auth/verify-reset-token/:token` | ❌ | — | Kiểm tra token reset hợp lệ |
| `GET` | `/auth/me` | ✅ | — | Lấy thông tin user đang đăng nhập |

**Response đăng nhập thành công**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Nguyễn Văn A",
  "role": "Admin",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 2. User Management (`/api/users`)

| Method | Endpoint | Auth | Role | Body/Params | Mô tả |
|--------|----------|------|------|-------------|-------|
| `GET` | `/users` | ✅ | Admin | — | Danh sách tất cả users |
| `POST` | `/users` | ✅ | Admin | `{ email, full_name, role }` | Tạo user + gửi email mời |
| `PUT` | `/users/:id/role` | ✅ | Admin | `{ role }` | Thay đổi role |
| `PUT` | `/users/:id/status` | ✅ | Admin | `{ status }` | Thay đổi status |
| `DELETE` | `/users/:id` | ✅ | Admin | — | Xóa user |
| `GET` | `/users/verify-invite` | ❌ | — | `?token=...` | Kiểm tra invite token |
| `POST` | `/users/accept-invite` | ❌ | — | `{ token, full_name, password }` | Chấp nhận lời mời |
| `GET` | `/users/profile` | ✅ | All | — | Xem hồ sơ cá nhân |
| `PUT` | `/users/profile` | ✅ | All | `{ full_name, avatar_path }` | Cập nhật hồ sơ |
| `PUT` | `/users/change-password` | ✅ | All | `{ currentPassword, newPassword }` | Đổi mật khẩu |
| `GET` | `/users/me/tasks` | ✅ | All | `?status=&priority=&projectId=` | Công việc được giao cho tôi |

---

## 3. Company (`/api/company`)

| Method | Endpoint | Auth | Role | Body | Mô tả |
|--------|----------|------|------|------|-------|
| `GET` | `/company` | ❌ | — | — | Xem thông tin công ty |
| `PUT` | `/company` | ✅ | Admin | `{ company_name, logo_path, field, scale }` | Cập nhật thông tin |

---

## 4. Projects (`/api/projects`)

| Method | Endpoint | Auth | Role | Body/Params | Mô tả |
|--------|----------|------|------|-------------|-------|
| `GET` | `/projects` | ✅ | All | — | Danh sách dự án (filter theo role) |
| `POST` | `/projects` | ✅ | Admin/Director | `{ project_name, description, start_date, end_date, color_code, label, priority, manager_id }` | Tạo dự án |
| `GET` | `/projects/:id` | ✅ | All | — | Chi tiết dự án |
| `PUT` | `/projects/:id` | ✅ | Admin/Director | `{ ... }` | Cập nhật dự án |
| `DELETE` | `/projects/:id` | ✅ | Admin/Director | — | Xóa dự án |
| `GET` | `/projects/:id/members` | ✅ | All | — | Danh sách thành viên |
| `GET` | `/projects/:id/member-candidates` | ✅ | All | — | Danh sách ứng viên có thể thêm |
| `POST` | `/projects/:id/members` | ✅ | Manager+ | `{ user_id, role }` | Thêm thành viên |
| `PUT` | `/projects/:id/members/:userId` | ✅ | Manager+ | `{ role }` | Đổi role member |
| `DELETE` | `/projects/:id/members/:userId` | ✅ | Manager+ | — | Xóa thành viên |
| `GET` | `/projects/:id/stats` | ✅ | All | — | Thống kê dự án |

---

## 5. Task Groups (`/api/projects/:pid/task-groups` + `/api/task-groups`)

| Method | Endpoint | Auth | Body | Mô tả |
|--------|----------|------|------|-------|
| `GET` | `/projects/:projectId/task-groups` | ✅ | — | Danh sách nhóm (kèm tasks) |
| `POST` | `/projects/:projectId/task-groups` | ✅ | `{ group_name }` | Tạo nhóm |
| `PUT` | `/projects/:projectId/task-groups/reorder` | ✅ | `{ orderedIds: [1,3,2] }` | Sắp xếp lại |
| `PUT` | `/task-groups/:id` | ✅ | `{ group_name }` | Đổi tên nhóm |
| `DELETE` | `/task-groups/:id` | ✅ | — | Xóa nhóm |

---

## 6. Tasks (`/api/task-groups/:gid/tasks` + `/api/tasks`)

| Method | Endpoint | Auth | Body/Params | Mô tả |
|--------|----------|------|-------------|-------|
| `POST` | `/task-groups/:groupId/tasks` | ✅ | `{ title, description, priority, deadline, label }` | Tạo task |
| `PUT` | `/task-groups/:groupId/tasks/reorder` | ✅ | `{ orderedIds: [...] }` | Sắp xếp tasks |
| `GET` | `/tasks/:id` | ✅ | — | Chi tiết task |
| `PUT` | `/tasks/:id` | ✅ | `{ title, description, priority, deadline, label }` | Cập nhật task |
| `DELETE` | `/tasks/:id` | ✅ | — | Xóa task |
| `PUT` | `/tasks/:id/status` | ✅ | `{ status }` | Đổi trạng thái |
| `PUT` | `/tasks/:id/progress` | ✅ | `{ completion_percent }` | Cập nhật tiến độ |
| `PUT` | `/tasks/:id/archive` | ✅ | — | Toggle archive |
| `POST` | `/tasks/:id/assignees` | ✅ | `{ user_id, role }` | Phân công |
| `DELETE` | `/tasks/:id/assignees/:userId` | ✅ | — | Bỏ phân công |
| `GET` | `/tasks/:id/subtasks` | ✅ | — | Danh sách subtasks |
| `POST` | `/tasks/:id/subtasks` | ✅ | `{ title, priority, ... }` | Tạo subtask |
| `POST` | `/tasks/:id/dependencies` | ✅ | `{ predecessor_id }` | Thêm phụ thuộc |
| `DELETE` | `/tasks/:id/dependencies/:predecessorId` | ✅ | — | Xóa phụ thuộc |
| `POST` | `/tasks/:id/move` | ✅ | `{ target_group_id, position }` | Di chuyển task |

---

## 7. Comments (`/api/tasks/:taskId/comments` + `/api/comments`)

| Method | Endpoint | Auth | Body | Mô tả |
|--------|----------|------|------|-------|
| `POST` | `/tasks/:taskId/comments` | ✅ | `{ content }` | Thêm bình luận |
| `GET` | `/tasks/:taskId/comments` | ✅ | `?page=&limit=` | Danh sách bình luận |
| `PUT` | `/comments/:id` | ✅ | `{ content }` | Sửa bình luận |
| `DELETE` | `/comments/:id` | ✅ | — | Xóa bình luận |

---

## 8. Documents (`/api/projects/:id/documents` + `/api/documents`)

| Method | Endpoint | Auth | Body | Mô tả |
|--------|----------|------|------|-------|
| `GET` | `/projects/:id/documents` | ✅ | `?parent_folder_id=` | Danh sách tài liệu |
| `POST` | `/projects/:id/documents/folder` | ✅ | `{ file_name, parent_folder_id }` | Tạo thư mục |
| `POST` | `/projects/:id/documents/upload` | ✅ | FormData: file + `parent_folder_id` | Upload file |
| `POST` | `/projects/:id/documents/link` | ✅ | `{ file_name, file_path, parent_folder_id }` | Liên kết tài liệu ngoài |
| `GET` | `/documents/:id/download` | ✅ | — | Tải file |
| `DELETE` | `/documents/:id` | ✅ | — | Xóa file/folder |

---

## 9. Chat (`/api/chat`)

| Method | Endpoint | Auth | Body | Mô tả |
|--------|----------|------|------|-------|
| `GET` | `/chat/groups` | ✅ | — | Danh sách nhóm chat |
| `POST` | `/chat/groups` | ✅ | `{ group_name, member_ids, project_id }` | Tạo nhóm chat |
| `GET` | `/chat/groups/:id/messages` | ✅ | `?cursor=&limit=` | Tin nhắn (phân trang cursor) |
| `POST` | `/chat/groups/:id/messages` | ✅ | `{ content, type }` | Gửi tin nhắn |
| `PUT` | `/chat/groups/:id/read` | ✅ | — | Đánh dấu đã đọc |
| `GET` | `/chat/direct/:userId` | ✅ | — | Lấy/tạo chat riêng |
| `POST` | `/chat/direct/:userId/messages` | ✅ | `{ content, type }` | Gửi tin riêng |

---

## 10. Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Body | Mô tả |
|--------|----------|------|------|-------|
| `GET` | `/notifications` | ✅ | `?page=&limit=` | Danh sách thông báo |
| `GET` | `/notifications/unread-count` | ✅ | — | Số thông báo chưa đọc |
| `PUT` | `/notifications/:id/read` | ✅ | — | Đánh dấu đã đọc |
| `PUT` | `/notifications/read-all` | ✅ | — | Đánh dấu tất cả đã đọc |

---

## 11. Reports (`/api/reports`)

| Method | Endpoint | Auth | Params | Mô tả |
|--------|----------|------|--------|-------|
| `GET` | `/reports/dashboard` | ✅ | — | Thống kê tổng quan dashboard |
| `GET` | `/reports/projects/:id` | ✅ | — | Báo cáo chi tiết dự án |
| `GET` | `/reports/projects/:id/burndown` | ✅ | — | Dữ liệu biểu đồ burndown |
| `GET` | `/reports/employees/:id` | ✅ | `?startDate=&endDate=` | Báo cáo theo nhân viên |

---

## 12. Socket.IO Events

### Client → Server (Emit)

| Event | Payload | Mô tả |
|-------|---------|-------|
| `chat:send` | `{ group_id, content, type?, filePath? }` | Gửi tin nhắn |
| `chat:typing` | `{ group_id }` | Thông báo đang gõ |
| `chat:read` | `{ group_id }` | Đánh dấu đã đọc |
| `comment:new` | `{ project_id, ... }` | Broadcast comment mới |
| `task:updated` | `{ project_id, ... }` | Broadcast task cập nhật |

### Server → Client (On)

| Event | Payload | Mô tả |
|-------|---------|-------|
| `chat:send` | Message object (full) | Tin nhắn mới |
| `chat:typing` | `{ group_id, user_id }` | Người khác đang gõ |
| `chat:read` | `{ group_id, user_id }` | Người khác đã đọc |
| `notification:new` | Notification object | Thông báo mới |
| `user:online` | `{ userId }` | User lên mạng |
| `user:offline` | `{ userId }` | User offline |
| `comment:new` | Comment payload | Comment mới trong dự án |
| `task:updated` | Task payload | Task cập nhật trong dự án |

---

## 13. Error Response Format

Tất cả API trả lỗi theo format thống nhất:

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "statusCode": 400
}
```

| Status Code | Ý nghĩa |
|-------------|---------|
| `400` | Bad Request — dữ liệu không hợp lệ |
| `401` | Unauthorized — chưa đăng nhập / token hết hạn |
| `403` | Forbidden — không đủ quyền |
| `404` | Not Found — resource không tồn tại |
| `409` | Conflict — dữ liệu trùng lặp |
| `500` | Internal Server Error |
