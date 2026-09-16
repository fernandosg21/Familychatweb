"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Message } from "@/lib/types";

export function useMessages(conversationId: string | null) {
  const { supabase, user } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const knownIds = useRef<Set<string>>(new Set());

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select(
        "*, sender:profiles(id,display_name,avatar_url), attachments:message_attachments(*)"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(300);

    if (!error && data) {
      const rows = data as unknown as Message[];
      knownIds.current = new Set(rows.map((m) => m.id));
      setMessages(rows);
    }
    setLoading(false);
  }, [conversationId, supabase]);

  useEffect(() => {
    if (!conversationId || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial ao trocar de conversa
    loadMessages();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          if (knownIds.current.has(newMessage.id)) return;
          knownIds.current.add(newMessage.id);

          const { data: sender } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newMessage.sender_id)
            .single();

          setMessages((prev) => [...prev, { ...newMessage, sender: sender ?? undefined, attachments: [] }]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated, sender: m.sender, attachments: m.attachments } : m))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_attachments" },
        (payload) => {
          const attachment = payload.new as Message["attachments"] extends (infer A)[] | undefined
            ? A
            : never;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === (attachment as { message_id: string }).message_id
                ? { ...m, attachments: [...(m.attachments ?? []), attachment as NonNullable<Message["attachments"]>[number]] }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, user, loadMessages]);

  return { messages, loading, reload: loadMessages };
}
