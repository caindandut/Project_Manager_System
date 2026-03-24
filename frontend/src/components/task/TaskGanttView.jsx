import { useMemo } from "react";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureItem,
  GanttToday,
} from "@/components/ui/gantt";
import { TASK_STATUS_OPTIONS } from "@/constants/taskUi";

const STATUS_COLOR_MAP = {
  Todo: "#6B7280",
  InProgress: "#F59E0B",
  Review: "#8B5CF6",
  Completed: "#10B981",
  Overdue: "#EF4444",
};

function getStatusLabel(value) {
  return TASK_STATUS_OPTIONS.find((o) => o.value === value)?.label || value || "Chưa làm";
}

function mapTaskToFeature(task) {
  const status = task.status || "Todo";
  // Normalize to day boundaries so visual duration matches sidebar duration.
  const startAt = startOfDay(task.created_at ? new Date(task.created_at) : new Date());
  const endAtRaw = task.deadline ? endOfDay(new Date(task.deadline)) : endOfDay(addDays(startAt, 7));

  return {
    id: String(task.id),
    name: task.title,
    startAt,
    endAt: endAtRaw > startAt ? endAtRaw : endOfDay(addDays(startAt, 1)),
    status: {
      id: status,
      name: getStatusLabel(status),
      color: STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.Todo,
    },
  };
}

export default function TaskGanttView({ groups, groupsLoading }) {
  const featuresByGroup = useMemo(() => {
    if (!groups || groups.length === 0) return [];
    return groups.map((group) => ({
      groupName: group.group_name,
      features: (group.tasks || [])
        .filter((t) => !t.is_archived && t.parent_task_id == null)
        .map((t) => mapTaskToFeature(t)),
    }));
  }, [groups]);

  const allFeatures = useMemo(
    () => featuresByGroup.flatMap((g) => g.features),
    [featuresByGroup],
  );

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải dữ liệu Gantt...
      </div>
    );
  }

  if (allFeatures.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        Chưa có task nào để hiển thị trên Gantt chart.
      </div>
    );
  }

  return (
    <div className="h-[500px] overflow-hidden rounded-lg border border-slate-200">
      <GanttProvider className="h-full" range="daily" zoom={100}>
        <GanttSidebar>
          {featuresByGroup.map((group) => (
            <GanttSidebarGroup key={group.groupName} name={group.groupName}>
              {group.features.map((feature) => (
                <GanttSidebarItem key={feature.id} feature={feature} />
              ))}
            </GanttSidebarGroup>
          ))}
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            {featuresByGroup.map((group) => (
              <GanttFeatureListGroup key={group.groupName}>
                {group.features.map((feature) => (
                  <GanttFeatureItem key={feature.id} {...feature}>
                    <div
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: feature.status.color }}
                    />
                    <p className="flex-1 truncate text-xs">{feature.name}</p>
                  </GanttFeatureItem>
                ))}
              </GanttFeatureListGroup>
            ))}
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
}
