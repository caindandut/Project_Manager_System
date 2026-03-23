import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

function countUnread(_group) {
  // Backend hiện chưa trả unread_count theo nhóm, giữ 0 để UI ổn định.
  return 0;
}

export default function ChatSidebar({
  groups,
  activeGroupId,
  search,
  onSearchChange,
  onSelectGroup,
  onOpenDirect,
  onOpenGroup,
}) {
  return (
    <aside className="flex h-full w-full max-w-[320px] flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Tìm nhóm chat..."
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400"
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="w-full gap-2" onClick={onOpenDirect}>
            <Plus className="h-4 w-4 rotate-45" />
            1-1
          </Button>
          <Button type="button" size="sm" className="w-full gap-2 bg-blue-600 hover:bg-blue-700" onClick={onOpenGroup}>
            <Plus className="h-4 w-4" />
            Nhóm
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {groups.length === 0 && (
          <p className="px-2 py-6 text-sm text-slate-400">Chưa có nhóm chat.</p>
        )}

        {groups.map((g) => {
          const unread = countUnread(g);
          const active = Number(activeGroupId) === g.id;
          const title = g.group_name || g.project?.project_name || "Trò chuyện trực tiếp";
          const sub = g.last_message?.content || "Chưa có tin nhắn";
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectGroup?.(g.id)}
              className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left transition ${
                active ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
                {unread > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
                    {unread}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

