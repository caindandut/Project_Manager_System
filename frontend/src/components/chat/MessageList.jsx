import { useEffect, useMemo, useRef } from "react";
import MessageBubble from "@/components/chat/MessageBubble";

export default function MessageList({
  items,
  currentUserId,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}) {
  const listRef = useRef(null);
  const firstRenderRef = useRef(true);

  const sorted = useMemo(
    () => [...(items || [])].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at)),
    [items],
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (firstRenderRef.current) {
      el.scrollTop = el.scrollHeight;
      firstRenderRef.current = false;
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [sorted]);

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto bg-slate-50 px-4 py-3">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        {hasMore && (
          <button
            type="button"
            className="self-center rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Đang tải..." : "Tải tin nhắn cũ hơn"}
          </button>
        )}

        {sorted.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">Chưa có tin nhắn nào.</p>
        )}

        {sorted.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            mine={msg.sender_id === currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

