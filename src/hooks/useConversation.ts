"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Conversation } from "@/lib/types";

export function useConversation(conversationId: string | null) {
  const { supabase } = useSupabase();
  const [conversation, setConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single()
      .then(({ data }) => {
        if (active) setConversation(data as Conversation | null);
      });
    return () => {
      active = false;
    };
  }, [conversationId, supabase]);

  return conversation;
}
