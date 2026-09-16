"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Avatar } from "@/components/ui/Avatar";
import { formatConversationTime } from "@/lib/format";
import type { ConversationWithMeta } from "@/lib/types";

const TYPE_PREVIEW: Record<string, string> = {
  image: "📷 Foto",
  video: "🎥 Vídeo",
  audio: "🎤 Áudio",
  document: "📄 Documento",
  location: "📍 Localização",
};

export function ConversationListItem({
  conversation,
  online,
}: {
  conversation: ConversationWithMeta;
  online: boolean;
}) {
  const { user } = useSupabase();
  const pathname = usePathname();
  const active = pathname === `/chat/${conversation.id}`;

  const other = conversation.participants.find((p) => p.user_id !== user?.id);
  const title = conversation.type === "group" ? conversation.name || "Grupo" : other?.profile?.display_name || "...";
  const avatarUrl = conversation.type === "group" ? conversation.avatar_url : other?.profile?.avatar_url;

  const last = conversation.last_message;
  const preview = last
    ? last.type === "text"
      ? last.body || ""
      : TYPE_PREVIEW[last.type] || ""
    : "Nenhuma mensagem ainda";
  const prefix = last && last.sender_id === user?.id ? "Você: " : "";

  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={`flex items-center gap-3 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 ${
        active ? "bg-black/5 dark:bg-white/10" : ""
      }`}
    >
      <Avatar name={title} src={avatarUrl} size={48} online={online} />
      <div className="min-w-0 flex-1 border-b border-[var(--border)] pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium text-[var(--text)]">{title}</p>
          {conversation.last_message_at && (
            <span
              className={`shrink-0 text-xs ${
                conversation.unread_count > 0 ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              {formatConversationTime(conversation.last_message_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-[var(--muted)]">
            {prefix}
            {preview}
          </p>
          {conversation.unread_count > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-medium text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
