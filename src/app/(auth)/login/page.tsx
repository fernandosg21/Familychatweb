"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    router.push("/chat");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-[var(--panel)] p-6 shadow-lg">
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Ainda não tem conta?{" "}
        <Link href="/register" className="font-medium text-[var(--accent)]">
          Criar conta com convite
        </Link>
      </p>
    </form>
  );
}
