import { CheckCheck } from "lucide-react";
import { formatMessageTime } from "@/lib/format";
import type { Message } from "@/lib/types";
import { AttachmentView } from "@/components/chat/AttachmentView";
import { LocationCard } from "@/components/chat/LocationCard";

function Ticks({ read }: { read: boolean }) {
  return <CheckCheck size={15} className={read ? "text-[#53bdeb]" : "text-[var(--muted)]"} />;
}

export function MessageBubble({
  message,
  isOwn,
  showSender,
  read,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  read: boolean;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-3 py-0.5`}>
      <div
        className={`relative max-w-[78%] rounded-lg px-2.5 py-1.5 shadow-sm sm:max-w-[65%] ${
          isOwn ? "bg-[var(--bubble-out)]" : "bg-[var(--bubble-in)]"
        }`}
      >
        {showSender && !isOwn && (
          <p className="mb-0.5 text-xs font-semibold text-[var(--accent-dark)]">
            {message.sender?.display_name}
          </p>
        )}

        {message.type === "text" && (
          <p className="whitespace-pre-wrap break-words pr-12 text-[15px] text-[var(--text)]">{message.body}</p>
        )}

        {message.type === "location" && (
          <div className="pb-3">
            <LocationCard location={message.metadata as { lat: number; lng: number; label?: string }} />
          </div>
        )}

        {(message.type === "image" || message.type === "video" || message.type === "audio" || message.type === "document") && (
          <div className="pb-1">
            {message.attachments?.map((a) => (
              <AttachmentView key={a.id} attachment={a} caption={message.body} />
            ))}
            {message.body && message.type !== "audio" && (
              <p className="mt-1 whitespace-pre-wrap break-words pr-12 text-[15px]">{message.body}</p>
            )}
          </div>
        )}

        <span className="pointer-events-none float-right mt-1 flex items-center gap-1 pl-2 text-[11px] text-[var(--muted)]">
          {formatMessageTime(message.created_at)}
          {isOwn && <Ticks read={read} />}
        </span>
      </div>
    </div>
  );
}
