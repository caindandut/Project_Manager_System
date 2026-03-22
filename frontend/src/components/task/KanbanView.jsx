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
import { Loader2, Plus, Calendar, CheckCircle2, GripVertical } from "lucide-react";
import taskGroupApi from "@/api/taskGroupApi";
import taskApi from "@/api/taskApi";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from "@/constants/taskUi";
import TaskDetailPanel from "@/components/task/TaskDetailPanel";

const KANBAN_STATUSES = ["Todo", "InProgress", "Review", "Completed"];

/** Gộp Overdue vào cột Chưa làm (theo UI 4 cột). */
function statusToColumn(status) {
  const s = status || "Todo";
  if (s === "Overdue") return "Todo";
  if (KANBAN_STATUSES.includes(s)) return s;
  return "Todo";
}

function columnLabel(status) {
  return TASK_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
}

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

function flattenRootTasks(groups) {
  const out = [];
  for (const g of groups || []) {
    for (const t of g.tasks || []) {
      if (t.parent_task_id != null) continue;
      out.push({ ...t, _groupId: g.id });
    }
  }
  return out;
}

function bucketByColumn(tasks) {
  const cols = { Todo: [], InProgress: [], Review: [], Completed: [] };
  for (const t of tasks) {
    const col = statusToColumn(t.status);
    cols[col].push(t);
  }
  return cols;
}

function findTaskInColumns(columns, taskId) {
  for (const s of KANBAN_STATUSES) {
    const t = columns[s].find((x) => x.id === taskId);
    if (t) return t;
  }
  return null;
}

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

