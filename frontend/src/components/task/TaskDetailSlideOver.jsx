import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

/**
 * Panel phụ tối giản khi click task — dùng chung TaskListView / KanbanView.
 * Mục 2.9 sẽ thay bằng TaskDetailPanel đầy đủ.
 */
export default function TaskDetailSlideOver({ task, loading, onClose }) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Chi tiết công việc</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {loading ? (
            <Loader2 className="mx-auto mt-8 h-8 w-8 animate-spin text-blue-600" />
          ) : (
            <>
              <p className="text-lg font-medium text-slate-900">{task.title}</p>
              <p className="mt-2 text-xs text-slate-500">ID #{task.id}</p>
              {task.description && (
                <p className="mt-4 whitespace-pre-wrap text-slate-600">{task.description}</p>
              )}
              <p className="mt-4 text-xs text-slate-400">
                Giao diện đầy đủ (subtask, phụ thuộc, tài liệu…) sẽ bổ sung ở mục 2.9.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
