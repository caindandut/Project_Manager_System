import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ChatSidebar from "@/components/chat/ChatSidebar";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import chatApi from "@/api/chatApi";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";

const LIMIT = 20;

export default function ChatPage() {
  const { user } = useAuth();
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sending, setSending] = useState(false);

  const activeGroupId = useMemo(() => {
    const n = Number(groupId);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [groupId]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await chatApi.getGroups();
      const list = res?.data?.data || [];
      setGroups(list);
      if (!activeGroupId && list.length > 0) {
        navigate(`/chat/${list[0].id}`, { replace: true });
      }
    } catch {
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, [activeGroupId, navigate]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const title = g.group_name || g.project?.project_name || "";
      return title.toLowerCase().includes(q);
    });
  }, [groups, search]);

  const loadMessages = useCallback(
    async ({ append = false, nextPage = 1 } = {}) => {
      if (!activeGroupId) return;
      setMessagesLoading(true);
      try {
        const res = await chatApi.getMessages(activeGroupId, { page: nextPage, limit: LIMIT });
        const data = res?.data?.data || {};
        const items = Array.isArray(data.items) ? data.items : [];
        setMessages((prev) => (append ? [...prev, ...items] : items));
        setTotal(Number(data.total || 0));
        setPage(Number(data.page || nextPage));
      } catch {
        if (!append) setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [activeGroupId],
  );

  useEffect(() => {
    setMessages([]);
    setPage(1);
    setTotal(0);
    if (activeGroupId) {
      void loadMessages({ append: false, nextPage: 1 });
      void chatApi.markGroupRead(activeGroupId);
    }
  }, [activeGroupId, loadMessages]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId],
  );

  const hasMore = messages.length < total;

  const handleIncomingMessage = useCallback(
    (payload) => {
      if (!payload || payload.chat_group_id !== activeGroupId) return;
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === payload.id);
        if (exists) return prev;
        return [...prev, payload];
      });
      setTotal((prev) => prev + 1);
    },
    [activeGroupId],
  );

  useSocket("chat:send", handleIncomingMessage);

  const handleSend = async (content) => {
    if (!activeGroupId || !content.trim()) return;
    setSending(true);
    try {
      const res = await chatApi.sendMessage(activeGroupId, {
        content,
        type: "Text",
      });
      const created = res?.data?.data;
      if (created) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === created.id);
          return exists ? prev : [...prev, created];
        });
        setTotal((prev) => prev + 1);
      }
      void chatApi.markGroupRead(activeGroupId);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-64px)] p-4 sm:p-6">
        <div className="grid h-full grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr_280px]">
          <ChatSidebar
            groups={filteredGroups}
            activeGroupId={activeGroupId}
            search={search}
            onSearchChange={setSearch}
            onSelectGroup={(id) => navigate(`/chat/${id}`)}
          />

          <section className="flex min-h-0 flex-col">
            <div className="border-b border-slate-200 px-4 py-3">
              <h1 className="truncate text-base font-semibold text-slate-900">
                {activeGroup?.group_name || activeGroup?.project?.project_name || "Tin nhắn"}
              </h1>
              <p className="text-xs text-slate-500">
                {groupsLoading
                  ? "Đang tải nhóm chat..."
                  : activeGroup
                    ? `${activeGroup.members?.length || 0} thành viên`
                    : "Chọn một nhóm chat để bắt đầu"}
              </p>
            </div>

            <MessageList
              items={messages}
              currentUserId={user?.id}
              hasMore={hasMore}
              loadingMore={messagesLoading}
              onLoadMore={() => loadMessages({ append: true, nextPage: page + 1 })}
            />
            <MessageInput onSend={handleSend} disabled={!activeGroupId || sending} />
          </section>

          <aside className="hidden border-l border-slate-200 bg-white lg:flex lg:flex-col">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Thông tin nhóm</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {!activeGroup && (
                <p className="text-sm text-slate-400">Chưa chọn nhóm chat.</p>
              )}
              {activeGroup && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Tên nhóm</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {activeGroup.group_name || activeGroup.project?.project_name || "Trò chuyện trực tiếp"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Thành viên</p>
                    <ul className="space-y-1.5">
                      {(activeGroup.members || []).map((m) => (
                        <li key={m.user_id} className="rounded-md bg-slate-50 px-2 py-1.5 text-sm text-slate-700">
                          {m.user?.full_name || m.user?.email || `User #${m.user_id}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

