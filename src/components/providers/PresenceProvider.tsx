"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

const PresenceContext = createContext<Set<string>>(new Set());

// Um único canal de presença para todo o app: Sidebar e ChatWindow ficam
// montados ao mesmo tempo e, se cada um abrisse seu próprio canal com o
// mesmo tópico "family-presence", o supabase-js devolve o canal já existente
// (dedup por tópico) e o segundo .on("presence", ...) chamado depois do
// primeiro .subscribe() lança "cannot add presence callbacks after
// subscribe()". Centralizando num provider só, isso não acontece.
export function PresenceProvider({ children }: { children: React.ReactNode }) {
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

  return <PresenceContext.Provider value={onlineIds}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  return useContext(PresenceContext);
}
