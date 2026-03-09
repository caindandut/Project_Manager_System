import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  FolderKanban,
  CheckCircle,
  ClipboardCheck,
  Briefcase,
  Timer,
  ClipboardList,
  Clock,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
} from "lucide-react";

const today = new Date();
const formattedDate = today.toLocaleDateString("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// ─── Skeleton ────────────────────────────────────────────────
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

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, iconBg, trend, trendLabel }) {
  const isPositive = trend == null || trend >= 0;
  return (
    <Card className="bg-white shadow-sm transition-shadow hover:shadow-md border-0 shadow-slate-200/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {trendLabel && (
              <div className="flex items-center gap-1 pt-1">
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                )}
                <span className={`text-xs font-medium ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                  {isPositive && trend != null ? "+" : ""}{trend}%
                </span>
                <span className="text-xs text-slate-400">{trendLabel}</span>
              </div>
            )}
          </div>
          <div className={`rounded-xl p-3 ${iconBg || "bg-blue-50"}`}>
            <Icon className={`h-6 w-6 ${iconBg ? "text-white" : "text-blue-600"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
const STATS_ADMIN = [
  { label: "Tổng người dùng", value: "0", icon: Users, iconBg: "bg-blue-500" },
  { label: "Dự án đang chạy", value: "0", icon: FolderKanban, iconBg: "bg-emerald-500" },
  { label: "Công việc hoàn thành", value: "0", icon: CheckCircle, iconBg: "bg-cyan-500" },
  { label: "Chờ phê duyệt", value: "0", icon: ClipboardCheck, iconBg: "bg-amber-500" },
];

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {STATS_ADMIN.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="text-lg">Quản lý người dùng</CardTitle>
          <CardDescription>Quản lý quyền truy cập và vai trò của thành viên.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Chưa có dữ liệu người dùng.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DIRECTOR DASHBOARD
// ═══════════════════════════════════════════════════════════════
const STATS_DIRECTOR = [
  { label: "Dự án hoạt động", value: "0", icon: Briefcase, iconBg: "bg-blue-500" },
  { label: "Task quá hạn", value: "0", icon: Timer, iconBg: "bg-rose-500" },
  { label: "Hiệu suất nhóm", value: "--", icon: Zap, iconBg: "bg-amber-500" },
];

function DirectorDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {STATS_DIRECTOR.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="text-lg">Dự án đang hoạt động</CardTitle>
          <CardDescription>Theo dõi tiến độ và nhân sự của các dự án.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Chưa có dự án nào.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EMPLOYEE DASHBOARD
// ═══════════════════════════════════════════════════════════════
const STAT_EMPLOYEE = [
  { label: "Công việc hôm nay", value: "0", icon: ClipboardList, iconBg: "bg-blue-50" },
  { label: "Đã hoàn thành", value: "0", icon: CheckCircle2, iconBg: "bg-emerald-50" },
  { label: "Deadline sắp tới", value: "0", icon: Timer, iconBg: "bg-rose-50" },
];

function EmployeeStatCard({ label, value, icon: Icon, iconBg }) {
  return (
    <Card className="bg-white shadow-sm border-0 shadow-slate-200/60 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmployeeDashboard({ fullName }) {
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
        {STAT_EMPLOYEE.map((s) => (
          <EmployeeStatCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="bg-white shadow-sm border-0 shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="text-lg">Công việc của tôi</CardTitle>
          <CardDescription>Danh sách các task được giao cho bạn.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Chưa có công việc nào được giao.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════
const DashboardPage = () => {
  const { user, loading } = useAuth();
  const isLoading = loading;
  const hasUser = user && user.role;

  const getTitle = (role) => {
    if (role === "Admin") return "Tổng quan Dashboard";
    if (role === "Director") return "Tổng quan Điều hành";
    return null;
  };

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
        ) : user.role === "Admin" ? (
          <AdminDashboard />
        ) : user.role === "Director" ? (
          <DirectorDashboard />
        ) : user.role === "Employee" ? (
          <EmployeeDashboard fullName={user.full_name || user.fullName} />
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
