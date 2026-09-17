// Edge Function: envia Web Push para os participantes de uma conversa
// quando uma nova mensagem chega, exceto para quem a enviou.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

function previewFor(type: string, body: string | null) {
  switch (type) {
    case "image":
      return "📷 Foto";
    case "video":
      return "🎥 Vídeo";
    case "audio":
      return "🎤 Mensagem de voz";
    case "document":
      return "📄 Documento";
    case "location":
      return "📍 Localização";
    default:
      return body?.slice(0, 120) || "Nova mensagem";
  }
}

Deno.serve(async (req) => {
  try {
    const { message_id } = await req.json();
    if (!message_id) return new Response(JSON.stringify({ error: "message_id ausente" }), { status: 400 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Chaves VAPID guardadas no Vault do Supabase, lidas via RPC
    // (o schema "vault" não é exposto pela API REST diretamente).
    const [{ data: vapidPublic }, { data: vapidPrivate }, { data: vapidSubjectRaw }] = await Promise.all([
      admin.rpc("get_app_secret", { secret_name: "vapid_public_key" }),
      admin.rpc("get_app_secret", { secret_name: "vapid_private_key" }),
      admin.rpc("get_app_secret", { secret_name: "vapid_subject" }),
    ]);
    const vapidSubject = vapidSubjectRaw || "mailto:family@example.com";

    if (!vapidPublic || !vapidPrivate) {
      console.error("Chaves VAPID não configuradas no Vault");
      return new Response(JSON.stringify({ error: "VAPID não configurado" }), { status: 200 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const { data: message, error: messageError } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, type, body")
      .eq("id", message_id)
      .single();
    if (messageError || !message) throw messageError ?? new Error("Mensagem não encontrada");

    const { data: sender } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", message.sender_id)
      .single();

    const { data: conversation } = await admin
      .from("conversations")
      .select("id, type, name")
      .eq("id", message.conversation_id)
      .single();

    const title =
      conversation?.type === "group"
        ? `${conversation.name || "Grupo"}: ${sender?.display_name ?? "Alguém"}`
        : sender?.display_name ?? "Nova mensagem";

    const { data: participants } = await admin
      .from("conversation_participants")
      .select("user_id, push_subscriptions:push_subscriptions(id, endpoint, p256dh, auth)")
      .eq("conversation_id", message.conversation_id)
      .neq("user_id", message.sender_id);

    const payload = JSON.stringify({
      title,
      body: previewFor(message.type, message.body),
      conversationId: message.conversation_id,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
    });

    interface PushSubRow {
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }
    interface ParticipantRow {
      user_id: string;
      push_subscriptions: PushSubRow[] | null;
    }

    const results: unknown[] = [];
    for (const participant of (participants ?? []) as ParticipantRow[]) {
      const subs = participant.push_subscriptions ?? [];
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          results.push({ endpoint: sub.endpoint, ok: true });
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          results.push({ endpoint: sub.endpoint, ok: false, status: statusCode });
          // 404/410: endpoint não existe mais. 401/403: a assinatura foi
          // criada com uma chave VAPID diferente da atual (ex: dispositivo
          // que se inscreveu antes da correção do get_vapid_public_key) —
          // nesses casos o navegador nunca vai exibir a notificação, então
          // não faz sentido manter a inscrição.
          if ([401, 403, 404, 410].includes(statusCode ?? 0)) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
