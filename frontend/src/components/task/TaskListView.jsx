import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  GripVertical,
  Loader2,
  Plus,
  Calendar,
} from "lucide-react";
import TaskDetailPanel from "@/components/task/TaskDetailPanel";
import taskGroupApi from "@/api/taskGroupApi";
import taskApi from "@/api/taskApi";
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from "@/constants/taskUi";

const AVATAR_BG = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
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

function findGroupContainingTask(groups, taskId) {
  return groups.find((g) => g.tasks?.some((t) => t.id === taskId));
}

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

function AssigneeStack({ assignees, max = 3 }) {
  const list = (assignees || []).slice(0, max);
  if (list.length === 0) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex -space-x-2">
      {list.map((ta, i) => (
        <div
          key={ta.user_id}
          title={ta.user?.full_name || ta.user?.email}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white ${AVATAR_BG[(ta.user_id + i) % AVATAR_BG.length]}`}
        >
          {getInitials(ta.user?.full_name || ta.user?.email)}
        </div>
      ))}
      {(assignees?.length || 0) > max && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-medium text-slate-600">
          +{(assignees?.length || 0) - max}
        </div>
      )}
    </div>
  );
}

function SortableTaskRow({
  task,
  groupId,
  canEditTasks,
  onTitleClick,
  onStatusChange,
  onCompleteClick,
  disabledDrag,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", groupId, task },
    disabled: disabledDrag || !canEditTasks,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const pri = TASK_PRIORITY_OPTIONS.find((p) => p.value === task.priority);
  const isCompleted = task.status === "Completed";
  const canMarkDone = canEditTasks && task.status === "Review";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2 py-2 hover:bg-slate-50/80"
    >
      {canEditTasks && (
        <button
          type="button"
          className="touch-none text-slate-400 hover:text-slate-600"
          aria-label="Kéo để sắp xếp"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <input
        type="checkbox"
        checked={isCompleted}
        disabled={!canEditTasks || isCompleted || (!canMarkDone && !isCompleted)}
        title={
          isCompleted
            ? "Đã hoàn thành"
            : canMarkDone
              ? "Đánh dấu hoàn thành"
              : "Chỉ đánh dấu khi task ở trạng thái Chờ xác nhận"
        }
        onChange={() => canMarkDone && onCompleteClick(task)}
        className="h-4 w-4 shrink-0 rounded border-slate-300"
      />
      <button
        type="button"
        onClick={() => onTitleClick(task)}
        className="min-w-0 flex-1 text-left text-sm font-medium text-slate-800 hover:text-blue-600"
      >
        {task.title}
      </button>
      {task.label && (
        <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
          {task.label}
        </Badge>
      )}
      {pri && (
        <span
          className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline ${pri.bgColor} ${pri.color}`}
        >
          {pri.label}
        </span>
      )}
      {task.deadline && (
        <span className="hidden shrink-0 items-center gap-0.5 text-xs text-slate-500 sm:flex">
          <Calendar className="h-3 w-3" />
          {fmtDeadline(task.deadline)}
        </span>
      )}
      <div className="hidden w-[72px] shrink-0 justify-end sm:flex">
        <AssigneeStack assignees={task.assignees} />
      </div>
      <div className="w-[130px] shrink-0" onPointerDown={(e) => e.stopPropagation()}>
        <Select
          value={task.status || "Todo"}
          disabled={!canEditTasks}
          onValueChange={(v) => onStatusChange(task, v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function GroupTaskList({
  group,
  open,
  onToggle,
  canEditTasks,
  savingDrag,
  dragDisabled,
  quickTitle,
  setQuickTitle,
  onQuickAdd,
  onTitleClick,
  onStatusChange,
  onCompleteClick,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${group.id}`,
    data: { type: "container", groupId: group.id },
  });

  const count = group.tasks?.length ?? 0;
  const taskIds = useMemo(() => (group.tasks || []).map((t) => t.id), [group.tasks]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-100/80"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          Nhóm: {group.group_name}
        </span>
        <span className="text-xs text-slate-500">
          {count} công việc
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-slate-200 bg-white px-3 py-3">
          <div
            ref={setNodeRef}
            className={`min-h-[56px] space-y-2 rounded-md p-1 transition-colors ${
              isOver ? "bg-blue-50/60 ring-1 ring-blue-200" : ""
            }`}
          >
            {count === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">
                Thả task vào đây hoặc dùng ô bên dưới để thêm mới
              </p>
            )}
            <SortableContext
              id={`sort-${group.id}`}
              items={taskIds}
              strategy={verticalListSortingStrategy}
            >
              {(group.tasks || []).map((task) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  groupId={group.id}
                  canEditTasks={canEditTasks}
                  disabledDrag={savingDrag || dragDisabled}
                  onTitleClick={onTitleClick}
                  onStatusChange={onStatusChange}
                  onCompleteClick={onCompleteClick}
                />
              ))}
            </SortableContext>
          </div>

          {canEditTasks && (
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Thêm task nhanh… (Enter)"
                value={quickTitle[group.id] || ""}
                onChange={(e) =>
                  setQuickTitle((q) => ({ ...q, [group.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onQuickAdd(group.id);
                  }
                }}
                className="h-9 text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0 gap-1"
                onClick={() => onQuickAdd(group.id)}
              >
                <Plus className="h-4 w-4" />
                Thêm
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * GĐ2 mục 2.7 — Danh sách nhóm công việc (accordion + DnD task + quick add).
 * Chi tiết task: TaskDetailPanel (mục 2.9).
 */
export default function TaskListView({
  projectId,
  /** Nhóm đã lọc — hiển thị */
  groups = [],
  /** Nhóm đầy đủ — dùng cho DnD / reorder API khi không lọc */
  groupsFull,
  groupsLoading = false,
  onReloadGroups,
  dragDisabled = false,
  /** Còn task trong dự án (trước lọc) — UX thông báo */
  totalTasksInProject = 0,
  showToast,
  canEditTasks = false,
  canManageProject = false,
  onTaskUpdated,
}) {
  const [openMap, setOpenMap] = useState({});
  const [activeTask, setActiveTask] = useState(null);
  const [savingDrag, setSavingDrag] = useState(false);

  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLoading, setNewGroupLoading] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [quickTitle, setQuickTitle] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  /** Dữ liệu đầy đủ cho thao tác kéo thả / API (khi không lọc trùng với `groups`). */
  const dndGroups = useMemo(
    () => groupsFull ?? groups,
    [groupsFull, groups],
  );

  const reload = useCallback(async () => {
    if (onReloadGroups) {
      await onReloadGroups();
      return;
    }
    try {
      const res = await taskGroupApi.getByProject(projectId);
      const data = res.data.data || [];
      setOpenMap((prev) => {
        const next = { ...prev };
        for (const g of data) {
          if (next[g.id] === undefined) next[g.id] = true;
        }
        return next;
      });
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không tải được nhóm công việc",
        "error",
      );
    }
  }, [onReloadGroups, projectId, showToast]);

  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev };
      for (const g of groups || []) {
        if (next[g.id] === undefined) next[g.id] = true;
      }
      return next;
    });
  }, [groups]);

  const toggleGroup = (id) => {
    setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      showToast("Nhập tên nhóm", "error");
      return;
    }
    setNewGroupLoading(true);
    try {
      await taskGroupApi.create(projectId, { group_name: name });
      showToast("Đã tạo nhóm công việc");
      setNewGroupOpen(false);
      setNewGroupName("");
      await reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Không tạo được nhóm", "error");
    } finally {
      setNewGroupLoading(false);
    }
  };

  const handleQuickAdd = async (groupId) => {
    const title = (quickTitle[groupId] || "").trim();
    if (!title) return;
    try {
      await taskApi.create(groupId, { title, priority: "Medium" });
      showToast("Đã thêm công việc");
      setQuickTitle((q) => ({ ...q, [groupId]: "" }));
      await reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Không tạo được task", "error");
    }
  };

  const handleStatusChange = async (task, status) => {
    try {
      await taskApi.updateStatus(task.id, status);
      showToast("Đã cập nhật trạng thái");
      await reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Không đổi được trạng thái", "error");
      await reload();
    }
  };

  const handleCompleteClick = async (task) => {
    try {
      await taskApi.updateStatus(task.id, "Completed");
      showToast("Đã hoàn thành công việc");
      await reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Không cập nhật được", "error");
      await reload();
    }
  };

  const openDetail = (task) => {
    setSelectedTaskId(task.id);
  };

  const handleDragStart = ({ active }) => {
    const t = active.data.current?.task;
    if (t) setActiveTask(t);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over || savingDrag || dragDisabled || !canEditTasks) return;

    const activeId = active.id;
    const sourceG = findGroupContainingTask(dndGroups, activeId);
    if (!sourceG) return;

    const overId = over.id;
    const overStr = String(overId);
    let targetGroupId;
    /** Vị trí chèn cho API move (0…length) */
    let positionApi;

    if (overStr.startsWith("drop-")) {
      targetGroupId = parseInt(overStr.slice(5), 10);
      const tg = dndGroups.find((g) => g.id === targetGroupId);
      if (!tg) return;
      positionApi = tg.tasks.length;
    } else {
      const tg = findGroupContainingTask(dndGroups, overId);
      if (!tg) return;
      targetGroupId = tg.id;
      positionApi = tg.tasks.findIndex((t) => t.id === overId);
      if (positionApi < 0) return;
    }

    if (sourceG.id === targetGroupId) {
      const oldIndex = sourceG.tasks.findIndex((t) => t.id === activeId);
      if (oldIndex < 0) return;

      let newIndex;
      if (overStr.startsWith("drop-")) {
        newIndex = Math.max(0, sourceG.tasks.length - 1);
      } else {
        newIndex = sourceG.tasks.findIndex((t) => t.id === overId);
      }
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(sourceG.tasks, oldIndex, newIndex);
      const ordered_ids = reordered.map((t) => t.id);
      setSavingDrag(true);
      try {
        await taskApi.reorder(sourceG.id, ordered_ids);
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
      await taskApi.move(activeId, {
        target_group_id: targetGroupId,
        position: positionApi,
      });
      showToast("Đã chuyển nhóm công việc");
      await reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Không di chuyển được", "error");
      await reload();
    } finally {
      setSavingDrag(false);
    }
  };

  if (groupsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-sm">Đang tải công việc...</p>
      </div>
    );
  }

  const listEmpty = (groups || []).every((g) => !(g.tasks || []).length);

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {groups.map((g) => (
          <GroupTaskList
            key={g.id}
            group={g}
            open={openMap[g.id] !== false}
            onToggle={() => toggleGroup(g.id)}
            canEditTasks={canEditTasks}
            savingDrag={savingDrag}
            dragDisabled={dragDisabled}
            quickTitle={quickTitle}
            setQuickTitle={setQuickTitle}
            onQuickAdd={handleQuickAdd}
            onTitleClick={openDetail}
            onStatusChange={handleStatusChange}
            onCompleteClick={handleCompleteClick}
          />
        ))}

        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-lg">
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {canEditTasks && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-dashed"
          onClick={() => setNewGroupOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Thêm nhóm công việc
        </Button>
      )}

      {listEmpty && totalTasksInProject === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          Chưa có công việc trong dự án. {canEditTasks ? "Thêm nhóm và task ở trên." : "Liên hệ quản lý dự án."}
        </p>
      )}
      {listEmpty && totalTasksInProject > 0 && (
        <p className="py-8 text-center text-sm text-amber-700">
          Không có công việc khớp bộ lọc. Thử xóa lọc hoặc đổi điều kiện.
        </p>
      )}

      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo nhóm công việc</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="tg-name">Tên nhóm</Label>
            <Input
              id="tg-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ví dụ: Backend API"
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
              Tạo nhóm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
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
