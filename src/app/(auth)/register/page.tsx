"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export default function RegisterPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ displayName, email, password, inviteCode }),
        }
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Não foi possível criar a conta.");
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signInError) {
        setError("Conta criada! Faça login para continuar.");
        router.push("/login");
        return;
      }
      router.push("/chat");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-[var(--panel)] p-6 shadow-lg">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">Seu nome</label>
        <input
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">Senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">Código de convite da família</label>
        <input
          required
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 uppercase text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-[var(--accent)]">
          Entrar
        </Link>
      </p>
    </form>
  );
}
