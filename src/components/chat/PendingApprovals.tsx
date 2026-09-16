"use client";

import { useCallback, useEffect, useState } from "react";
import { Info } from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PendingMember {
  id: string;
  display_name: string;
  created_at: string;
}

export function PendingApprovals() {
  const { supabase, profile, user } = useSupabase();
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_pending_family_members");
    setMembers((data as PendingMember[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    if (profile?.family_role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial ao montar
    load();

    const channel = supabase
      .channel("pending-family-members")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") load();
      });

    const pollId = setInterval(load, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [profile?.family_role, supabase, load]);

  if (profile?.family_role !== "admin") return null;

  async function respond(memberId: string, action: "approve" | "reject") {
    setBusyId(memberId);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ memberId, action }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className="mt-8 rounded-lg border border-[var(--border)] p-4">
      <p className="font-medium text-[var(--text)]">Pedidos de entrada na família</p>
      {members.length === 0 && (
        <Alert className="mt-2">
          <Info />
          <AlertDescription>Nenhum pedido pendente no momento.</AlertDescription>
        </Alert>
      )}
      <ul className="mt-3 space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--panel-alt)] p-2">
            <span className="text-sm font-medium text-[var(--text)]">{m.display_name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => respond(m.id, "approve")}
                disabled={busyId === m.id}
                className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Aprovar
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={busyId === m.id}
                    className="rounded-full border border-red-500 px-3 py-1 text-xs font-medium text-red-500 disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Recusar {m.display_name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A conta criada por essa pessoa será apagada. Ela pode pedir entrada de novo depois, se
                      quiser.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-600"
                      onClick={() => respond(m.id, "reject")}
                    >
                      Recusar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
      {user && <p className="mt-3 text-xs text-[var(--muted)]">Compartilhe o código da família só com quem for entrar.</p>}
    </div>
  );
}
