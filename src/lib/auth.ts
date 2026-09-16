import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

// Se quem está saindo é uma criança, avisa o administrador da família antes
// de efetivamente encerrar a sessão (ainda precisamos do token de acesso
// para chamar a Edge Function).
export async function signOutWithChildAlert(supabase: SupabaseClient, profile: Profile | null) {
  if (profile && !profile.is_adult) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-child-logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch {
      // não bloqueia o logout se o aviso falhar
    }
  }

  await supabase.auth.signOut();
}
