import { useMemo } from "react";
import { addDays } from "date-fns";
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

const STATUS_COLOR_MAP = {
  Todo: "#6B7280",
  InProgress: "#F59E0B",
  Review: "#8B5CF6",
  Completed: "#10B981",
  Overdue: "#EF4444",
};

function mapTaskToFeature(task, groupName) {
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
    groupName,
  };
}

export default function TaskGanttView({ groups, groupsLoading }) {
  const featuresByGroup = useMemo(() => {
    if (!groups || groups.length === 0) return [];
    return groups.map((group) => ({
      groupName: group.group_name,
      features: (group.tasks || [])
        .filter((t) => !t.is_archived)
        .map((t) => mapTaskToFeature(t, group.group_name)),
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
      <GanttProvider className="h-full" range="monthly" zoom={100}>
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
