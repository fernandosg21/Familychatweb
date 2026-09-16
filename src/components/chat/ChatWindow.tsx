"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useConversation } from "@/hooks/useConversation";
import { useParticipants } from "@/hooks/useParticipants";
import { useMessages } from "@/hooks/useMessages";
import { usePresence } from "@/components/providers/PresenceProvider";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { Avatar } from "@/components/ui/Avatar";
import { formatDaySeparator, formatLastSeen } from "@/lib/format";

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const { supabase, user } = useSupabase();
  const conversation = useConversation(conversationId);
  const participants = useParticipants(conversationId);
  const { messages, loading, addLocalMessage } = useMessages(conversationId);
  const onlineIds = usePresence();
  const { typingUsers } = useTypingIndicator(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const otherParticipants = useMemo(
    () => participants.filter((p) => p.user_id !== user?.id),
    [participants, user?.id]
  );

  const title =
    conversation?.type === "group"
      ? conversation.name || "Grupo"
      : otherParticipants[0]?.profile?.display_name || "Conversa";

  const avatarUrl =
    conversation?.type === "group" ? conversation.avatar_url : otherParticipants[0]?.profile?.avatar_url;

  const isOtherOnline = conversation?.type === "direct" && onlineIds.has(otherParticipants[0]?.user_id ?? "");

  const subtitle = typingUsers.length
    ? `${typingUsers.join(", ")} digitando...`
    : conversation?.type === "direct"
    ? isOtherOnline
      ? "online"
      : otherParticipants[0]?.profile?.last_seen_at
      ? formatLastSeen(otherParticipants[0].profile.last_seen_at)
      : ""
    : `${participants.length} participantes`;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!conversationId) return;
    supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
  }, [conversationId, supabase, messages.length]);

  const otherLastRead = useMemo(() => {
    const values = otherParticipants.map((p) => new Date(p.last_read_at ?? 0).getTime());
    return values.length ? Math.max(...values) : 0;
  }, [otherParticipants]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--header)] px-3 py-2.5 text-white">
        <Link href="/chat" className="rounded-full p-1 hover:bg-white/10 md:hidden" aria-label="Voltar">
          <ChevronLeft size={22} />
        </Link>
        <Avatar name={title} src={avatarUrl} online={isOtherOnline} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>
          <p className="truncate text-xs text-white/80">{subtitle}</p>
        </div>
      </header>

      <div ref={scrollRef} className="chat-bg flex-1 overflow-y-auto py-3">
        {loading && <p className="py-8 text-center text-sm text-[var(--muted)]">Carregando conversa...</p>}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-[var(--muted)]">
            <MessageCircle size={28} className="text-[var(--muted)]" />
            Nenhuma mensagem ainda. Diga oi!
          </div>
        )}
        {messages.map((message, idx) => {
          const prev = messages[idx - 1];
          const day = formatDaySeparator(message.created_at);
          const showDay = !prev || formatDaySeparator(prev.created_at) !== day;
          const isOwn = message.sender_id === user?.id;
          const showSender = conversation?.type === "group" && (!prev || prev.sender_id !== message.sender_id);
          const read = isOwn && new Date(message.created_at).getTime() <= otherLastRead;

          return (
            <div key={message.id}>
              {showDay && (
                <div className="my-2 flex justify-center">
                  <span className="rounded-lg bg-[var(--panel)] px-3 py-1 text-xs font-medium text-[var(--muted)] shadow-sm">
                    {day}
                  </span>
                </div>
              )}
              <MessageBubble message={message} isOwn={isOwn} showSender={showSender} read={read} />
            </div>
          );
        })}
      </div>

      <MessageInput conversationId={conversationId} onSent={addLocalMessage} />
    </div>
  );
}
