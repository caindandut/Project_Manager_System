function fmtTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function initials(name) {
  return (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MessageBubble({ message, mine }) {
  const sender = message?.user_message_sender_idTouser || null;
  const senderName = sender?.full_name || sender?.email || "Người dùng";

  return (
    <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
          {sender?.avatar_path ? (
            <img
              src={sender.avatar_path}
              alt={senderName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            initials(senderName)
          )}
        </div>
      )}

      <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        {!mine && (
          <p className="mb-1 text-[11px] font-medium text-slate-500">{senderName}</p>
        )}

        <div
          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
            mine
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-slate-100 text-slate-800 rounded-bl-sm"
          }`}
        >
          {message?.content || ""}
        </div>

        <span className="mt-1 text-[11px] text-slate-400">{fmtTime(message?.sent_at)}</span>
      </div>
    </div>
  );
}

