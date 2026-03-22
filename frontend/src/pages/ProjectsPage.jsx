import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderKanban,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Archive,
  Loader2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import projectApi from "@/api/projectApi";
import CreateProjectDialog from "@/components/project/CreateProjectDialog";
import { PriorityBadge, LabelBadges } from "@/components/project/ProjectBadges";
import { DEFAULT_PROJECT_COLOR } from "@/constants/projectUi";

const STATUS_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "Active", label: "Đang hoạt động" },
  { key: "Completed", label: "Hoàn thành" },
  { key: "Archived", label: "Lưu trữ" },
];

const STATUS_BADGE = {
  Active: { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Completed: { label: "Hoàn thành", className: "bg-blue-100 text-blue-700 border-blue-200" },
  Archived: { label: "Lưu trữ", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];

function getInitials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
        {message}
        <button type="button" onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
      </div>
    </div>
  );
}

function ProjectCard({ project, canManage, onArchive, onClick }) {
  const sBadge = STATUS_BADGE[project.status] || STATUS_BADGE.Active;
  const members = project.members || [];
  const visibleMembers = members.slice(0, 4);
  const extraCount = (project.member_count || members.length) - visibleMembers.length;
  const pct = project.stats?.completion_percent ?? 0;
  const stripeColor = project.color_code || DEFAULT_PROJECT_COLOR;

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(project.id); } }}
      onClick={() => onClick(project.id)}
      className="group relative flex cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300"
    >
      <div className="w-1.5 shrink-0" style={{ backgroundColor: stripeColor }} />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="truncate text-base font-semibold text-slate-900">{project.project_name}</h3>
              <PriorityBadge priority={project.priority} className="text-[10px]" />
            </div>
            {project.label && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <LabelBadges label={project.label} badgeClassName="text-[10px] shrink-0" />
              </div>
            )}
            {project.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description}</p>
            )}
          </div>
          {canManage && project.status !== "Archived" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onClick(project.id)}>
                  <Pencil className="h-4 w-4" />Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onArchive(project)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Archive className="h-4 w-4" />Lưu trữ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {(project.start_date || project.end_date) && (
          <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {formatDate(project.start_date)}
              {project.start_date && project.end_date && " → "}
              {formatDate(project.end_date)}
            </span>
          </div>
        )}

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-500">{pct}% hoàn thành</span>
            {project.stats && (
              <span className="text-slate-400">{project.stats.completed_tasks}/{project.stats.total_tasks} task</span>
            )}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stripeColor }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {visibleMembers.map((m, i) => (
              <div
                key={m.id}
                className={`${AVATAR_COLORS[m.id % AVATAR_COLORS.length]} flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white ${i > 0 ? "-ml-2" : ""}`}
                title={m.full_name}
              >
                {getInitials(m.full_name)}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                +{extraCount}
              </div>
            )}
          </div>
          <Badge className={sBadge.className}>{sBadge.label}</Badge>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const canManage = user?.role === "Admin" || user?.role === "Director";

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await projectApi.getAll();
      setProjects(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách dự án");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleCreateSuccess = (msg) => {
    showToast(msg);
    fetchProjects();
  };

  const handleArchiveConfirm = async () => {
    if (!archiveConfirm) return;
    setArchiving(true);
    try {
      await projectApi.archive(archiveConfirm.id);
      showToast(`Đã lưu trữ dự án "${archiveConfirm.project_name}"`);
      setArchiveConfirm(null);
      fetchProjects();
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể lưu trữ dự án", "error");
    } finally {
      setArchiving(false);
    }
  };

  const filtered = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.project_name?.toLowerCase().includes(q) || p.label?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Dự án</h1>
              {!loading && (
                <Badge variant="secondary" className="text-sm">{projects.length}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">Quản lý và theo dõi tiến độ các dự án.</p>
          </div>
          {canManage && (
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />Tạo dự án mới
            </Button>
          )}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Tìm kiếm dự án..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Đang tải danh sách dự án...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="mt-3 text-sm text-red-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchProjects}>Thử lại</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FolderKanban className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              {searchQuery || statusFilter !== "all" ? "Không tìm thấy dự án phù hợp." : "Chưa có dự án nào."}
            </p>
            {canManage && !searchQuery && statusFilter === "all" && (
              <Button className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />Tạo dự án đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                canManage={canManage}
                onArchive={setArchiveConfirm}
                onClick={(pid) => navigate(`/projects/${pid}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={handleCreateSuccess} />

      <Dialog open={!!archiveConfirm} onOpenChange={(v) => { if (!v) setArchiveConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lưu trữ dự án</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn lưu trữ dự án <strong>{archiveConfirm?.project_name}</strong>?
              Dự án sẽ không bị xóa, bạn có thể khôi phục sau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveConfirm(null)} disabled={archiving}>Hủy</Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm} disabled={archiving}>
              {archiving && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu trữ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
