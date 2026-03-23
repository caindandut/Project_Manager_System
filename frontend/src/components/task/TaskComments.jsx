import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import commentApi from "@/api/commentApi";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";

const DEFAULT_LIMIT = 20;

function getInitials(name) {
  return (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeTime(value) {
  if (!value) return "Vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa xong";

  const diffMs = Date.now() - date.getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec} giây trước`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} ngày trước`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} tháng trước`;
  const year = Math.floor(month / 12);
  return `${year} năm trước`;
}

function normalizeApiData(res) {
  const data = res?.data?.data ?? {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total || 0),
    page: Number(data.page || 1),
    limit: Number(data.limit || DEFAULT_LIMIT),
  };
}

export default function TaskComments({
  taskId,
  showToast,
  canComment = true,
}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  const canLoadMore = items.length < total;

  const loadComments = useCallback(
    async ({ append = false, nextPage = 1 } = {}) => {
      if (!taskId) return;
      setLoading(true);
      try {
        const res = await commentApi.getByTask(taskId, {
          page: nextPage,
          limit: DEFAULT_LIMIT,
        });
        const parsed = normalizeApiData(res);
        setTotal(parsed.total);
        setPage(parsed.page);
        setItems((prev) => {
          if (!append) return parsed.items;
          const dedup = new Map(prev.map((c) => [c.id, c]));
          parsed.items.forEach((c) => dedup.set(c.id, c));
          return Array.from(dedup.values());
        });
      } catch (err) {
        showToast?.(err.response?.data?.message || "Không tải được bình luận", "error");
      } finally {
        setLoading(false);
      }
    },
    [taskId, showToast],
  );

  const refresh = useCallback(() => loadComments({ append: false, nextPage: 1 }), [loadComments]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleIncomingComment = useCallback(
    (payload) => {
      if (!payload || payload.task_id !== taskId) return;
      setItems((prev) => {
        const exists = prev.some((c) => c.id === payload.id);
        if (exists) return prev;
        return [payload, ...prev];
      });
      setTotal((prev) => prev + 1);
    },
    [taskId],
  );

  useSocket("comment:new", handleIncomingComment);

  const handleCreate = async () => {
    const content = draft.trim();
    if (!content || !taskId) return;
    setSubmitting(true);
    try {
      const res = await commentApi.create(taskId, content);
      const created = res?.data?.data;
      if (created) {
        setItems((prev) => {
          const exists = prev.some((c) => c.id === created.id);
          return exists ? prev : [created, ...prev];
        });
        setTotal((prev) => prev + 1);
      } else {
        await refresh();
      }
      setDraft("");
    } catch (err) {
      showToast?.(err.response?.data?.message || "Không thêm được bình luận", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditingContent(comment.content || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const saveEdit = async () => {
    const content = editingContent.trim();
    if (!editingId || !content) return;
    try {
      const res = await commentApi.update(editingId, content);
      const updated = res?.data?.data;
      if (updated) {
        setItems((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      } else {
        setItems((prev) => prev.map((c) => (c.id === editingId ? { ...c, content } : c)));
      }
      cancelEdit();
    } catch (err) {
      showToast?.(err.response?.data?.message || "Không sửa được bình luận", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await commentApi.remove(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (editingId === id) cancelEdit();
    } catch (err) {
      showToast?.(err.response?.data?.message || "Không xóa được bình luận", "error");
    }
  };

  const visibleItems = useMemo(() => items, [items]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Bình luận</h3>
        <span className="text-xs text-slate-400">{total} bình luận</span>
      </div>

      {canComment && (
        <div className="mb-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-blue-400"
            placeholder="Nhập bình luận..."
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={submitting || !draft.trim()}
            >
              {submitting ? "Đang gửi..." : "Gửi"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!loading && visibleItems.length === 0 && (
          <p className="text-xs text-slate-400">Chưa có bình luận nào.</p>
        )}

        {visibleItems.map((comment) => {
          const mine = !!user && comment.user_id === user.id;
          return (
            <div key={comment.id} className="rounded-md border border-slate-100 p-2.5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
                    {comment.user?.avatar_path ? (
                      <img
                        src={comment.user.avatar_path}
                        alt={comment.user.full_name || comment.user.email}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      getInitials(comment.user?.full_name || comment.user?.email)
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      {comment.user?.full_name || comment.user?.email || "Người dùng"}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatRelativeTime(comment.created_at)}</p>
                  </div>
                </div>

                {mine && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startEdit(comment)}>
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(comment.id)}
                    >
                      Xóa
                    </Button>
                  </div>
                )}
              </div>

              {editingId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      Hủy
                    </Button>
                    <Button size="sm" onClick={saveEdit} disabled={!editingContent.trim()}>
                      Lưu
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.content || ""}</p>
              )}
            </div>
          );
        })}
      </div>

      {canLoadMore && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadComments({ append: true, nextPage: page + 1 })}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Xem thêm"}
          </Button>
        </div>
      )}
    </div>
  );
}

