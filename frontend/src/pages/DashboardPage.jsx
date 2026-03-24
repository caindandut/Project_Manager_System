import { createElement, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import reportApi from "@/api/reportApi";
import projectApi from "@/api/projectApi";
import userApi from "@/api/userApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  FolderKanban,
  ClipboardList,
  TriangleAlert,
  Briefcase,
  Timer,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
  Activity,
} from "lucide-react";

const today = new Date();
const formattedDate = today.toLocaleDateString("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <div className="space-y-2">
        <div className="h-6 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-64 rounded-lg bg-slate-100" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-4 w-24 rounded bg-slate-100" />
              <div className="h-8 w-20 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
    <div className="rounded-xl border bg-white p-6">
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 w-full rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  </div>
);

function StatCard({ label, value, icon, iconBg, trend, trendLabel }) {
  const isPositive = trend == null || trend >= 0;
  return (
    <Card className="bg-white shadow-sm transition-shadow hover:shadow-md border-0 shadow-slate-200/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {typeof trend === "number" && trendLabel && (
              <div className="flex items-center gap-1 pt-1">
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                )}
                <span className={`text-xs font-medium ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                  {isPositive ? "+" : ""}
                  {trend}%
                </span>
                <span className="text-xs text-slate-400">{trendLabel}</span>
              </div>
            )}
          </div>
          <div className={`rounded-xl p-3 ${iconBg || "bg-blue-50"}`}>
            {createElement(icon, {
              className: `h-6 w-6 ${iconBg ? "text-white" : "text-blue-600"}`,
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

function normalizeStatusLabel(label) {
  if (!label) return "Khác";
  const map = {
    Todo: "Todo",
    InProgress: "In Progress",
    Review: "Review",
    Completed: "Completed",
    Overdue: "Overdue",
  };
  return map[label] || label;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN");
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("vi-VN");
}

function priorityVariant(priority) {
  if (priority === "Urgent" || priority === "High") return "error";
  if (priority === "Medium") return "warning";
  return "secondary";
}

function EmptyState({ title }) {
  return (
    <div className="py-10 text-center text-sm text-slate-500">{title}</div>
  );
}

function AdminDashboard({ stats, usersMini, projectTop5 }) {
  const cards = [
    { label: "Tổng người dùng", value: stats.totalUsers ?? 0, icon: Users, iconBg: "bg-blue-500" },
    { label: "Dự án hoạt động", value: stats.totalProjects ?? 0, icon: FolderKanban, iconBg: "bg-emerald-500" },
    { label: "Tổng công việc", value: stats.totalTasks ?? 0, icon: ClipboardList, iconBg: "bg-cyan-500" },
    { label: "Task quá hạn", value: stats.overdueTasks ?? 0, icon: TriangleAlert, iconBg: "bg-rose-500" },
  ];
  const pieData = Array.isArray(stats.taskDistribution) ? stats.taskDistribution : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="text-lg">Phân bố task theo trạng thái</CardTitle>
            <CardDescription>Dữ liệu realtime từ /api/reports/dashboard</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu task để hiển thị." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="count" nameKey="label" outerRadius={95}>
                    {pieData.map((entry, index) => (
                      <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="text-lg">Top 5 dự án theo số task</CardTitle>
            <CardDescription>Tổng hợp từ thống kê từng dự án</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {projectTop5.length === 0 ? (
              <EmptyState title="Chưa có dự án để hiển thị biểu đồ." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectTop5}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="text-lg">Hoạt động gần đây</CardTitle>
            <CardDescription>5 hoạt động mới nhất trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(stats.recentActivity || []).length === 0 ? (
              <EmptyState title="Chưa có hoạt động nào." />
            ) : (
              stats.recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                  <div className="mt-0.5 rounded-full bg-blue-50 p-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.details || item.action}</p>
                    <p className="text-xs text-slate-500">{item.user?.full_name || "Hệ thống"} · {formatDateTime(item.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Quản lý người dùng</CardTitle>
              <CardDescription>Danh sách thành viên mới nhất</CardDescription>
            </div>
            <Link to="/members" className="text-sm font-medium text-blue-600 hover:underline">
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {usersMini.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu người dùng." />
            ) : (
              usersMini.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{u.full_name || u.email}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <Badge variant={u.status === "Active" ? "success" : "secondary"}>
                    {u.status || "Unknown"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DirectorDashboard({ stats, projectTop5 }) {
  const cards = [
    { label: "Dự án quản lý", value: stats.projectsManagedCount ?? 0, icon: Briefcase, iconBg: "bg-blue-500" },
    { label: "Tiến độ trung bình", value: `${stats.averageProgress ?? 0}%`, icon: Zap, iconBg: "bg-amber-500" },
    { label: "Task quá hạn", value: stats.overdueTasksInMyProjects ?? 0, icon: Timer, iconBg: "bg-rose-500" },
    { label: "Thành viên team", value: stats.teamMemberCount ?? 0, icon: Users, iconBg: "bg-emerald-500" },
  ];
  const taskDistribution = Array.isArray(stats.taskDistribution) ? stats.taskDistribution : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="text-lg">Tiến độ dự án (Top 5)</CardTitle>
            <CardDescription>Tỷ lệ hoàn thành theo từng dự án</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectTop5.length === 0 ? (
              <EmptyState title="Chưa có dự án để hiển thị." />
            ) : (
              projectTop5.map((p) => (
                <div key={p.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{p.name}</span>
                    <span className="text-slate-500">{p.progress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="text-lg">Phân bố task</CardTitle>
            <CardDescription>Theo trạng thái công việc</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {taskDistribution.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu task." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeStatCard({ label, value, icon, iconBg }) {
  return (
    <Card className="bg-white shadow-sm border-0 shadow-slate-200/60 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>
            {createElement(icon, { className: "h-5 w-5 text-slate-700" })}
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmployeeDashboard({ fullName, stats }) {
  const cards = [
    { label: "Công việc hôm nay", value: stats.myTasksToday ?? 0, icon: ClipboardList, iconBg: "bg-blue-50" },
    { label: "Hoàn thành tuần này", value: stats.completedThisWeek ?? 0, icon: CheckCircle2, iconBg: "bg-emerald-50" },
    { label: "Deadline sắp tới", value: (stats.upcomingDeadlines || []).length, icon: Timer, iconBg: "bg-rose-50" },
  ];
  const weeklyData = Array.isArray(stats.weeklyCompletion) ? stats.weeklyCompletion : [];
  const upcomingTasks = Array.isArray(stats.upcomingDeadlines) ? stats.upcomingDeadlines.slice(0, 5) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Xin chào, {fullName || "bạn"}!
          </h2>
          <p className="mt-1 text-slate-500">
            Chúc bạn một ngày làm việc hiệu quả.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm whitespace-nowrap">
          <Calendar className="h-4 w-4 text-slate-400" />
          {formattedDate}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {cards.map((s) => (
          <EmployeeStatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="text-lg">Task quan trọng sắp tới</CardTitle>
            <CardDescription>Top 5 task có deadline gần nhất</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <EmptyState title="Không có deadline trong 3 ngày tới." />
            ) : (
              upcomingTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                    <Badge variant={priorityVariant(task.priority)}>{task.priority || "Medium"}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Deadline: {formatDate(task.deadline)} · {task.taskgroup?.project?.project_name || "Không rõ dự án"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="text-lg">Biểu đồ hoàn thành theo tuần</CardTitle>
            <CardDescription>Khối lượng công việc hoàn thành gần đây</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {weeklyData.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu tuần để hiển thị." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="completed" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const [dashboardStats, setDashboardStats] = useState({});
  const [usersMini, setUsersMini] = useState([]);
  const [projectTop5, setProjectTop5] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isLoading = loading || statsLoading;
  const hasUser = user && user.role;

  const getTitle = (role) => {
    if (role === "Admin") return "Tổng quan Dashboard";
    if (role === "Director") return "Tổng quan Điều hành";
    return null;
  };

  const normalizedStats = useMemo(() => {
    const taskDistribution = Array.isArray(dashboardStats.taskDistribution)
      ? dashboardStats.taskDistribution.map((item) => ({
          ...item,
          label: normalizeStatusLabel(item.label),
        }))
      : [];
    return { ...dashboardStats, taskDistribution };
  }, [dashboardStats]);

  useEffect(() => {
    if (!user?.role) return;
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setStatsLoading(true);
        setErrorMessage("");

        const dashboardRes = await reportApi.getDashboard();
        const data = dashboardRes.data?.data || {};
        if (cancelled) return;
        setDashboardStats(data);

        const projectsRes = await projectApi.getAll();
        const projects = Array.isArray(projectsRes.data?.data) ? projectsRes.data.data : [];

        const top = projects
          .map((p) => ({
            id: p.id,
            name: p.project_name,
            tasks: p.stats?.total_tasks ?? 0,
            progress: p.stats?.completion_percent ?? 0,
          }))
          .sort((a, b) => b.tasks - a.tasks)
          .slice(0, 5);
        if (!cancelled) setProjectTop5(top);

        if (user.role === "Admin") {
          const usersRes = await userApi.getAll();
          const users = Array.isArray(usersRes.data?.data) ? usersRes.data.data : [];
          if (!cancelled) setUsersMini(users.slice(0, 5));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error?.response?.data?.message || "Không thể tải dữ liệu dashboard.",
          );
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {hasUser && getTitle(user.role) && (
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              {getTitle(user.role)}
            </h1>
          </header>
        )}

        {isLoading || !hasUser ? (
          <DashboardSkeleton />
        ) : errorMessage ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="py-8 text-center text-sm text-rose-600">
              {errorMessage}
            </CardContent>
          </Card>
        ) : user.role === "Admin" ? (
          <AdminDashboard
            stats={normalizedStats}
            usersMini={usersMini}
            projectTop5={projectTop5}
          />
        ) : user.role === "Director" ? (
          <DirectorDashboard stats={normalizedStats} projectTop5={projectTop5} />
        ) : user.role === "Employee" ? (
          <EmployeeDashboard
            fullName={user.full_name || user.fullName}
            stats={normalizedStats}
          />
        ) : (
          <Card className="bg-white shadow-sm">
            <CardContent className="py-8 text-center">
              <p className="text-slate-500">Vai trò của bạn chưa được hỗ trợ dashboard.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
