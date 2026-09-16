"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { ConversationParticipant } from "@/lib/types";

export function useParticipants(conversationId: string | null) {
  const { supabase } = useSupabase();
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    let active = true;

    async function load() {
      const { data } = await supabase
        .from("conversation_participants")
        .select("*, profile:profiles(*)")
        .eq("conversation_id", conversationId);
      if (active && data) setParticipants(data as unknown as ConversationParticipant[]);
    }

    load();

    const channel = supabase
      .channel(`participants-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`,
        },
        load
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  return participants;
}
