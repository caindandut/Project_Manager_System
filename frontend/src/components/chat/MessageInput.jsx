import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Send } from "lucide-react";

export default function MessageInput({ onSend, disabled = false }) {
  const [text, setText] = useState("");

  const submit = () => {
    const content = text.trim();
    if (!content || disabled) return;
    onSend?.(content);
    setText("");
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Nhập tin nhắn..."
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400"
          disabled={disabled}
        />
        <Button type="button" variant="outline" size="icon" disabled title="Đính kèm file (sắp ra mắt)">
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" onClick={submit} disabled={disabled || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

