// Edge Function: cadastro de novos membros.
// Duas formas de entrar:
//  - mode "create": cria uma nova família (o autor vira admin, aprovado na hora).
//    Exige a própria data de nascimento e precisa ter 18+ anos.
//  - mode "join": entra em uma família existente usando o código, mas fica
//    "pending" até o admin da família aprovar. Não informa data de nascimento
//    aqui — quem decide se é criança ou adulto é o administrador da família,
//    preenchendo essa informação depois pelo painel.
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

function isAdultBirthDate(birthDate: string): boolean {
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return false;
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return date <= eighteenYearsAgo;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { email, password, displayName, mode, familyName, familyCode, birthDate } = await req.json();

    if (!email || !password || !displayName || !mode) {
      return json({ error: "Preencha todos os campos." }, 400);
    }
    if (String(password).length < 8) {
      return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
    }
    if (mode !== "create" && mode !== "join") {
      return json({ error: "Modo inválido." }, 400);
    }
    if (mode === "create" && (!familyName || !familyCode)) {
      return json({ error: "Informe o nome da família e um código de acesso." }, 400);
    }
    if (mode === "join" && !familyCode) {
      return json({ error: "Informe o código da família." }, 400);
    }
    if (mode === "create") {
      if (!birthDate) {
        return json({ error: "Informe sua data de nascimento." }, 400);
      }
      if (!isAdultBirthDate(birthDate)) {
        return json({ error: "Somente um adulto (18 anos ou mais) pode criar uma família." }, 403);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const code = String(familyCode).trim();
    let familyId: string;
    let familyRole: "admin" | "member" = "member";
    let approvalStatus: "approved" | "pending" = "pending";

    if (mode === "create") {
      const { data: existing } = await admin
        .from("families")
        .select("id")
        .eq("join_code", code)
        .maybeSingle();
      if (existing) {
        return json({ error: "Esse código já está em uso. Escolha outro." }, 400);
      }

      const { data: family, error: familyError } = await admin
        .from("families")
        .insert({ name: String(familyName).trim(), join_code: code })
        .select("id")
        .single();
      if (familyError || !family) throw familyError;

      familyId = family.id;
      familyRole = "admin";
      approvalStatus = "approved";
    } else {
      const { data: family, error: familyError } = await admin
        .from("families")
        .select("id")
        .eq("join_code", code)
        .maybeSingle();
      if (familyError) throw familyError;
      if (!family) return json({ error: "Código de família inválido." }, 403);

      familyId = family.id;
      familyRole = "member";
      approvalStatus = "pending";
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
      family_id: familyId,
      family_role: familyRole,
      approval_status: approvalStatus,
      birth_date: mode === "create" ? birthDate : null,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    return json({ success: true, status: approvalStatus });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado ao criar conta." }, 500);
  }
});
