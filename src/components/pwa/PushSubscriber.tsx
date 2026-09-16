"use client";

import { useEffect } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { subscribeToPush } from "@/lib/push";

export function PushSubscriber() {
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (!user) return;

    async function run() {
      try {
        if (Notification.permission !== "granted") return;
        const sub = await subscribeToPush();
        if (!sub) return;
        const json = sub.toJSON();
        if (!json.endpoint || !json.keys) return;

        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user!.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh!,
            auth: json.keys.auth!,
            device_label: navigator.userAgent.slice(0, 120),
          },
          { onConflict: "endpoint" }
        );
      } catch {
        // notificações não suportadas ou permissão negada — ignora silenciosamente
      }
    }

    run();
  }, [user, supabase]);

  return null;
}
