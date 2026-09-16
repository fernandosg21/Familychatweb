"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useMyFamily } from "@/hooks/useMyFamily";
import { Badge } from "@/components/ui/badge";
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

interface FamilyMember {
  id: string;
  display_name: string;
  birth_date: string | null;
  is_adult: boolean;
  family_role: "admin" | "member";
  approval_status: "pending" | "approved";
  username: string | null;
}

export function FamilyMembersAdmin() {
  const { supabase, profile, user } = useSupabase();
  const { family } = useMyFamily();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_family_members");
    setMembers((data as FamilyMember[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    if (profile?.family_role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial ao montar
    load();

    const channel = supabase
      .channel("family-members-admin")
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

  async function saveBirthDate(memberId: string) {
    const value = drafts[memberId];
    if (!value) return;
    setSavingId(memberId);
    await supabase.from("profiles").update({ birth_date: value }).eq("id", memberId);
    setSavingId(null);
    load();
  }

  async function toggleAdmin(member: FamilyMember) {
    setSavingId(member.id);
    await supabase.rpc("set_family_role", {
      p_member_id: member.id,
      p_role: member.family_role === "admin" ? "member" : "admin",
    });
    setSavingId(null);
    load();
  }

  return (
    <div className="mt-8 rounded-lg border border-[var(--border)] p-4">
      <p className="font-medium text-[var(--text)]">Membros da família</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Defina a data de nascimento de cada um para marcar quem é adulto ou criança. Crianças não
        criam famílias nem grupos até isso ser preenchido. Adultos aprovados também podem virar
        administradores.
      </p>
      <ul className="mt-3 space-y-2">
        {members.map((m) => (
          <li key={m.id} className="rounded-lg bg-[var(--panel-alt)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words text-sm font-medium text-[var(--text)]">
                {m.display_name}
                {m.id === user?.id && " (você)"}
                {m.username && family && (
                  <span className="ml-2 break-all font-mono text-xs font-normal text-[var(--muted)]">
                    {m.username}@{family.slug}
                  </span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {m.family_role === "admin" && <Badge>Admin</Badge>}
                <Badge variant={m.is_adult ? "default" : "warning"}>{m.is_adult ? "Adulto" : "Criança"}</Badge>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="date"
                defaultValue={m.birth_date ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={() => saveBirthDate(m.id)}
                disabled={savingId === m.id || !drafts[m.id]}
                className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Salvar
              </button>
              {m.is_adult && m.approval_status === "approved" && m.id !== user?.id && (
                m.family_role === "admin" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        disabled={savingId === m.id}
                        className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)] disabled:opacity-50"
                      >
                        Remover admin
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {m.display_name} deixará de poder aprovar membros, criar contas e gerenciar a família.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => toggleAdmin(m)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <button
                    onClick={() => toggleAdmin(m)}
                    disabled={savingId === m.id}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)] disabled:opacity-50"
                  >
                    Tornar admin
                  </button>
                )
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
