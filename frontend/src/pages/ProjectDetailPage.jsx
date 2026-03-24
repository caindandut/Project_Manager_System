import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  BarChart3,
  FileText,
  Settings,
  Plus,
  MoreVertical,
  Trash2,
  UserCog,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ClipboardList,
  Archive,
  Save,
  LayoutGrid,
  List,
  GanttChart,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import projectApi from "@/api/projectApi";
import taskGroupApi from "@/api/taskGroupApi";
import LabelChipSelector from "@/components/project/LabelChipSelector";
import { PriorityBadge, LabelBadges } from "@/components/project/ProjectBadges";
import {
  COLOR_PRESETS,
  DEFAULT_PROJECT_COLOR,
  PRIORITY_OPTIONS,
} from "@/constants/projectUi";
import { TASK_LABEL_PRESETS } from "@/constants/taskUi";
import TaskListView from "@/components/task/TaskListView";
import KanbanView from "@/components/task/KanbanView";
import TaskGanttView from "@/components/task/TaskGanttView";
import TaskCalendarView from "@/components/task/TaskCalendarView";
import TasksFilterBar from "@/components/task/TasksFilterBar";
import {
  filterTaskGroups,
  collectLabelOptions,
  hasActiveTaskFilters,
  countTasksInGroups,
} from "@/utils/taskFilters";
import DocumentExplorer from "@/components/document/DocumentExplorer";
import BurndownChart from "@/components/chart/BurndownChart";

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];
const STATUS_BADGE = {
  Active: { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Completed: { label: "Hoàn thành", className: "bg-blue-100 text-blue-700 border-blue-200" },
  Archived: { label: "Lưu trữ", className: "bg-slate-100 text-slate-500 border-slate-200" },
};
const MEMBER_ROLE_LABEL = { Manager: "Quản lý", Member: "Thành viên", Viewer: "Quan sát" };

function getInitials(n) { return (n||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function fmtDate(d) { if(!d) return "—"; return new Date(d).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}); }

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${type==="success"?"bg-emerald-600 text-white":"bg-red-600 text-white"}`}>
        {message}
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
      </div>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Tổng quan", icon: BarChart3 },
  { key: "tasks", label: "Công việc", icon: ClipboardList },
  { key: "members", label: "Thành viên", icon: Users },
  { key: "documents", label: "Tài liệu", icon: FileText },
  { key: "settings", label: "Cài đặt", icon: Settings },
];
const TAB_KEYS = new Set(TABS.map((t) => t.key));

// ─── Tab: Tổng quan ─────────────────────────────────────────
function OverviewTab({ project }) {
  const stats = project.stats || {};
  const pct = stats.completion_percent ?? 0;
  const statCards = [
    { label: "Tổng task", value: stats.total_tasks ?? 0, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Hoàn thành", value: stats.completed_tasks ?? 0, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Đang làm", value: stats.in_progress_tasks ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Quá hạn", value: stats.overdue_tasks ?? 0, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Tiến độ tổng thể</span>
            <span className="font-semibold" style={{ color: project.color_code || DEFAULT_PROJECT_COLOR }}>{pct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: project.color_code || DEFAULT_PROJECT_COLOR }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 font-semibold text-slate-900">Thông tin dự án</h3>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><dt className="text-slate-500">Trạng thái</dt><dd><Badge className={STATUS_BADGE[project.status]?.className}>{STATUS_BADGE[project.status]?.label}</Badge></dd></div>
            <div><dt className="text-slate-500">Độ ưu tiên</dt><dd><PriorityBadge priority={project.priority} /></dd></div>
            <div><dt className="text-slate-500">Manager</dt><dd className="font-medium text-slate-900">{project.manager?.full_name || "—"}</dd></div>
            <div><dt className="text-slate-500">Ngày bắt đầu</dt><dd className="text-slate-900">{fmtDate(project.start_date)}</dd></div>
            <div><dt className="text-slate-500">Ngày kết thúc</dt><dd className="text-slate-900">{fmtDate(project.end_date)}</dd></div>
            <div><dt className="text-slate-500">Ngày tạo</dt><dd className="text-slate-900">{fmtDate(project.created_at)}</dd></div>
            {project.label && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500 mb-1">Nhãn phân loại</dt>
                <dd className="flex flex-wrap gap-1.5"><LabelBadges label={project.label} /></dd>
              </div>
            )}
          </dl>
          {project.description && (
            <div className="mt-4 border-t pt-4">
              <dt className="mb-1 text-sm text-slate-500">Mô tả</dt>
              <dd className="text-sm text-slate-700 whitespace-pre-wrap">{project.description}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      <BurndownChart projectId={project.id} />
    </div>
  );
}

// ─── Tab: Công việc (GĐ2 mục 2.10 — fetch + lọc + List/Kanban) ─
function TasksTab({ project, user, showToast, canManage, onProjectRefresh, openTaskId, onDismissUrlTask }) {
  const [taskView, setTaskView] = useState("list");
  const [taskGroups, setTaskGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [taskFilters, setTaskFilters] = useState({
    status: "",
    priority: "",
    label: "",
    assigneeId: "",
    search: "",
  });

  const myRole = project?.members?.find((m) => m.id === user?.id)?.project_role;
  const canEditTasks =
    user?.role === "Admin" ||
    user?.role === "Director" ||
    (myRole && myRole !== "Viewer");

  const loadTaskGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await taskGroupApi.getByProject(project.id);
      setTaskGroups(res.data.data || []);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không tải được nhóm công việc",
        "error",
      );
      setTaskGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, [project.id, showToast]);

  useEffect(() => {
    loadTaskGroups();
  }, [loadTaskGroups]);

  const labelOptions = useMemo(
    () => collectLabelOptions(taskGroups, TASK_LABEL_PRESETS),
    [taskGroups],
  );

  const filteredGroups = useMemo(
    () => filterTaskGroups(taskGroups, taskFilters),
    [taskGroups, taskFilters],
  );

  const totalTasksInProject = useMemo(
    () => countTasksInGroups(taskGroups),
    [taskGroups],
  );

  const dragFiltered = hasActiveTaskFilters(taskFilters);

  const patchFilters = (patch) =>
    setTaskFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Chế độ xem:</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {[
              { key: "list", label: "Danh sách", icon: List },
              { key: "kanban", label: "Kanban", icon: LayoutGrid },
              { key: "gantt", label: "Gantt", icon: GanttChart },
              { key: "calendar", label: "Lịch", icon: CalendarDays },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTaskView(item.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${taskView === item.key ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {dragFiltered && (
          <p className="text-[11px] text-amber-700">
            Đang lọc: kéo thả sắp xếp tạm tắt để tránh lệch thứ tự với máy chủ.
          </p>
        )}
      </div>

      <TasksFilterBar
        filters={taskFilters}
        onChange={patchFilters}
        members={project.members || []}
        labelOptions={labelOptions}
      />

      {taskView === "list" && (
        <TaskListView
          projectId={project.id}
          groups={filteredGroups}
          groupsFull={taskGroups}
          groupsLoading={groupsLoading}
          onReloadGroups={loadTaskGroups}
          dragDisabled={dragFiltered}
          totalTasksInProject={totalTasksInProject}
          showToast={showToast}
          canEditTasks={canEditTasks}
          canManageProject={canManage}
          userId={user?.id}
          onTaskUpdated={onProjectRefresh}
          openTaskId={openTaskId}
          onDismissOpenTask={onDismissUrlTask}
        />
      )}
      {taskView === "kanban" && (
        <KanbanView
          projectId={project.id}
          groups={filteredGroups}
          groupsFull={taskGroups}
          groupsLoading={groupsLoading}
          onReloadGroups={loadTaskGroups}
          dragDisabled={dragFiltered}
          showToast={showToast}
          canEditTasks={canEditTasks}
          canManageProject={canManage}
          userId={user?.id}
          onTaskUpdated={onProjectRefresh}
          openTaskId={openTaskId}
          onDismissOpenTask={onDismissUrlTask}
        />
      )}
      {taskView === "gantt" && (
        <TaskGanttView
          groups={filteredGroups}
          groupsLoading={groupsLoading}
        />
      )}
      {taskView === "calendar" && (
        <TaskCalendarView
          groups={filteredGroups}
          groupsLoading={groupsLoading}
        />
      )}
    </div>
  );
}

// ─── Tab: Thành viên ────────────────────────────────────────
function MembersTab({ project, canManage, onRefresh, showToast }) {
  const [addOpen, setAddOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("Member");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [removing, setRemoving] = useState(false);

  const members = project.members || [];

  const openAddDialog = async () => {
    setAddOpen(true);
    setAddError("");
    setAddUserId("");
    setAddRole("Member");
    try {
      const res = await projectApi.getMemberCandidates(project.id);
      setCompanyUsers(res.data.data || []);
    } catch (err) {
      setCompanyUsers([]);
      setAddError(
        err.response?.data?.message ||
          "Không tải được danh sách nhân viên. Bạn cần quyền quản lý dự án hoặc thử lại sau."
      );
    }
  };

  const handleAddMember = async () => {
    if (!addUserId) { setAddError("Vui lòng chọn người dùng"); return; }
    setAddLoading(true);
    setAddError("");
    try {
      await projectApi.addMember(project.id, { user_id: Number(addUserId), role: addRole });
      setAddOpen(false);
      showToast("Thêm thành viên thành công");
      onRefresh();
    } catch (err) {
      setAddError(err.response?.data?.message || "Có lỗi xảy ra");
    } finally { setAddLoading(false); }
  };

  const handleRemove = async () => {
    if (!removeConfirm) return;
    setRemoving(true);
    try {
      await projectApi.removeMember(project.id, removeConfirm.id);
      showToast("Đã xóa thành viên khỏi dự án");
      setRemoveConfirm(null);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể xóa thành viên", "error");
    } finally { setRemoving(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await projectApi.updateMemberRole(project.id, userId, newRole);
      showToast(`Đã đổi vai trò thành ${MEMBER_ROLE_LABEL[newRole] || newRole}`);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể đổi vai trò", "error");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{members.length} thành viên</p>
        {canManage && (
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />Thêm thành viên
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Thành viên</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vai trò dự án</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tham gia</th>
              {canManage && <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const roleLabel = MEMBER_ROLE_LABEL[m.project_role] || m.project_role;
              const isManager = m.project_role === "Manager";
              return (
                <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`${AVATAR_COLORS[m.id % AVATAR_COLORS.length]} flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white`}>
                        {getInitials(m.full_name)}
                      </div>
                      <span className="font-medium text-slate-900">{m.full_name || "Chưa đặt tên"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{m.email}</td>
                  <td className="px-5 py-3">
                    <Badge variant={isManager ? "default" : "secondary"} className={isManager ? "bg-blue-100 text-blue-700 border-blue-200" : ""}>
                      {roleLabel}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{fmtDate(m.joined_at)}</td>
                  {canManage && (
                    <td className="px-5 py-3 text-right">
                      {!isManager && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {["Manager","Member","Viewer"].filter(r => r !== m.project_role).map(r => (
                              <DropdownMenuItem key={r} onClick={() => handleRoleChange(m.id, r)}>
                                <UserCog className="h-4 w-4" />{MEMBER_ROLE_LABEL[r]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setRemoveConfirm(m)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                              <Trash2 className="h-4 w-4" />Xóa khỏi dự án
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm thành viên</DialogTitle>
            <DialogDescription>Chọn nhân viên trong công ty để thêm vào dự án.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {addError && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"><AlertCircle className="h-4 w-4 shrink-0" />{addError}</div>}
            <div className="space-y-2">
              <Label>Người dùng</Label>
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger><SelectValue placeholder="Chọn người dùng..." /></SelectTrigger>
                <SelectContent>
                  {companyUsers.length === 0 && !addError ? (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      Không còn nhân viên nào trong công ty để thêm (đã tham gia dự án hoặc chưa Active).
                    </div>
                  ) : companyUsers.length === 0 ? null : companyUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member">Thành viên</SelectItem>
                  <SelectItem value="Viewer">Quan sát</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addLoading}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddMember} disabled={addLoading}>
              {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <Dialog open={!!removeConfirm} onOpenChange={(v) => { if (!v) setRemoveConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa thành viên</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa <strong>{removeConfirm?.full_name}</strong> khỏi dự án?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveConfirm(null)} disabled={removing}>Hủy</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing && <Loader2 className="h-4 w-4 animate-spin" />}Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Tài liệu (placeholder GĐ4) ──────────────────────
function DocumentsTab({ project, canManage, showToast }) {
  return <DocumentExplorer projectId={project?.id} showToast={showToast} canManage={canManage} />;
}

function projectToSettingsForm(p) {
  return {
    project_name: p.project_name || "",
    description: p.description || "",
    start_date: p.start_date ? new Date(p.start_date).toISOString().split("T")[0] : "",
    end_date: p.end_date ? new Date(p.end_date).toISOString().split("T")[0] : "",
    color_code: p.color_code || DEFAULT_PROJECT_COLOR,
    label: p.label || "",
    priority: p.priority || "Medium",
  };
}

// ─── Tab: Cài đặt ───────────────────────────────────────────
function SettingsTab({ project, onRefresh, showToast }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => projectToSettingsForm(project));
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [error, setError] = useState("");
  const [chipHint, setChipHint] = useState("");

  useEffect(() => {
    setForm(projectToSettingsForm(project));
    setError("");
    setChipHint("");
  }, [
    project.id,
    project.project_name,
    project.description,
    project.start_date,
    project.end_date,
    project.color_code,
    project.label,
    project.priority,
  ]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setChipHint("");
    if (!form.project_name.trim()) { setError("Tên dự án không được để trống"); return; }
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      setError("Ngày kết thúc phải sau ngày bắt đầu"); return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;
      if (!String(payload.label || "").trim()) payload.label = null;
      await projectApi.update(project.id, payload);
      showToast("Cập nhật dự án thành công");
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    } finally { setSaving(false); }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await projectApi.archive(project.id);
      showToast("Đã lưu trữ dự án");
      navigate("/projects");
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể lưu trữ dự án", "error");
    } finally { setArchiving(false); setArchiveOpen(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 font-semibold text-slate-900">Thông tin dự án</h3>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
            {chipHint && <p className="text-xs text-amber-600">{chipHint}</p>}
            <div className="space-y-2">
              <Label htmlFor="s-name">Tên dự án *</Label>
              <Input id="s-name" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-desc">Mô tả</Label>
              <textarea id="s-desc" rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="s-sd">Ngày bắt đầu</Label>
                <Input id="s-sd" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-ed">Ngày kết thúc</Label>
                <Input id="s-ed" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Màu nhận diện</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color_code: c })} className={`h-8 w-8 rounded-full border-2 transition-all ${form.color_code === c ? "border-slate-900 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Độ ưu tiên</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nhãn phân loại dự án</Label>
              <p className="text-xs text-slate-400">Chọn nhãn mô tả tính chất vĩ mô của dự án</p>
              <LabelChipSelector
                value={form.label}
                onChange={(v) => setForm({ ...form, label: v })}
                onLimitWarning={setChipHint}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Lưu thay đổi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {project.status !== "Archived" && (
        <Card className="border-red-200">
          <CardContent className="p-5">
            <h3 className="mb-2 font-semibold text-red-600">Vùng nguy hiểm</h3>
            <p className="mb-4 text-sm text-slate-500">Lưu trữ dự án sẽ ẩn khỏi danh sách chính. Bạn có thể khôi phục sau.</p>
            <Button variant="destructive" className="gap-2" onClick={() => setArchiveOpen(true)}>
              <Archive className="h-4 w-4" />Lưu trữ dự án
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lưu trữ dự án</DialogTitle>
            <DialogDescription>Bạn có chắc muốn lưu trữ dự án <strong>{project.project_name}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={archiving}>Hủy</Button>
            <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
              {archiving && <Loader2 className="h-4 w-4 animate-spin" />}Lưu trữ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Project Detail Page ────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState(null);

  const isManager = project?.members?.some((m) => m.id === user?.id && m.project_role === "Manager");
  const canManage = user?.role === "Admin" || user?.role === "Director" || isManager;

  const dismissTaskFromUrl = useCallback(() => {
    const p = new URLSearchParams(searchParams);
    p.delete("task");
    setSearchParams(p, { replace: true });
  }, [searchParams, setSearchParams]);

  const urlTaskRaw = searchParams.get("task");
  const urlOpenTaskId =
    urlTaskRaw != null && urlTaskRaw !== ""
      ? (() => {
          const n = parseInt(urlTaskRaw, 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        })()
      : null;

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await projectApi.getById(id);
      setProject(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải thông tin dự án");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const showToast = (msg, type = "success") => setToast({ message: msg, type });

  const visibleTabs = TABS.filter((t) => t.key !== "settings" || canManage);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Đang tải dự án...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="mt-3 text-sm text-red-500">{error}</p>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>Quay lại</Button>
              <Button variant="outline" size="sm" onClick={fetchProject}>Thử lại</Button>
            </div>
          </div>
        ) : project ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <button onClick={() => navigate("/projects")} className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                <ArrowLeft className="h-4 w-4" />Quay lại danh sách
              </button>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: project.color_code || DEFAULT_PROJECT_COLOR }} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-slate-900">{project.project_name}</h1>
                      <PriorityBadge priority={project.priority} />
                      <Badge className={STATUS_BADGE[project.status]?.className}>{STATUS_BADGE[project.status]?.label}</Badge>
                    </div>
                    {project.label && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <LabelBadges label={project.label} />
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                      {(project.start_date || project.end_date) && (
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(project.start_date)} → {fmtDate(project.end_date)}</span>
                      )}
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{project.members?.length || 0} thành viên</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-slate-200">
              <nav className="-mb-px flex gap-1 overflow-x-auto">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}>
                      <Icon className="h-4 w-4" />{tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && <OverviewTab project={project} />}
            {activeTab === "tasks" && (
              <TasksTab
                project={project}
                user={user}
                showToast={showToast}
                canManage={canManage}
                onProjectRefresh={fetchProject}
                openTaskId={urlOpenTaskId}
                onDismissUrlTask={dismissTaskFromUrl}
              />
            )}
            {activeTab === "members" && <MembersTab project={project} canManage={canManage} onRefresh={fetchProject} showToast={showToast} />}
            {activeTab === "documents" && <DocumentsTab project={project} canManage={canManage} showToast={showToast} />}
            {activeTab === "settings" && canManage && <SettingsTab project={project} onRefresh={fetchProject} showToast={showToast} />}
          </>
        ) : null}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
