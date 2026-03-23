import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocketContext } from "@/context/SocketContext";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Users,
  UserCircle,
  Settings,
  Search,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import NotificationDropdown from "@/components/notification/NotificationDropdown";

/**
 * Điều hướng sidebar theo vai trò (GĐ2 mục 2.12: /tasks bật cho mọi vai trò có menu).
 */
const NAV_BY_ROLE = {
  Admin: {
    main: [
      { label: "Tổng quan", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Dự án", icon: FolderKanban, href: "/projects" },
      { label: "Công việc của tôi", icon: ClipboardList, href: "/tasks" },
      { label: "Thành viên", icon: Users, href: "/members" },
      { label: "Hồ sơ cá nhân", icon: UserCircle, href: "/profile" },
    ],
    system: [
      { label: "Cài đặt công ty", icon: Settings, href: "/settings" },
    ],
  },
  Director: {
    main: [
      { label: "Tổng quan", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Dự án", icon: FolderKanban, href: "/projects" },
      { label: "Công việc của tôi", icon: ClipboardList, href: "/tasks" },
      { label: "Thành viên", icon: Users, href: "/members" },
    ],
    system: [
      { label: "Hồ sơ cá nhân", icon: UserCircle, href: "/profile" },
    ],
  },
  Employee: {
    main: [
      { label: "Tổng quan", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Dự án", icon: FolderKanban, href: "/projects" },
      { label: "Công việc của tôi", icon: ClipboardList, href: "/tasks" },
    ],
    system: [
      { label: "Hồ sơ cá nhân", icon: UserCircle, href: "/profile" },
    ],
  },
};

const BRAND = {
  Admin: { name: "Không gian Quản trị", sub: "Quản lý Dự án" },
  Director: { name: "NexusDir", sub: null },
  Employee: { name: "TaskMaster", sub: null },
};

const AVATAR_BG = "bg-blue-500";

function UserAvatar({ name, size = "h-9 w-9 text-sm", isOnline = false }) {
  const initials = (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="relative inline-flex">
      <div className={`${AVATAR_BG} ${size} inline-flex items-center justify-center rounded-full text-white font-semibold`}>
        {initials}
      </div>
      <span
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 ${
          isOnline ? "bg-emerald-400" : "bg-slate-500"
        }`}
        title={isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
      />
    </div>
  );
}

function NavItem({ icon: Icon, label, href, badge, active, disabled, onNavigate }) {
  const baseClasses =
    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
  const enabledClasses = active
    ? "bg-blue-600 text-white"
    : "text-slate-300 hover:bg-white/10 hover:text-white";
  const disabledClasses = "text-slate-500/60 cursor-not-allowed";

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onNavigate?.();
  };

  return (
    <Link
      to={href}
      onClick={handleClick}
      className={`${baseClasses} ${disabled ? disabledClasses : enabledClasses}`}
      aria-disabled={disabled ? "true" : "false"}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${
          active && !disabled
            ? "text-white"
            : "text-slate-400 group-hover:text-white"
        }`}
      />
      <span className="flex-1 text-left">
        {label}
        {disabled && (
          <span className="ml-2 inline-flex items-center rounded-full bg-slate-700 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-100">
            Sắp ra mắt
          </span>
        )}
      </span>
      {badge != null && (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { connected } = useSocketContext();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role || "Employee";
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.Employee;
  const brand = BRAND[role] || BRAND.Employee;
  const fullName = user?.full_name || user?.fullName || "Người dùng";
  const email = user?.email || "";

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + "/");

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <FolderKanban className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{brand.name}</p>
            {brand.sub && (
              <p className="truncate text-xs text-slate-400">{brand.sub}</p>
            )}
          </div>
          <button
            className="ml-auto rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
            onClick={closeSidebar}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.main.map((item) => (
            <NavItem
              key={item.label}
              {...item}
              active={isActive(item.href)}
              onNavigate={closeSidebar}
            />
          ))}

          {nav.system.length > 0 && (
            <>
              <div className="my-4 border-t border-white/10" />
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hệ thống
              </p>
              {nav.system.map((item) => (
                <NavItem
                  key={item.label}
                  {...item}
                  active={isActive(item.href)}
                  onNavigate={closeSidebar}
                />
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <UserAvatar name={fullName} size="h-10 w-10 text-sm" isOnline={connected} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{fullName}</p>
              <p className="truncate text-xs text-slate-400">{email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm (sắp ra mắt)..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              disabled
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <NotificationDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
