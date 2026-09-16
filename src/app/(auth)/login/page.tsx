"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Contas criadas pelo administrador para membros sem e-mail próprio usam
  // um e-mail sintético longo por baixo dos panos; para o login, aceita
  // também o formato curto "usuario@familia" e traduz para o e-mail real.
  async function resolveEmail(raw: string): Promise<string> {
    const trimmed = raw.trim();
    const at = trimmed.indexOf("@");
    if (at <= 0) return trimmed;
    const domainPart = trimmed.slice(at + 1);
    if (domainPart.includes(".")) return trimmed;
    const username = trimmed.slice(0, at);
    const { data } = await supabase.rpc("resolve_login_email", {
      p_username: username,
      p_family_slug: domainPart,
    });
    return typeof data === "string" && data ? data : trimmed;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const email = await resolveEmail(identifier);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Usuário/e-mail ou senha incorretos.");
      return;
    }
    router.push("/chat");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-[var(--panel)] p-6 shadow-lg">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">E-mail ou usuário</label>
        <input
          type="text"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="usuario@familia ou seu@email.com"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
          autoComplete="username"
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
      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
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
