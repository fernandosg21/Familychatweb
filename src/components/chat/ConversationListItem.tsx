"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, FileText, MapPin, Mic, Video } from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/badge";
import { formatConversationTime } from "@/lib/format";
import type { ConversationWithMeta, MessageType } from "@/lib/types";

const TYPE_PREVIEW: Partial<Record<MessageType, { icon: React.ComponentType<{ size?: number }>; label: string }>> = {
  image: { icon: Camera, label: "Foto" },
  video: { icon: Video, label: "Vídeo" },
  audio: { icon: Mic, label: "Áudio" },
  document: { icon: FileText, label: "Documento" },
  location: { icon: MapPin, label: "Localização" },
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
  const typePreview = last && last.type !== "text" ? TYPE_PREVIEW[last.type] : undefined;
  const preview = last ? (last.type === "text" ? last.body || "" : typePreview?.label ?? "") : "Nenhuma mensagem ainda";
  const prefix = last && last.sender_id === user?.id ? "Você: " : "";
  const PreviewIcon = typePreview?.icon;

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
          <p className="flex min-w-0 items-center gap-1 truncate text-sm text-[var(--muted)]">
            {PreviewIcon && <PreviewIcon size={14} />}
            {prefix}
            {preview}
          </p>
          {conversation.unread_count > 0 && (
            <Badge className="h-5 min-w-5 justify-center bg-[var(--accent)] px-1.5 text-white">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