/** Chuỗi updateStatus sau khi tạo task (mặc định Todo) để đạt cột đích. */
const STATUS_STEPS_AFTER_CREATE = {
  Todo: [],
  InProgress: ["InProgress"],
  Review: ["InProgress", "Review"],
  Completed: ["InProgress", "Review", "Completed"],
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

function SortableKanbanCard({ task, canEdit, onCardClick, disabledDrag }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: disabledDrag || !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

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
    <div
      ref={setNodeRef}
      style={style}
      className="flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <span className={`w-1 shrink-0 self-stretch ${stripe}`} aria-hidden />
      {canEdit && (
        <button
          type="button"
          className="touch-none border-r border-slate-100 bg-slate-50/80 px-1 text-slate-400 hover:text-slate-600"
          aria-label="Kéo thẻ"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onCardClick(task)}
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
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  canEdit,
  addValue,
  setAddValue,
  onAdd,
  onCardClick,
  savingDrag,
  dragDisabled,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${status}`,
    data: { type: "column", status },
  });

  const ids = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/50">
      <div className="border-b border-slate-200 px-3 py-2.5">
        <h3 className="text-sm font-semibold text-slate-800">
          {columnLabel(status)}{" "}
          <span className="font-normal text-slate-500">({tasks.length})</span>
        </h3>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 p-2 ${isOver ? "bg-blue-50/50 ring-1 ring-inset ring-blue-200" : ""}`}
      >
        <SortableContext id={`sort-${status}`} items={ids} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">Không có task</p>
          )}
          {tasks.map((t) => (
            <SortableKanbanCard
              key={t.id}
              task={t}
              canEdit={canEdit}
              onCardClick={onCardClick}
              disabledDrag={savingDrag}
            />
          ))}
        </SortableContext>
        {canEdit && (
          <div className="mt-1 flex gap-1.5 border-t border-slate-100 pt-2">
            <Input
              placeholder="Thêm task…"
              className="h-8 text-xs"
              value={addValue[status] || ""}
              onChange={(e) => setAddValue((m) => ({ ...m, [status]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd(status);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 px-2"
              onClick={() => onAdd(status)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * GĐ2 mục 2.8 — Kanban 4 cột theo trạng thái, kéo thả → updateStatus.
 */
export default function KanbanView({
  projectId,
  /** Nhóm đã lọc — chỉ task gốc đưa vào cột */
  groups = [],
  groupsFull,
  groupsLoading = false,
  onReloadGroups,
  dragDisabled = false,
  showToast,
  canEditTasks = false,
  canManageProject = false,
  onTaskUpdated,
}) {
  const [columns, setColumns] = useState({
    Todo: [],
    InProgress: [],
    Review: [],
    Completed: [],
  });
  const [activeTask, setActiveTask] = useState(null);
  const [savingDrag, setSavingDrag] = useState(false);
  const [addValue, setAddValue] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const defaultGroupId = (groupsFull && groupsFull[0]?.id) || groups[0]?.id;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const applyGroupsToColumns = useCallback((data) => {
    const roots = flattenRootTasks(data);
    setColumns(bucketByColumn(roots));
  }, []);

  useEffect(() => {
    applyGroupsToColumns(groups || []);
  }, [groups, applyGroupsToColumns]);

  const reload = useCallback(async () => {
    if (onReloadGroups) {
      await onReloadGroups();
      return;
    }
    const res = await taskGroupApi.getByProject(projectId);
    const data = res.data.data || [];
    applyGroupsToColumns(data);
    return data;
  }, [onReloadGroups, projectId, applyGroupsToColumns]);

  const openDetail = (task) => {
    setSelectedTaskId(task.id);
  };

  const handleAdd = async (targetColumnStatus) => {
    const title = (addValue[targetColumnStatus] || "").trim();
    if (!title) return;
    if (!defaultGroupId) {
      showToast("Cần ít nhất một nhóm công việc (tạo ở chế độ Danh sách)", "error");
      return;
    }
    const steps = STATUS_STEPS_AFTER_CREATE[targetColumnStatus] || [];
    try {
      const res = await taskApi.create(defaultGroupId, { title, priority: "Medium" });
      const id = res.data.data.id;
      for (const s of steps) {
        await taskApi.updateStatus(id, s);
      }
      showToast("Đã thêm công việc");
      setAddValue((m) => ({ ...m, [targetColumnStatus]: "" }));
      await reload();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Không tạo được task hoặc không đủ quyền đổi trạng thái (vd. Hoàn thành)",
        "error",
      );
      await reload();
    }
  };

  const handleDragStart = ({ active }) => {
    const t = active.data.current?.task;
    if (t) setActiveTask(t);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over || savingDrag || !canEditTasks || dragDisabled) return;

    const activeTaskRef = active.data.current?.task;
    if (!activeTaskRef) return;

    const overStr = String(over.id);
    let targetColumn;
    if (overStr.startsWith("col-")) {
      targetColumn = overStr.slice(4);
    } else {
      const overTask = findTaskInColumns(columns, over.id);
      if (!overTask) return;
      targetColumn = statusToColumn(overTask.status);
    }

    if (!KANBAN_STATUSES.includes(targetColumn)) return;

    const sourceColumn = statusToColumn(activeTaskRef.status);

    if (targetColumn === sourceColumn) {
      const list = columns[sourceColumn];
      const oldIndex = list.findIndex((t) => t.id === active.id);
      if (oldIndex < 0) return;
      let newIndex;
      if (overStr.startsWith("col-")) {
        newIndex = Math.max(0, list.length - 1);
      } else {
        newIndex = list.findIndex((t) => t.id === over.id);
      }
      if (newIndex < 0 || oldIndex === newIndex) return;
      setColumns((prev) => ({
        ...prev,
        [sourceColumn]: arrayMove(prev[sourceColumn], oldIndex, newIndex),
      }));
      return;
    }

    setSavingDrag(true);
    try {
      await taskApi.updateStatus(active.id, targetColumn);
      showToast("Đã cập nhật trạng thái");
      await reload();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Không thể chuyển trạng thái (kiểm tra luồng: Todo → Đang làm → …)",
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
      {!defaultGroupId && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Chưa có nhóm công việc. Hãy chuyển sang <strong>Danh sách</strong> và tạo nhóm trước.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {KANBAN_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columns[status]}
              canEdit={canEditTasks}
              addValue={addValue}
              setAddValue={setAddValue}
              onAdd={handleAdd}
              onCardClick={openDetail}
              savingDrag={savingDrag}
              dragDisabled={dragDisabled}
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
