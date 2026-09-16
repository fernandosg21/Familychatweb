// Edge Function: cadastro de novos membros da família protegido por código de convite.
// Cria o usuário via Admin API (service role) e o perfil correspondente.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const { email, password, displayName, inviteCode } = await req.json();

    if (!email || !password || !displayName || !inviteCode) {
      return json({ error: "Preencha todos os campos, incluindo o código de convite." }, 400);
    }
    if (String(password).length < 8) {
      return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const code = String(inviteCode).trim().toUpperCase();

    const { data: invite, error: inviteError } = await admin
      .from("invite_codes")
      .select("code, uses, max_uses, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) return json({ error: "Código de convite inválido." }, 403);
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return json({ error: "Código de convite expirado." }, 403);
    }
    if (invite.uses >= invite.max_uses) {
      return json({ error: "Código de convite já foi utilizado o máximo de vezes." }, 403);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (createError) {
      const msg = createError.message.includes("already been registered")
        ? "Este e-mail já está cadastrado."
        : createError.message;
      return json({ error: msg }, 400);
    }

    const userId = created.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      display_name: displayName,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    await admin
      .from("invite_codes")
      .update({ uses: invite.uses + 1 })
      .eq("code", code);

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado ao criar conta." }, 500);
  }
});
