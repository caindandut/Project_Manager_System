import { useMemo } from "react";
import { addDays } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  CalendarProvider,
  CalendarDate,
  CalendarDatePicker,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  CalendarHeader,
  CalendarBody,
  CalendarItem,
} from "@/components/ui/calendar";

const STATUS_COLOR_MAP = {
  Todo: "#6B7280",
  InProgress: "#F59E0B",
  Review: "#8B5CF6",
  Completed: "#10B981",
  Overdue: "#EF4444",
};

function mapTaskToFeature(task) {
  const startAt = task.created_at ? new Date(task.created_at) : new Date();
  const endAt = task.deadline ? new Date(task.deadline) : addDays(startAt, 7);

  return {
    id: String(task.id),
    name: task.title,
    startAt,
    endAt: endAt > startAt ? endAt : addDays(startAt, 1),
    status: {
      id: task.status || "Todo",
      name: task.status || "Todo",
      color: STATUS_COLOR_MAP[task.status] || STATUS_COLOR_MAP.Todo,
    },
  };
}

export default function TaskCalendarView({ groups, groupsLoading }) {
  const features = useMemo(() => {
    if (!groups || groups.length === 0) return [];
    return groups.flatMap((g) =>
      (g.tasks || []).filter((t) => !t.is_archived).map(mapTaskToFeature),
    );
  }, [groups]);

  const currentYear = new Date().getFullYear();

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải dữ liệu lịch...
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        Chưa có task nào để hiển thị trên lịch.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <CalendarProvider locale="vi-VN" startDay={1} className="h-full w-full">
        <CalendarDate>
          <CalendarDatePicker>
            <CalendarMonthPicker />
            <CalendarYearPicker start={currentYear - 2} end={currentYear + 2} />
          </CalendarDatePicker>
          <CalendarDatePagination />
        </CalendarDate>
        <CalendarHeader />
        <CalendarBody features={features}>
          {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
        </CalendarBody>
      </CalendarProvider>
    </div>
  );
}
