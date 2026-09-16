"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { ConversationWithMeta, MessageType } from "@/lib/types";

interface OverviewRow {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  last_message_at: string;
  participants: { user_id: string; display_name: string; avatar_url: string | null; last_seen_at: string }[] | null;
  last_message: { id: string; type: string; body: string | null; sender_id: string; created_at: string } | null;
  unread_count: number;
}

export function useConversations() {
  const { supabase, user } = useSupabase();
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_conversations_overview");
    if (!error && data) {
      const rows = data as OverviewRow[];
      setConversations(
        rows.map((row) => ({
          id: row.id,
          type: row.type,
          name: row.name,
          avatar_url: row.avatar_url,
          created_by: null,
          created_at: row.last_message_at,
          last_message_at: row.last_message_at,
          unread_count: Number(row.unread_count) || 0,
          participants: (row.participants ?? []).map((p) => ({
            conversation_id: row.id,
            user_id: p.user_id,
            role: "member" as const,
            joined_at: row.last_message_at,
            last_read_at: row.last_message_at,
            profile: {
              id: p.user_id,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
              status: "",
              last_seen_at: p.last_seen_at,
              created_at: row.last_message_at,
              family_id: null,
              family_role: "member" as const,
              approval_status: "approved" as const,
              birth_date: null,
              is_adult: true,
              username: null,
            },
          })),
          last_message: row.last_message
            ? {
                id: row.last_message.id,
                conversation_id: row.id,
                sender_id: row.last_message.sender_id,
                type: row.last_message.type as MessageType,
                body: row.last_message.body,
                metadata: {},
                reply_to_id: null,
                created_at: row.last_message.created_at,
                edited_at: null,
                deleted_at: null,
              }
            : undefined,
        }))
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial ao montar
    refresh();

    const channel = supabase
      .channel("conversations-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_participants" },
        refresh
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") refresh();
      });

    // Apoio ao canal de tempo real: garante que a lista de conversas se
    // atualiza sozinha mesmo se o push falhar por algum motivo.
    const pollId = setInterval(refresh, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [supabase, user, refresh]);

  return { conversations, loading, refresh };
}
