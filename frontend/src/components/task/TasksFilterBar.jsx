import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FilterX } from "lucide-react";
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from "@/constants/taskUi";
import { hasActiveTaskFilters } from "@/utils/taskFilters";

const EMPTY = "__all__";

/**
 * Thanh lọc tab Công việc (mục 2.10).
 * @param {{
 *   filters: import('@/utils/taskFilters').TaskFilters;
 *   onChange: (patch: Partial<import('@/utils/taskFilters').TaskFilters>) => void;
 *   members: Array<{ id: number; full_name?: string | null; email?: string }>;
 *   labelOptions: string[];
 * }} props
 */
export default function TasksFilterBar({ filters, onChange, members, labelOptions }) {
  const active = hasActiveTaskFilters(filters);

  const clear = () => {
    onChange({
      status: "",
      priority: "",
      label: "",
      assigneeId: "",
      search: "",
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-500">Trạng thái</span>
          <Select
            value={filters.status || EMPTY}
            onValueChange={(v) => onChange({ status: v === EMPTY ? "" : v })}
          >
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
            value={filters.priority || EMPTY}
            onValueChange={(v) => onChange({ priority: v === EMPTY ? "" : v })}
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
          <span className="text-[11px] font-medium text-slate-500">Nhãn</span>
          <Select
            value={filters.label || EMPTY}
            onValueChange={(v) => onChange({ label: v === EMPTY ? "" : v })}
          >
            <SelectTrigger className="h-9 bg-white text-xs">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY}>Tất cả</SelectItem>
              {labelOptions.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-500">Người thực hiện</span>
          <Select
            value={filters.assigneeId || EMPTY}
            onValueChange={(v) => onChange({ assigneeId: v === EMPTY ? "" : v })}
          >
            <SelectTrigger className="h-9 bg-white text-xs">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY}>Tất cả</SelectItem>
              {(members || []).map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.full_name || m.email || `User #${m.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-medium text-slate-500">Tìm theo tiêu đề</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-9 bg-white pl-8 text-xs"
              placeholder="Tìm kiếm…"
              value={filters.search || ""}
              onChange={(e) => onChange({ search: e.target.value })}
            />
          </div>
        </div>
      </div>
      {active && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1 border-slate-200"
          onClick={clear}
        >
          <FilterX className="h-3.5 w-3.5" />
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
