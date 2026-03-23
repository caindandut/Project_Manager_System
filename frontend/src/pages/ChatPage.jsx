import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ChatSidebar from "@/components/chat/ChatSidebar";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import chatApi from "@/api/chatApi";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import projectApi from "@/api/projectApi";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Dialog: tạo chat 1-1
  const [directOpen, setDirectOpen] = useState(false);
  const [directProjectId, setDirectProjectId] = useState("");
  const [directMembers, setDirectMembers] = useState([]);
  const [directMembersLoading, setDirectMembersLoading] = useState(false);
  const [directTargetId, setDirectTargetId] = useState("");
  const [directError, setDirectError] = useState("");

  // Dialog: tạo nhóm chat
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupProjectId, setGroupProjectId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupMemberIds, setGroupMemberIds] = useState(() => new Set());
  const [groupError, setGroupError] = useState("");

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

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await projectApi.getAll();
      setProjects(res.data.data || []);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const ensureProjectMembers = useCallback(async ({ projectId, kind }) => {
    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid <= 0) return;

    if (kind === "direct") {
      setDirectMembersLoading(true);
      setDirectMembers([]);
      try {
        const res = await projectApi.getMembers(pid);
        setDirectMembers(res.data.data || []);
      } catch {
        setDirectMembers([]);
      } finally {
        setDirectMembersLoading(false);
      }
    }

    if (kind === "group") {
      setGroupMembersLoading(true);
      setGroupMembers([]);
      try {
        const res = await projectApi.getMembers(pid);
        setGroupMembers(res.data.data || []);
      } catch {
        setGroupMembers([]);
      } finally {
        setGroupMembersLoading(false);
      }
    }
  }, []);

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

  const openDirectDialog = () => {
    setDirectError("");
    setDirectOpen(true);
    const firstProject = projects?.[0]?.id;
    setDirectProjectId(firstProject ? String(firstProject) : "");
    setDirectTargetId("");
    setDirectMembers([]);
  };

  const openGroupDialog = () => {
    setGroupError("");
    setGroupOpen(true);
    const firstProject = projects?.[0]?.id;
    setGroupProjectId(firstProject ? String(firstProject) : "");
    setGroupName("");
    setGroupMemberIds(new Set(user?.id ? [user.id] : []));
    setGroupMembers([]);
  };

  useEffect(() => {
    if (directOpen && directProjectId) {
      void ensureProjectMembers({ projectId: directProjectId, kind: "direct" });
    }
  }, [directOpen, directProjectId, ensureProjectMembers]);

  useEffect(() => {
    if (groupOpen && groupProjectId) {
      void ensureProjectMembers({ projectId: groupProjectId, kind: "group" });
    }
  }, [groupOpen, groupProjectId, ensureProjectMembers]);

  const toggleGroupMember = (uid) => {
    setGroupMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      if (user?.id && uid !== user.id && !next.has(user.id)) next.add(user.id);
      return next;
    });
  };

  const createDirectChat = async () => {
    setDirectError("");
    if (!directTargetId) return;
    try {
      const targetIdNum = Number(directTargetId);
      const res = await chatApi.getOrCreateDirect(targetIdNum);
      const group = res?.data?.data?.group;
      if (group?.id) {
        setDirectOpen(false);
        navigate(`/chat/${group.id}`);
      }
    } catch (err) {
      setDirectError(err?.response?.data?.message || "Không thể tạo chat 1-1");
    }
  };

  const createGroupChat = async () => {
    setGroupError("");
    try {
      if (!groupProjectId) throw new Error("Chưa chọn dự án");
      const pid = Number(groupProjectId);
      const memberIds = Array.from(groupMemberIds).map((x) => Number(x)).filter((x) => Number.isInteger(x));
      if (memberIds.length < 2) {
        throw new Error("Nhóm chat cần ít nhất 2 thành viên");
      }

      const res = await chatApi.createGroup({
        project_id: pid,
        name: groupName.trim() || null,
        member_ids: memberIds,
      });

      const created = res?.data?.data;
      if (created?.id) {
        setGroupOpen(false);
        navigate(`/chat/${created.id}`);
      }
    } catch (err) {
      setGroupError(err?.response?.data?.message || err?.message || "Không thể tạo nhóm chat");
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
            onOpenDirect={openDirectDialog}
            onOpenGroup={openGroupDialog}
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

      {/* Dialog: chat 1-1 */}
      <Dialog open={directOpen} onOpenChange={setDirectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat 1-1</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Dự án</Label>
              <Select value={directProjectId} onValueChange={setDirectProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn dự án" />
                </SelectTrigger>
                <SelectContent>
                  {(projects || []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.project_name || p.project_name || p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Người nhận</Label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white">
                {directMembersLoading && <p className="p-3 text-xs text-slate-500">Đang tải...</p>}
                {!directMembersLoading && directMembers.length === 0 && (
                  <p className="p-3 text-xs text-slate-500">Chưa có thành viên</p>
                )}
                {!directMembersLoading &&
                  directMembers
                    .filter((m) => m.id !== user?.id)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                          String(directTargetId) === String(m.id) ? "bg-blue-50" : ""
                        }`}
                        onClick={() => setDirectTargetId(String(m.id))}
                      >
                        {m.full_name || m.email}
                      </button>
                    ))}
              </div>
            </div>

            {directError && <p className="text-sm text-red-600">{directError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDirectOpen(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={!directTargetId} onClick={() => void createDirectChat()}>
              Tạo chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: tạo nhóm chat */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo nhóm chat</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Dự án</Label>
              <Select value={groupProjectId} onValueChange={setGroupProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn dự án" />
                </SelectTrigger>
                <SelectContent>
                  {(projects || []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.project_name || p.project_name || p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Tên nhóm (tùy chọn)</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="VD: Nhóm UI/Backend" />
            </div>

            <div className="space-y-1">
              <Label>Thành viên</Label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                {groupMembersLoading && <p className="text-xs text-slate-500">Đang tải...</p>}
                {!groupMembersLoading && groupMembers.length === 0 && (
                  <p className="text-xs text-slate-500">Chưa có thành viên</p>
                )}
                {!groupMembersLoading &&
                  groupMembers.map((m) => {
                    const checked = groupMemberIds.has(m.id);
                    return (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGroupMember(m.id)}
                        />
                        <span className="text-sm text-slate-800">{m.full_name || m.email}</span>
                      </label>
                    );
                  })}
              </div>
              <p className="text-xs text-slate-500">
                Nhóm chat cần ít nhất 2 thành viên.
              </p>
            </div>

            {groupError && <p className="text-sm text-red-600">{groupError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGroupOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              disabled={groupMemberIds.size < 2}
              onClick={() => void createGroupChat()}
            >
              Tạo nhóm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

