import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Link2,
  ListTodo,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  UserMinus,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import taskApi from "@/api/taskApi";
import taskGroupApi from "@/api/taskGroupApi";
import projectApi from "@/api/projectApi";
import TaskComments from "@/components/task/TaskComments";
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_LABEL_PRESETS,
  ASSIGNEE_ROLE_OPTIONS,
  getNextStatuses,
} from "@/constants/taskUi";

const AVATAR_BG = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
];

function getInitials(name) {
  return (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** datetime-local value từ ISO backend */
function toDateTimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function roleLabel(role) {
  return ASSIGNEE_ROLE_OPTIONS.find((o) => o.value === role)?.label || role;
}

/**
 * GĐ2 mục 2.9 — Panel chi tiết task (slide-over), đồng bộ API taskApi / projectApi.
 */
export default function TaskDetailPanel({
  taskId,
  onClose,
  showToast,
  canEditTasks = false,
  canManageProject = false,
  onTaskUpdated,
}) {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);

  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [deadlineDraft, setDeadlineDraft] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("Support");
  const [assignLoading, setAssignLoading] = useState(false);

  const [depOpen, setDepOpen] = useState(false);
  const [depCandidates, setDepCandidates] = useState([]);
  const [depPickId, setDepPickId] = useState("");
  const [depLoading, setDepLoading] = useState(false);

  const [subNewTitle, setSubNewTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const reload = useCallback(async () => {
    if (taskId == null) return null;
    const res = await taskApi.getById(taskId);
    const data = res.data.data;
    setTask(data);
    setTitleDraft(data.title || "");
    setDescDraft(data.description || "");
    setDeadlineDraft(toDateTimeLocal(data.deadline));
    return data;
  }, [taskId]);

  useEffect(() => {
    if (taskId == null) {
      setTask(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await taskApi.getById(taskId);
        if (cancelled) return;
        const data = res.data.data;
        setTask(data);
        setTitleDraft(data.title || "");
        setDescDraft(data.description || "");
        setDeadlineDraft(toDateTimeLocal(data.deadline));
      } catch (err) {
        if (!cancelled) {
          showToast(err.response?.data?.message || "Không tải được chi tiết task", "error");
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, showToast, onClose]);

  const notifyParent = () => {
    onTaskUpdated?.();
  };

  const canAssign = useMemo(() => {
    if (!task || !user) return false;
    return (
      canManageProject ||
      task.creator_id === user.id
    );
  }, [task, user, canManageProject]);

  const canProgress = useMemo(() => {
    if (!task || !user) return false;
    if (task.creator_id === user.id) return true;
    return task.assignees?.some((a) => a.user_id === user.id);
  }, [task, user]);

  const canApproveReview = useMemo(
    () => canManageProject || (task && user && task.creator_id === user.id),
    [canManageProject, task, user],
  );

  const statusOptions = useMemo(() => {
    if (!task) return TASK_STATUS_OPTIONS;
    const next = getNextStatuses(task.status, canApproveReview);
    return TASK_STATUS_OPTIONS.filter(
      (o) => o.value === task.status || next.includes(o.value),
    );
  }, [task, canApproveReview]);

  const statusLocked = useMemo(() => {
    if (!canEditTasks || !task) return true;
    return getNextStatuses(task.status, canApproveReview).length === 0;
  }, [canEditTasks, task, canApproveReview]);

  const openAssignDialog = async () => {
    if (!task?.project_id) return;
    setAssignOpen(true);
    setAssignUserId("");
    setAssignRole("Support");
    try {
      const res = await projectApi.getMembers(task.project_id);
      setProjectMembers(res.data.data || []);
    } catch {
      setProjectMembers([]);
    }
  };

  const assigneeIds = useMemo(
    () => new Set((task?.assignees || []).map((a) => a.user_id)),
    [task?.assignees],
  );

  const membersToPick = useMemo(
    () => (projectMembers || []).filter((m) => !assigneeIds.has(m.id)),
    [projectMembers, assigneeIds],
  );

  const handleAssign = async () => {
    if (!assignUserId || !task) return;
    setAssignLoading(true);
    try {
      await taskApi.assign(task.id, {
        user_id: Number(assignUserId),
        role: assignRole,
      });
      showToast("Đã giao việc");
      setAssignOpen(false);
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không giao được", "error");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassign = async (userId) => {
    if (!task) return;
    try {
      await taskApi.unassign(task.id, userId);
      showToast("Đã bỏ giao");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không bỏ giao được", "error");
    }
  };

  const saveTitle = async () => {
    if (!task || !canEditTasks) return;
    const t = titleDraft.trim();
    if (!t || t === task.title) return;
    try {
      await taskApi.update(task.id, { title: t });
      showToast("Đã lưu tiêu đề");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không lưu được", "error");
      setTitleDraft(task.title);
    }
  };

  const saveDescription = async () => {
    if (!task || !canEditTasks) return;
    const d = descDraft.trim();
    if (d === (task.description || "")) return;
    try {
      await taskApi.update(task.id, { description: d || null });
      showToast("Đã lưu mô tả");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không lưu được", "error");
      setDescDraft(task.description || "");
    }
  };

  const handleStatus = async (status) => {
    if (!task || !canEditTasks) return;
    try {
      await taskApi.updateStatus(task.id, status);
      showToast("Đã cập nhật trạng thái");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không đổi được trạng thái", "error");
      await reload();
    }
  };

  const handlePriority = async (priority) => {
    if (!task || !canEditTasks) return;
    try {
      await taskApi.update(task.id, { priority });
      showToast("Đã cập nhật ưu tiên");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không lưu được", "error");
    }
  };

  const handleLabel = async (label) => {
    if (!task || !canEditTasks) return;
    const v = label === "__none__" ? null : label;
    try {
      await taskApi.update(task.id, { label: v });
      showToast("Đã cập nhật nhãn");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không lưu được", "error");
    }
  };

  const saveDeadline = async () => {
    if (!task || !canEditTasks) return;
    const iso = fromDateTimeLocal(deadlineDraft);
    const prev = task.deadline ? new Date(task.deadline).toISOString() : null;
    const next = iso;
    if (prev === next || (!prev && !next)) return;
    try {
      await taskApi.update(task.id, { deadline: next });
      showToast("Đã cập nhật deadline");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không lưu được", "error");
      setDeadlineDraft(toDateTimeLocal(task.deadline));
    }
  };

  const handleProgressCommit = async (pct) => {
    if (!task || !canProgress || !canEditTasks) return;
    const n = Math.min(100, Math.max(0, Number(pct)));
    try {
      await taskApi.updateProgress(task.id, n);
      showToast("Đã cập nhật tiến độ");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không cập nhật được", "error");
      await reload();
    }
  };

  const openDepDialog = async () => {
    if (!task?.project_id) return;
    setDepOpen(true);
    setDepPickId("");
    setDepLoading(true);
    try {
      const res = await taskGroupApi.getByProject(task.project_id);
      const groups = res.data.data || [];
      const predIds = new Set((task.predecessors || []).map((p) => p.id));
      const list = [];
      for (const g of groups) {
        for (const t of g.tasks || []) {
          if (t.parent_task_id) continue;
          if (t.id === task.id) continue;
          if (predIds.has(t.id)) continue;
          list.push({
            id: t.id,
            title: t.title,
            group: g.group_name,
          });
        }
      }
      setDepCandidates(list);
    } catch {
      setDepCandidates([]);
    } finally {
      setDepLoading(false);
    }
  };

  const handleAddDep = async () => {
    if (!depPickId || !task) return;
    try {
      await taskApi.addDep(task.id, Number(depPickId));
      showToast("Đã thêm phụ thuộc");
      setDepOpen(false);
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không thêm được", "error");
    }
  };

  const handleRemoveDep = async (preId) => {
    if (!task) return;
    try {
      await taskApi.removeDep(task.id, preId);
      showToast("Đã gỡ phụ thuộc");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không gỡ được", "error");
    }
  };

  const handleAddSubtask = async () => {
    const title = subNewTitle.trim();
    if (!title || !task) return;
    try {
      await taskApi.createSubtask(task.id, { title, priority: "Medium" });
      showToast("Đã thêm subtask");
      setSubNewTitle("");
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không tạo được", "error");
    }
  };

  const handleSubtaskStatus = async (subId, status) => {
    try {
      await taskApi.updateStatus(subId, status);
      await reload();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không đổi được trạng thái", "error");
      await reload();
    }
  };

  const handleArchive = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await taskApi.archive(task.id);
      showToast("Đã lưu trữ task");
      onClose();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không lưu trữ được", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await taskApi.remove(task.id);
      showToast("Đã xóa công việc");
      setDeleteOpen(false);
      onClose();
      notifyParent();
    } catch (err) {
      showToast(err.response?.data?.message || "Không xóa được", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (taskId == null) return null;

  const isRootTask = task && !task.parent_task_id;
  const doneSubs = (task?.subtasks || []).filter((s) => s.status === "Completed").length;
  const totalSubs = (task?.subtasks || []).length;
  const customLabel =
    task?.label && !TASK_LABEL_PRESETS.includes(task.label) ? task.label : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
          <Button variant="ghost" size="sm" className="gap-1 text-slate-600" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
          {loading || !task ? (
            <div className="flex flex-col items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 text-sm text-slate-500">Đang tải…</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <Input
                  value={titleDraft}
                  disabled={!canEditTasks}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  className="border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  placeholder="Tiêu đề công việc"
                />
                <p className="text-xs text-slate-400">ID #{task.id}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Select
                  value={task.status || "Todo"}
                  disabled={statusLocked}
                  onValueChange={handleStatus}
                >
                  <SelectTrigger className="h-9 w-[140px] text-xs">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {task.status === "Review" && !canApproveReview && (
                  <p className="w-full text-[11px] text-amber-600">
                    Đang chờ Manager / người tạo task duyệt hoặc từ chối.
                  </p>
                )}
                <Select
                  value={task.priority || "Medium"}
                  disabled={!canEditTasks}
                  onValueChange={handlePriority}
                >
                  <SelectTrigger className="h-9 w-[130px] text-xs">
                    <SelectValue placeholder="Ưu tiên" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={task.label || "__none__"}
                  disabled={!canEditTasks}
                  onValueChange={handleLabel}
                >
                  <SelectTrigger className="h-9 min-w-[140px] text-xs">
                    <SelectValue placeholder="Nhãn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Không nhãn</SelectItem>
                    {customLabel && (
                      <SelectItem value={customLabel}>{customLabel} (tùy chỉnh)</SelectItem>
                    )}
                    {TASK_LABEL_PRESETS.filter((l) => l !== customLabel).map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-1 text-slate-700">
                  <FileText className="h-3.5 w-3.5" />
                  Mô tả
                </Label>
                <textarea
                  rows={5}
                  disabled={!canEditTasks}
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={saveDescription}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Mô tả chi tiết…"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-slate-700">Người thực hiện</Label>
                  {canAssign && (
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={openAssignDialog}>
                      <Plus className="h-3.5 w-3.5" />
                      Thêm
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(task.assignees || []).length === 0 && (
                    <span className="text-sm text-slate-400">Chưa có người được giao</span>
                  )}
                  {(task.assignees || []).map((ta) => (
                    <div
                      key={ta.user_id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${AVATAR_BG[ta.user_id % AVATAR_BG.length]}`}
                      >
                        {getInitials(ta.user?.full_name || ta.user?.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {ta.user?.full_name || ta.user?.email}
                        </p>
                        <p className="text-xs text-slate-500">{roleLabel(ta.role)}</p>
                      </div>
                      {canAssign && (task.assignees?.length || 0) > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-600"
                          title="Bỏ giao"
                          onClick={() => handleUnassign(ta.user_id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1 text-slate-700">
                  <Calendar className="h-3.5 w-3.5" />
                  Deadline
                </Label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Input
                    type="datetime-local"
                    disabled={!canEditTasks}
                    value={deadlineDraft}
                    onChange={(e) => setDeadlineDraft(e.target.value)}
                    onBlur={saveDeadline}
                    className="max-w-xs text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700">
                  Tiến độ: {task.completion_percent ?? 0}%
                </Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!canEditTasks || !canProgress}
                  value={task.completion_percent ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTask((prev) => (prev ? { ...prev, completion_percent: v } : prev));
                  }}
                  onMouseUp={(e) => handleProgressCommit(e.currentTarget.value)}
                  onTouchEnd={(e) => handleProgressCommit(e.currentTarget.value)}
                  className="mt-2 w-full accent-blue-600"
                />
                {!canProgress && canEditTasks && (
                  <p className="mt-1 text-xs text-amber-600">
                    Chỉ người tạo hoặc người được giao mới chỉnh tiến độ.
                  </p>
                )}
              </div>

              {isRootTask && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="flex items-center gap-1 text-slate-700">
                      <ListTodo className="h-3.5 w-3.5" />
                      Subtasks ({doneSubs}/{totalSubs})
                    </Label>
                  </div>
                  <div className="space-y-2">
                    {(task.subtasks || []).map((s) => {
                      const subNext = getNextStatuses(s.status, canApproveReview);
                      const subOpts = TASK_STATUS_OPTIONS.filter(
                        (o) => o.value === s.status || subNext.includes(o.value),
                      );
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-2 py-1.5"
                        >
                          <Select
                            value={s.status || "Todo"}
                            disabled={!canEditTasks || subNext.length === 0}
                            onValueChange={(v) => handleSubtaskStatus(s.id, v)}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {subOpts.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="flex-1 text-sm text-slate-800">{s.title}</span>
                        </div>
                      );
                    })}
                    {canEditTasks && (
                      <div className="flex gap-2 pt-1">
                        <Input
                          placeholder="Thêm subtask…"
                          className="h-9 text-sm"
                          value={subNewTitle}
                          onChange={(e) => setSubNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSubtask();
                            }
                          }}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleAddSubtask}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-slate-700">
                    <Link2 className="h-3.5 w-3.5" />
                    Phụ thuộc (phải xong trước)
                  </Label>
                  {canEditTasks && (
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={openDepDialog}>
                      <Plus className="h-3.5 w-3.5" />
                      Thêm
                    </Button>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {(task.predecessors || []).length === 0 && (
                    <li className="text-sm text-slate-400">Không có phụ thuộc</li>
                  )}
                  {(task.predecessors || []).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-2 py-1.5 text-sm"
                    >
                      <span className="text-slate-700">
                        → {p.title}
                      </span>
                      {canEditTasks && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600"
                          onClick={() => handleRemoveDep(p.id)}
                        >
                          Gỡ
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <TaskComments taskId={task.id} showToast={showToast} canComment={!!user} />

              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Paperclip className="h-4 w-4" />
                  Tài liệu đính kèm
                </div>
                {(task.documents || []).length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {task.documents.map((d) => (
                      <li key={d.id} className="truncate">
                        {d.file_name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    Upload & quản lý file theo task sẽ bổ sung ở Giai đoạn 4.
                  </p>
                )}
              </div>

              {canManageProject && task.status === "Completed" && !task.is_archived && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={actionLoading}
                  onClick={handleArchive}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Lưu trữ task
                </Button>
              )}

              {canManageProject && canEditTasks && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={actionLoading}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa công việc
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giao việc</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Thành viên dự án</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn người" />
                </SelectTrigger>
                <SelectContent>
                  {membersToPick.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.full_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vai trò</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNEE_ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!assignUserId || assignLoading} onClick={handleAssign}>
              {assignLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Giao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={depOpen} onOpenChange={setDepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm task tiền nhiệm</DialogTitle>
          </DialogHeader>
          {depLoading ? (
            <Loader2 className="mx-auto my-6 h-8 w-8 animate-spin text-blue-600" />
          ) : (
            <div className="py-2">
              <Label>Task phải hoàn thành trước</Label>
              <Select value={depPickId} onValueChange={setDepPickId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn task" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {depCandidates.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.title} · {c.group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!depPickId} onClick={handleAddDep}>
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa công việc?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Hành động này không hoàn tác. Subtask và dữ liệu liên quan có thể bị xóa theo hệ thống.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" disabled={actionLoading} onClick={handleDelete}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
