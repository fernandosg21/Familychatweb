// Edge Function: administrador cria a conta de um membro (tipicamente uma
// criança) diretamente, sem precisar de e-mail próprio nem passar pela
// aprovação — a conta já nasce aprovada dentro da família do admin.
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

    const { displayName, password, birthDate, username } = await req.json();
    if (!displayName || !password || !username) {
      return json({ error: "Informe nome, nome de usuário e senha." }, 400);
    }
    if (String(password).length < 8) {
      return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
    }
    const cleanUsername = String(username).trim().toLowerCase();
    if (!/^[a-z0-9._]{3,20}$/.test(cleanUsername)) {
      return json(
        { error: "Usuário deve ter de 3 a 20 letras minúsculas, números, pontos ou underscore." },
        400
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("family_id, family_role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.family_role !== "admin") {
      return json({ error: "Só administradores da família podem criar contas." }, 403);
    }

    const { data: family } = await admin
      .from("families")
      .select("slug")
      .eq("id", callerProfile.family_id)
      .single();
    if (!family) throw new Error("Família não encontrada.");

    const { data: existingUsername } = await admin
      .from("profiles")
      .select("id")
      .eq("family_id", callerProfile.family_id)
      .ilike("username", cleanUsername)
      .maybeSingle();
    if (existingUsername) {
      return json({ error: "Esse nome de usuário já está em uso na família." }, 400);
    }

    const syntheticEmail = `${crypto.randomUUID()}@familychat.local`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createError) throw createError;

    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      display_name: displayName,
      family_id: callerProfile.family_id,
      family_role: "member",
      approval_status: "approved",
      birth_date: birthDate || null,
      username: cleanUsername,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    return json({ success: true, username: cleanUsername, familySlug: family.slug });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado ao criar a conta." }, 500);
  }
});
