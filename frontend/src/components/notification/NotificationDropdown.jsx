import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import notificationApi from "@/api/notificationApi";
import { useSocket } from "@/hooks/useSocket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

function formatRelativeTime(value) {
  if (!value) return "Vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa xong";

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  const years = Math.floor(months / 12);
  return `${years} năm trước`;
}

function getUnreadCountFromResponse(res) {
  return Number(res?.data?.data?.unread_count || 0);
}

function getItemsFromResponse(res) {
  const data = res?.data?.data;
  return Array.isArray(data?.items) ? data.items : [];
}

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readAllLoading, setReadAllLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(getUnreadCountFromResponse(res));
    } catch {
      // Im lặng để không phá UX dropdown.
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getAll({ page: 1, limit: PAGE_SIZE });
      setItems(getItemsFromResponse(res));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;
    void fetchLatest();
  }, [open, fetchLatest]);

  const handleIncomingNotification = useCallback((payload) => {
    if (!payload || !payload.id) return;
    setItems((prev) => {
      const dedup = prev.filter((n) => n.id !== payload.id);
      return [payload, ...dedup].slice(0, PAGE_SIZE);
    });
    setUnreadCount((prev) => prev + 1);
  }, []);

  useSocket("notification:new", handleIncomingNotification);

  const visibleItems = useMemo(() => items.slice(0, PAGE_SIZE), [items]);

  const markOneAsRead = async (item) => {
    if (!item?.id) return;
    if (!item.is_read) {
      try {
        await notificationApi.markAsRead(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Không chặn điều hướng nếu mark đọc thất bại.
      }
    }

    if (item.link_url) {
      navigate(item.link_url);
      setOpen(false);
    }
  };

  const handleReadAll = async () => {
    setReadAllLoading(true);
    try {
      await notificationApi.markAllAsRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Không đẩy toast tại đây để component giữ nhẹ.
    } finally {
      setReadAllLoading(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          type="button"
          title="Thông báo"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-semibold text-slate-800">Thông báo</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={readAllLoading || unreadCount === 0}
            onClick={handleReadAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Đọc hết
          </Button>
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-[360px] overflow-y-auto px-1 py-1">
          {!loading && visibleItems.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-slate-400">Chưa có thông báo nào</p>
          )}

          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                void markOneAsRead(item);
              }}
              className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-slate-50"
            >
              <span
                className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                  item.is_read ? "bg-slate-300" : "bg-blue-500"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-slate-700">{item.content || "Thông báo mới"}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatRelativeTime(item.created_at)}
                </p>
              </div>
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Xem tất cả →
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

