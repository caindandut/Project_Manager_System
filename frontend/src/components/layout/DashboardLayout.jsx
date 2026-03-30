import { useState, createElement } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocketContext } from "@/context/SocketContext";
import { useTheme } from "@/context/ThemeContext";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  MessageSquare,
  Users,
  UserCircle,
  Settings,
  Search,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import NotificationDropdown from "@/components/notification/NotificationDropdown";
import { Button } from "@/components/ui/button";

/**
 * Điều hướng sidebar theo vai trò (GĐ2 mục 2.12: /tasks bật cho mọi vai trò có menu).
 */
const NAV_BY_ROLE = {
  Admin: {
    main: [
      { label: "Tổng quan", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Dự án", icon: FolderKanban, href: "/projects" },
      { label: "Công việc của tôi", icon: ClipboardList, href: "/tasks" },
      { label: "Tin nhắn", icon: MessageSquare, href: "/chat" },
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
      { label: "Tin nhắn", icon: MessageSquare, href: "/chat" },
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
      { label: "Tin nhắn", icon: MessageSquare, href: "/chat" },
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
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-border ${
          isOnline ? "bg-emerald-400" : "bg-muted"
        }`}
        title={isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
      />
    </div>
  );
}

function NavItem({ icon: IconComponent, label, href, badge, active, disabled, onNavigate }) {
  const baseClasses =
    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
  const enabledClasses = active
    ? "bg-blue-600 text-white"
    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground";
  const disabledClasses = "text-muted-foreground/60 cursor-not-allowed";

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
      {createElement(IconComponent, {
        className: `h-5 w-5 shrink-0 ${
          active && !disabled
            ? "text-white"
            : "text-muted-foreground group-hover:text-foreground"
        }`,
      })}
      <span className="flex-1 text-left">
        {label}
        {disabled && (
          <span className="ml-2 inline-flex items-center rounded-full bg-muted px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
  const { resolvedTheme, toggleTheme } = useTheme();
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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card text-card-foreground transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 px-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <FolderKanban className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-card-foreground">{brand.name}</p>
            {brand.sub && (
              <p className="truncate text-xs text-muted-foreground">{brand.sub}</p>
            )}
          </div>
          <button
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:text-foreground lg:hidden"
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
              <div className="my-4 border-t border-border" />
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <UserAvatar name={fullName} size="h-10 w-10 text-sm" isOnline={connected} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
          <button
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm (sắp ra mắt)..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-300 focus:bg-background focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              disabled
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg"
              aria-label="Chuyển chế độ màu"
              title="Chuyển chế độ màu"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
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
