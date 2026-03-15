import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  MoreVertical,
  Shield,
  ShieldCheck,
  UserCog,
  Lock,
  Unlock,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import userApi from "@/api/userApi";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];

function getInitials(name) {
  return (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const ROLE_CONFIG = {
  Admin: { label: "Admin", icon: ShieldCheck, variant: "default", className: "bg-blue-100 text-blue-700 border-blue-200" },
  Director: { label: "Director", icon: Shield, variant: "default", className: "bg-violet-100 text-violet-700 border-violet-200" },
  Employee: { label: "Employee", icon: UserCog, variant: "secondary", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

// ─── Toast ───────────────────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          type === "success"
            ? "bg-emerald-600 text-white"
            : "bg-red-600 text-white"
        }`}
      >
        {message}
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
      </div>
    </div>
  );
}

// ─── Create User Modal ───────────────────────────────────────
function CreateUserModal({ open, onOpenChange, onSuccess }) {
  const [form, setForm] = useState({ email: "", role: "Employee" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm({ email: "", role: "Employee" });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim()) {
      setError("Vui lòng nhập email");
      return;
    }

    setLoading(true);
    try {
      await userApi.create(form);
      resetForm();
      onOpenChange(false);
      onSuccess("Đã gửi lời mời đến email");
    } catch (err) {
      const msg = err.response?.data?.message || "Có lỗi xảy ra";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm nhân viên mới</DialogTitle>
          <DialogDescription>Tạo tài khoản cho thành viên mới trong hệ thống.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Vai trò</Label>
            <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Actions Dropdown ────────────────────────────────────────
function UserActions({ user, currentUserId, onRoleChange, onStatusChange, onDelete }) {
  const isActive = user.status === "Active";
  const roles = ["Admin", "Director", "Employee"].filter((r) => r !== user.role);
  const isSelf = user.id === currentUserId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserCog className="h-4 w-4" />
            Đổi vai trò
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {roles.map((role) => {
              const cfg = ROLE_CONFIG[role];
              const Icon = cfg.icon;
              return (
                <DropdownMenuItem key={role} onClick={() => onRoleChange(user.id, role)}>
                  <Icon className="h-4 w-4" />
                  {cfg.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onStatusChange(user.id, isActive ? "Inactive" : "Active")}
          className={isActive ? "text-red-600 focus:text-red-600" : "text-emerald-600 focus:text-emerald-600"}
        >
          {isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          {isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        </DropdownMenuItem>
        {!isSelf && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(user)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Xóa tài khoản
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Members Page ────────────────────────────────────────────
export default function MembersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await userApi.getAll();
      setUsers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleCreateSuccess = (message) => {
    showToast(message);
    fetchUsers();
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userApi.updateRole(userId, newRole);
      showToast(`Đã cập nhật vai trò thành ${newRole}`);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Lỗi cập nhật vai trò", "error");
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await userApi.updateStatus(userId, newStatus);
      showToast(newStatus === "Active" ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản");
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Lỗi cập nhật trạng thái", "error");
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await userApi.delete(userToDelete.id);
      showToast("Đã xóa tài khoản thành công");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể xóa tài khoản", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quản lý thành viên</h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý quyền truy cập và vai trò của thành viên trong hệ thống.
            </p>
          </div>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Thêm nhân viên
          </Button>
        </div>

        {/* Search & Count */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm kiếm theo tên, email..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!loading && (
            <p className="text-sm text-slate-500">
              {filtered.length} thành viên
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Đang tải danh sách...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="mt-3 text-sm text-red-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchUsers}>
              Thử lại
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              {searchQuery ? "Không tìm thấy kết quả phù hợp." : "Chưa có thành viên nào."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Người dùng
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Email
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Vai trò
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.Employee;
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`${getAvatarColor(u.id)} flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white`}
                            >
                              {getInitials(u.full_name)}
                            </div>
                            <span className="font-medium text-slate-900">{u.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{u.email}</td>
                        <td className="px-6 py-4">
                          <Badge className={roleCfg.className}>
                            {roleCfg.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {u.status === "Active" && (
                            <Badge variant="success">Hoạt động</Badge>
                          )}
                          {u.status === "Inactive" && (
                            <Badge variant="error">Đã khóa</Badge>
                          )}
                          {u.status === "Pending" && (
                            <Badge variant="warning">Đang mời</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{formatDate(u.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <UserActions
                            user={u}
                            currentUserId={currentUser?.id}
                            onRoleChange={handleRoleChange}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteClick}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateUserModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa tài khoản</DialogTitle>
            <DialogDescription>
              {userToDelete ? (
                <>
                  Bạn có chắc muốn xóa tài khoản <strong>{userToDelete.full_name || ""}</strong> {userToDelete.email}
                  <br />
                  Hành động này không thể hoàn tác.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Xóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </DashboardLayout>
  );
}
