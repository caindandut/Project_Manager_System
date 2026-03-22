import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2, Search, FilterX, ChevronDown, Calendar } from "lucide-react";
import taskApi from "@/api/taskApi";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from "@/constants/taskUi";
import { DEFAULT_PROJECT_COLOR } from "@/constants/projectUi";

const EMPTY = "__all__";

function fmtDeadline(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Gom task phẳng từ các nhóm dự án (sau lọc project). */
function flattenTasks(groups) {
  const out = [];
  for (const g of groups || []) {
    for (const t of g.tasks || []) {
      out.push(t);
    }
  }
  return out;
}

/** Đếm theo 4 cột tổng quan (Overdue → Chưa làm). */
function countStatusBuckets(tasks) {
  const c = { todo: 0, inProgress: 0, review: 0, completed: 0 };
  for (const t of tasks) {
    const s = t.status || "Todo";
    if (s === "Completed") c.completed += 1;
    else if (s === "Review") c.review += 1;
    else if (s === "InProgress") c.inProgress += 1;
    else c.todo += 1; // Todo + Overdue
  }
  return c;
}

/**
 * GĐ2 mục 2.11 — Công việc được giao, nhóm theo dự án.
 * API: GET /users/me/tasks
 */
export default function MyTasksPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");

  const [openProjects, setOpenProjects] = useState({});

  const apiParams = useMemo(() => {
    const p = {};
    if (status) p.status = status;
    if (priority) p.priority = priority;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [status, priority, search]);

  const loadProjectOptions = useCallback(async () => {
    try {
      const res = await taskApi.getMyTasks({});
      const list = res.data.data || [];
      setProjectOptions(
        list.map((g) => ({
          id: g.project_id,
          name: g.project_name,
          color: g.color_code,
        })),
      );
    } catch {
      setProjectOptions([]);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await taskApi.getMyTasks(apiParams);
      setGroups(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được công việc");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [apiParams]);

  useEffect(() => {
    loadProjectOptions();
  }, [loadProjectOptions]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const displayedGroups = useMemo(() => {
    if (!projectId) return groups;
    const pid = Number(projectId);
    return groups.filter((g) => g.project_id === pid);
  }, [groups, projectId]);

  const allTasksFlat = useMemo(() => flattenTasks(displayedGroups), [displayedGroups]);
  const buckets = useMemo(() => countStatusBuckets(allTasksFlat), [allTasksFlat]);

  const totalTasks = allTasksFlat.length;

  const hasFilters = !!(status || priority || projectId || search.trim());

  const clearFilters = () => {
    setStatus("");
    setPriority("");
    setProjectId("");
    setSearch("");
  };

  const toggleProjectOpen = (pid) => {
    setOpenProjects((m) => {
      const wasOpen = m[pid] !== false;
      return { ...m, [pid]: !wasOpen };
    });
  };

  useEffect(() => {
    setOpenProjects((prev) => {
      const next = { ...prev };
      for (const g of displayedGroups) {
        if (next[g.project_id] === undefined) next[g.project_id] = true;
      }
      return next;
    });
  }, [displayedGroups]);

  const goToTask = (project_id, task_id) => {
    navigate(`/projects/${project_id}?tab=tasks&task=${task_id}`);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Công việc của tôi</h1>
              <p className="text-sm text-slate-500">
                {loading ? "Đang tải…" : `${totalTasks} công việc được giao`}
              </p>
            </div>
          </div>
        </div>

        {/* Thanh lọc */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Trạng thái</span>
              <Select value={status || EMPTY} onValueChange={(v) => setStatus(v === EMPTY ? "" : v)}>
                <SelectTrigger className="h-9 bg-white text-xs">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY}>Tất cả</SelectItem>
                  {TASK_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Ưu tiên</span>
              <Select
                value={priority || EMPTY}
                onValueChange={(v) => setPriority(v === EMPTY ? "" : v)}
              >
                <SelectTrigger className="h-9 bg-white text-xs">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY}>Tất cả</SelectItem>
                  {TASK_PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Dự án</span>
              <Select
                value={projectId || EMPTY}
                onValueChange={(v) => setProjectId(v === EMPTY ? "" : v)}
              >
                <SelectTrigger className="h-9 bg-white text-xs">
                  <SelectValue placeholder="Tất cả dự án" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY}>Tất cả dự án</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Tìm kiếm</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-9 bg-white pl-8 text-xs"
                  placeholder="Theo tiêu đề…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1"
              onClick={clearFilters}
            >
              <FilterX className="h-3.5 w-3.5" />
              Xóa lọc
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="mt-3 text-sm">Đang tải công việc…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <Button variant="outline" size="sm" className="ml-3 h-8" onClick={loadTasks}>
              Thử lại
            </Button>
          </div>
        )}

        {!loading && !error && displayedGroups.length === 0 && (
          <p className="py-16 text-center text-sm text-slate-500">
            {hasFilters
              ? "Không có công việc khớp bộ lọc."
              : "Bạn chưa được giao công việc nào trong dự án."}
          </p>
        )}

        {!loading && !error && displayedGroups.length > 0 && (
          <div className="space-y-3">
            {displayedGroups.map((g) => {
              const open = openProjects[g.project_id] !== false;
              const count = g.tasks?.length ?? 0;
              const barColor = g.color_code || DEFAULT_PROJECT_COLOR;
              return (
                <div
                  key={g.project_id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleProjectOpen(g.project_id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "" : "-rotate-90"}`}
                      />
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: barColor }}
                      />
                      <span className="truncate font-semibold text-slate-800">{g.project_name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {count} công việc
                    </span>
                  </button>

                  {open && (
                    <ul className="divide-y divide-slate-100 border-t border-slate-100">
                      {(g.tasks || []).map((t) => {
                        const pri = TASK_PRIORITY_OPTIONS.find((p) => p.value === t.priority);
                        const done = t.status === "Completed";
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => goToTask(g.project_id, t.id)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/80"
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                  done
                                    ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                                    : "border-slate-300 bg-white"
                                }`}
                                aria-hidden
                              >
                                {done ? "✓" : ""}
                              </span>
                              <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                                {t.title}
                              </span>
                              {t.label && (
                                <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
                                  {t.label}
                                </Badge>
                              )}
                              {pri && (
                                <span
                                  className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline ${pri.bgColor} ${pri.color}`}
                                >
                                  {pri.label}
                                </span>
                              )}
                              {t.deadline && (
                                <span className="flex shrink-0 items-center gap-0.5 text-xs text-slate-500">
                                  <Calendar className="h-3 w-3" />
                                  {fmtDeadline(t.deadline)}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && totalTasks > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:text-sm">
            <span>
              <strong className="text-slate-800">{buckets.todo}</strong> chưa làm
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <strong className="text-slate-800">{buckets.inProgress}</strong> đang làm
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <strong className="text-slate-800">{buckets.review}</strong> chờ xác nhận
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <strong className="text-slate-800">{buckets.completed}</strong> hoàn thành
            </span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
