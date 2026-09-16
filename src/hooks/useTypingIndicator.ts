"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export function useTypingIndicator(conversationId: string | null) {
  const { supabase, user, profile } = useSupabase();
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, displayName } = payload.payload as { userId: string; displayName: string };
        if (userId === user.id) return;
        setTypingUsers((prev) => ({ ...prev, [userId]: displayName }));
        clearTimeout(timeoutsRef.current[userId]);
        timeoutsRef.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 3000);
      })
      .subscribe();

    channelRef.current = channel;
    const timeouts = timeoutsRef.current;

    return () => {
      supabase.removeChannel(channel);
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, [conversationId, supabase, user]);

  function notifyTyping() {
    if (!user || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, displayName: profile?.display_name ?? "Alguém" },
    });
  }

  return { typingUsers: Object.values(typingUsers), notifyTyping };
}
