"use client";

import { useRouter } from "next/navigation";
import { Hourglass } from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useMyFamily } from "@/hooks/useMyFamily";
import { Spinner } from "@/components/ui/Spinner";
import { signOutWithChildAlert } from "@/lib/auth";

export function ApprovalGate({ children }: { children: React.ReactNode }) {
  const { supabase, profile, loading } = useSupabase();
  const { family } = useMyFamily();
  const router = useRouter();

  if (loading || !profile) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--bg)]">
        <Spinner size={32} />
      </div>
    );
  }

  if (profile.approval_status === "pending") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg)] p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
          <Hourglass size={28} />
        </span>
        <h1 className="text-xl font-semibold text-[var(--text)]">Aguardando aprovação</h1>
        <p className="max-w-sm text-sm text-[var(--muted)]">
          {family
            ? `Seu pedido para entrar em "${family.name}" foi enviado. Assim que o administrador da família aprovar, você poderá conversar por aqui.`
            : "Seu pedido foi enviado e está aguardando aprovação do administrador da família."}
        </p>
        <button
          onClick={async () => {
            await signOutWithChildAlert(supabase, profile);
            router.push("/login");
          }}
          className="mt-2 rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10"
        >
          Sair
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
