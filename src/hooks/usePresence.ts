"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export function usePresence() {
  const { supabase, user, profile } = useSupabase();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("family-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            display_name: profile?.display_name ?? "",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, profile?.display_name]);

  return onlineIds;
}
