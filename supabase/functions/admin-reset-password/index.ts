// Edge Function administrativa de uso pontual: reseta a senha de um usuário
// via Admin API (hash correto do GoTrue), protegida por um segredo guardado
// no Vault. Só é chamada server-side (via pg_net/SQL), nunca pelo cliente.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const { userId, newPassword, secret } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: expectedSecret } = await admin.rpc("get_app_secret", {
      secret_name: "admin_action_secret",
    });

    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
    }

    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: "missing params" }), { status: 400 });
    }

    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
