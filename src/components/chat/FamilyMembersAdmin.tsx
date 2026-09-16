"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

interface FamilyMember {
  id: string;
  display_name: string;
  birth_date: string | null;
  is_adult: boolean;
  family_role: "admin" | "member";
  approval_status: "pending" | "approved";
}

export function FamilyMembersAdmin() {
  const { supabase, profile, user } = useSupabase();
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
  }, [profile?.family_role, load]);

  if (profile?.family_role !== "admin") return null;

  async function saveBirthDate(memberId: string) {
    const value = drafts[memberId];
    if (!value) return;
    setSavingId(memberId);
    await supabase.from("profiles").update({ birth_date: value }).eq("id", memberId);
    setSavingId(null);
    load();
  }

  return (
    <div className="mt-8 rounded-lg border border-[var(--border)] p-4">
      <p className="font-medium text-[var(--text)]">Membros da família</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Defina a data de nascimento de cada um para marcar quem é adulto ou criança. Crianças não
        criam famílias nem grupos até isso ser preenchido.
      </p>
      <ul className="mt-3 space-y-2">
        {members.map((m) => (
          <li key={m.id} className="rounded-lg bg-[var(--panel-alt)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--text)]">
                {m.display_name}
                {m.id === user?.id && " (você)"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.is_adult ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-orange-500/15 text-orange-500"
                }`}
              >
                {m.is_adult ? "Adulto" : "Criança"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
