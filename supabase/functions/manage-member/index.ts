// Edge Function: administrador aprova ou rejeita um pedido de entrada na família.
// Requer o JWT do chamador (verify_jwt=true) e confere se ele é admin da
// mesma família do membro alvo antes de agir.
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

    const { memberId, action } = await req.json();
    if (!memberId || (action !== "approve" && action !== "reject")) {
      return json({ error: "Parâmetros inválidos." }, 400);
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
      return json({ error: "Só administradores da família podem fazer isso." }, 403);
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("family_id, approval_status")
      .eq("id", memberId)
      .single();

    if (!targetProfile || targetProfile.family_id !== callerProfile.family_id) {
      return json({ error: "Membro não encontrado nesta família." }, 404);
    }

    if (action === "approve") {
      const { error } = await admin.from("profiles").update({ approval_status: "approved" }).eq("id", memberId);
      if (error) throw error;
    } else {
      const { error } = await admin.auth.admin.deleteUser(memberId);
      if (error) throw error;
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado." }, 500);
  }
});
