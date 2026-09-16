"use client";

import { useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function CreateMemberAccount() {
  const { supabase, profile } = useSupabase();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string; name: string } | null>(null);

  if (profile?.family_role !== "admin") return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-family-member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ displayName, password, birthDate: birthDate || undefined }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error || "Não foi possível criar a conta.");
      return;
    }

    setCreated({ email: body.email, password, name: displayName });
    setDisplayName("");
    setPassword(generatePassword());
    setBirthDate("");
  }

  return (
    <div className="mt-8 rounded-lg border border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-[var(--text)]">Criar conta para um membro</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-[var(--accent)]"
        >
          {open ? "Fechar" : "Nova conta"}
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Útil para crianças sem e-mail próprio: você cria a conta na hora, já aprovada, e entrega o
        login pronto para o aparelho dela.
      </p>

      {open && (
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text)]">Nome</label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text)]">Data de nascimento (opcional)</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text)]">Senha</label>
            <div className="flex gap-2">
              <input
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="shrink-0 rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[var(--text)]"
              >
                Gerar
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>
      )}

      {created && (
        <div className="mt-4 rounded-lg bg-[var(--accent)]/10 p-3 text-sm">
          <p className="font-medium text-[var(--text)]">Conta de {created.name} criada!</p>
          <p className="mt-1 text-[var(--muted)]">Anote e configure no aparelho dela:</p>
          <p className="mt-1 font-mono text-xs text-[var(--text)]">login: {created.email}</p>
          <p className="font-mono text-xs text-[var(--text)]">senha: {created.password}</p>
        </div>
      )}
    </div>
  );
}
