import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanBoard, KanbanCard, KanbanHeader } from "@/components/ui/kanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Calendar, CheckCircle2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import taskGroupApi from "@/api/taskGroupApi";
import taskApi from "@/api/taskApi";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from "@/constants/taskUi";
import TaskDetailPanel from "@/components/task/TaskDetailPanel";

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

function fmtDeadline(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

const taskDndId = (id) => `task-${id}`;
const colDndId = (id) => `col-${id}`;

function getTaskIdFromDndId(id) {
  const s = String(id);
  if (!s.startsWith("task-")) return null;
  const n = parseInt(s.slice(5), 10);
  return Number.isFinite(n) ? n : null;
}

function getColumnIdFromDndId(id) {
  const s = String(id);
  if (!s.startsWith("col-")) return null;
  const n = parseInt(s.slice(4), 10);
  return Number.isFinite(n) ? n : null;
}

function findGroupContainingTask(groups, taskId) {
  return (groups || []).find((g) => (g.tasks || []).some((t) => t.id === taskId));
}

function findTaskInGroups(groups, taskId) {
  for (const g of groups || []) {
    const found = (g.tasks || []).find((t) => t.id === taskId);
    if (found) return found;
  }
  return null;
}

function statusLabel(value) {
  return TASK_STATUS_OPTIONS.find((o) => o.value === value)?.label || value || "Chưa làm";
}

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

function MiniAvatars({ assignees, max = 2 }) {
  const list = (assignees || []).slice(0, max);
  if (list.length === 0) return null;
  return (
    <div className="flex -space-x-1.5">
      {list.map((ta, i) => (
        <div
          key={ta.user_id}
          title={ta.user?.full_name || ta.user?.email}
          className={`flex h-6 w-6 items-center justify-center rounded-full border border-white text-[9px] font-semibold text-white ${AVATAR_BG[(ta.user_id + i) % AVATAR_BG.length]}`}
        >
          {getInitials(ta.user?.full_name || ta.user?.email)}
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task, onCardClick }) {
  const pri = TASK_PRIORITY_OPTIONS.find((p) => p.value === task.priority);
  const stripe =
    pri?.value === "Urgent"
      ? "bg-red-500"
      : pri?.value === "High"
        ? "bg-amber-500"
        : pri?.value === "Medium"
          ? "bg-blue-500"
          : "bg-slate-400";

  const done = task.status === "Completed";

  return (
    <KanbanCard id={taskDndId(task.id)} name={task.title} className="gap-0 overflow-hidden rounded-lg border border-slate-200 p-0">
      <span className={`w-1 shrink-0 self-stretch ${stripe}`} aria-hidden />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCardClick(task);
        }}
        className="min-w-0 flex-1 px-2.5 py-2 text-left hover:bg-slate-50/80"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-medium text-slate-800">{task.title}</span>
          {done && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {task.label && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {task.label}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] font-normal">
            {statusLabel(task.status)}
          </Badge>
          {pri && (
            <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${pri.bgColor} ${pri.color}`}>
              {pri.label}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {task.deadline ? (
            <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
              <Calendar className="h-3 w-3" />
              {fmtDeadline(task.deadline)}
            </span>
          ) : (
            <span />
          )}
          <MiniAvatars assignees={task.assignees} />
        </div>
      </button>
    </KanbanCard>
  );
}

function KanbanColumn({
  group,
  tasks,
  canEdit,
  canManageGroups,
  addValue,
  setAddValue,
  onAdd,
  onEditGroup,
  onDeleteGroup,
  onCardClick,
}) {
  const ids = useMemo(() => tasks.map((t) => taskDndId(t.id)), [tasks]);

  return (
    <KanbanBoard id={colDndId(group.id)} className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/50">
      <KanbanHeader className="border-b border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">
            {group.group_name}{" "}
            <span className="font-normal text-slate-500">({tasks.length})</span>
          </h3>
          {canManageGroups && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onEditGroup(group)}>
                  <Pencil className="h-4 w-4" />
                  Đổi tên cột
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteGroup(group)}
                  className="text-red-600 focus:bg-red-50 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa cột
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </KanbanHeader>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
        <SortableContext id={`sort-${group.id}`} items={ids} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">Không có task</p>
          )}
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onCardClick={onCardClick}
            />
          ))}
        </SortableContext>
        {canEdit && (
          <div className="mt-1 flex gap-1.5 border-t border-slate-100 pt-2">
            <Input
              placeholder="Thêm task…"
              className="h-8 text-xs"
              value={addValue[group.id] || ""}
              onChange={(e) => setAddValue((m) => ({ ...m, [group.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd(group.id);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 px-2"
              onClick={() => onAdd(group.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </KanbanBoard>
  );
}

export default function KanbanView({
  projectId,
  groups = [],
  groupsFull,
  groupsLoading = false,
  onReloadGroups,
  dragDisabled = false,
  showToast,
  canEditTasks = false,
  canManageProject = false,
  onTaskUpdated,
  openTaskId = null,
  onDismissOpenTask,
}) {
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLoading, setNewGroupLoading] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupLoading, setEditGroupLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState(null);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [savingDrag, setSavingDrag] = useState(false);
  const [addValue, setAddValue] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    if (openTaskId != null && Number.isFinite(openTaskId)) {
      setSelectedTaskId(openTaskId);
    }
  }, [openTaskId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const dndGroups = useMemo(() => groupsFull ?? groups, [groupsFull, groups]);
  const visualGroups = useMemo(
    () =>
      (groups || []).map((g) => ({
        ...g,
        tasks: (g.tasks || []).filter((t) => !t.is_archived && t.parent_task_id == null),
      })),
    [groups],
  );

  const reload = useCallback(async () => {
    if (onReloadGroups) {
      await onReloadGroups();
      return;
    }
    await taskGroupApi.getByProject(projectId);
  }, [onReloadGroups, projectId]);

  const openDetail = (task) => {
    setSelectedTaskId(task.id);
  };

  const handleAdd = async (groupId) => {
    const title = (addValue[groupId] || "").trim();
    if (!title) return;
    try {
      await taskApi.create(groupId, { title, priority: "Medium" });
      showToast("Đã thêm công việc");
      setAddValue((m) => ({ ...m, [groupId]: "" }));
      await reload();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không tạo được task",
        "error",
      );
      await reload();
    }
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      showToast("Nhập tên cột", "error");
      return;
    }
    setNewGroupLoading(true);
    try {
      await taskGroupApi.create(projectId, { group_name: name });
      showToast("Đã tạo cột mới");
      setNewGroupOpen(false);
      setNewGroupName("");
      await reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Không tạo được cột", "error");
    } finally {
      setNewGroupLoading(false);
    }
  };

  const openEditGroup = (group) => {
    setEditingGroup(group);
    setEditGroupName(group.group_name || "");
    setEditGroupOpen(true);
  };

  const handleEditGroup = async () => {
    if (!editingGroup) return;
    const nextName = editGroupName.trim();
    if (!nextName) {
      showToast("Tên cột không được để trống", "error");
      return;
    }
    setEditGroupLoading(true);
    try {
      await taskGroupApi.update(editingGroup.id, { group_name: nextName });
      showToast("Đã cập nhật tên cột");
      setEditGroupOpen(false);
      setEditingGroup(null);
      await reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Không đổi tên được cột", "error");
    } finally {
      setEditGroupLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    setDeleteGroupLoading(true);
    try {
      await taskGroupApi.remove(deleteGroupTarget.id);
      showToast("Đã xóa cột");
      setDeleteGroupTarget(null);
      await reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Không xóa được cột", "error");
    } finally {
      setDeleteGroupLoading(false);
    }
  };

  const handleDragStart = ({ active }) => {
    const activeTaskId = getTaskIdFromDndId(active.id);
    if (activeTaskId == null) return;
    const task = findTaskInGroups(dndGroups, activeTaskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over || savingDrag || !canEditTasks || dragDisabled) return;

    const activeTaskId = getTaskIdFromDndId(active.id);
    if (activeTaskId == null) return;
    const sourceGroup = findGroupContainingTask(dndGroups, activeTaskId);
    if (!sourceGroup) return;

    const targetGroupIdFromCol = getColumnIdFromDndId(over.id);
    const overTaskId = getTaskIdFromDndId(over.id);
    let targetColumn;
    let positionApi;

    if (targetGroupIdFromCol != null) {
      targetColumn = targetGroupIdFromCol;
      const targetGroup = dndGroups.find((g) => g.id === targetColumn);
      if (!targetGroup) return;
      positionApi = (targetGroup.tasks || []).length;
    } else {
      if (overTaskId == null) return;
      const targetGroup = findGroupContainingTask(dndGroups, overTaskId);
      if (!targetGroup) return;
      targetColumn = targetGroup.id;
      positionApi = (targetGroup.tasks || []).findIndex((t) => t.id === overTaskId);
      if (positionApi < 0) return;
    }

    if (targetColumn === sourceGroup.id) {
      const list = sourceGroup.tasks || [];
      const oldIndex = list.findIndex((t) => t.id === activeTaskId);
      if (oldIndex < 0) return;
      const newIndex = targetGroupIdFromCol != null
        ? Math.max(0, list.length - 1)
        : list.findIndex((t) => t.id === overTaskId);
      if (newIndex < 0 || oldIndex === newIndex) return;
      const reordered = arrayMove(list, oldIndex, newIndex);
      const orderedIds = reordered.map((t) => t.id);
      setSavingDrag(true);
      try {
        await taskApi.reorder(sourceGroup.id, orderedIds);
        showToast("Đã cập nhật thứ tự");
        await reload();
      } catch (err) {
        showToast(err.response?.data?.message || "Không sắp xếp được", "error");
        await reload();
      } finally {
        setSavingDrag(false);
      }
      return;
    }

    setSavingDrag(true);
    try {
      await taskApi.move(activeTaskId, {
        target_group_id: targetColumn,
        position: positionApi,
      });
      showToast("Đã chuyển task sang cột khác");
      await reload();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không di chuyển được task",
        "error",
      );
      await reload();
    } finally {
      setSavingDrag(false);
    }
  };

  if (groupsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-sm">Đang tải bảng Kanban…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(visualGroups || []).length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Chưa có cột nào. Hãy tạo cột đầu tiên để bắt đầu.
        </p>
      )}
      {canEditTasks && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" className="gap-2" onClick={() => setNewGroupOpen(true)}>
            <Plus className="h-4 w-4" />
            Tạo cột mới
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {visualGroups.map((group) => (
            <KanbanColumn
              key={group.id}
              group={group}
              tasks={group.tasks || []}
              canEdit={canEditTasks}
              canManageGroups={canEditTasks}
              addValue={addValue}
              setAddValue={setAddValue}
              onAdd={handleAdd}
              onEditGroup={openEditGroup}
              onDeleteGroup={setDeleteGroupTarget}
              onCardClick={openDetail}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="w-[240px] rounded-lg border border-slate-200 bg-white p-2 text-sm font-medium shadow-lg">
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo cột Kanban</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="kanban-col-name">Tên cột</Label>
            <Input
              id="kanban-col-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ví dụ: UX Review"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewGroupOpen(false)}>
              Hủy
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={newGroupLoading}
              onClick={handleCreateGroup}
            >
              {newGroupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo cột
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editGroupOpen}
        onOpenChange={(v) => {
          setEditGroupOpen(v);
          if (!v) setEditingGroup(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi tên cột</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="kanban-edit-col-name">Tên cột mới</Label>
            <Input
              id="kanban-edit-col-name"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              placeholder="Ví dụ: QA Review"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroupOpen(false)}>
              Hủy
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={editGroupLoading}
              onClick={handleEditGroup}
            >
              {editGroupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteGroupTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteGroupTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa cột Kanban</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bạn có chắc muốn xóa cột <strong>{deleteGroupTarget?.group_name}</strong>? Hành động này có thể thất bại nếu cột còn chứa task.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupTarget(null)} disabled={deleteGroupLoading}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={deleteGroupLoading}>
              {deleteGroupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa cột
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => {
          setSelectedTaskId(null);
          onDismissOpenTask?.();
        }}
        showToast={showToast}
        canEditTasks={canEditTasks}
        canManageProject={canManageProject}
        onTaskUpdated={async () => {
          await reload();
          onTaskUpdated?.();
        }}
      />
    </div>
  );
}
