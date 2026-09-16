// Edge Function: quando uma conta marcada como criança faz logout, avisa por
// push os administradores da mesma família — pode ser a criança tentando
// criar outra conta ou com dificuldade para usar o app.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Não autenticado." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: caller } = await admin
      .from("profiles")
      .select("display_name, family_id, is_adult")
      .eq("id", user.id)
      .single();

    if (!caller || caller.is_adult || !caller.family_id) {
      return json({ success: true, skipped: true });
    }

    const { data: admins } = await admin
      .from("profiles")
      .select("id, push_subscriptions:push_subscriptions(endpoint, p256dh, auth)")
      .eq("family_id", caller.family_id)
      .eq("family_role", "admin")
      .neq("id", user.id);

    const { data: secrets } = await admin
      .schema("vault")
      .from("decrypted_secrets")
      .select("name, decrypted_secret")
      .in("name", ["vapid_public_key", "vapid_private_key", "vapid_subject"]);
    const secretMap = Object.fromEntries((secrets ?? []).map((s) => [s.name, s.decrypted_secret]));
    const vapidPublic = secretMap["vapid_public_key"];
    const vapidPrivate = secretMap["vapid_private_key"];
    const vapidSubject = secretMap["vapid_subject"] || "mailto:family@example.com";

    if (!vapidPublic || !vapidPrivate) {
      return json({ success: true, skipped: true });
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const payload = JSON.stringify({
      title: "Verifique o aparelho",
      body: `${caller.display_name} (criança) saiu da conta. Vale a pena checar o dispositivo dela.`,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
    });

    interface PushSubRow {
      endpoint: string;
      p256dh: string;
      auth: string;
    }
    interface AdminRow {
      id: string;
      push_subscriptions: PushSubRow[] | null;
    }

    for (const adminProfile of (admins ?? []) as AdminRow[]) {
      for (const sub of adminProfile.push_subscriptions ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err) {
          console.error("Falha ao notificar admin", err);
        }
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado." }, 500);
  }
});
