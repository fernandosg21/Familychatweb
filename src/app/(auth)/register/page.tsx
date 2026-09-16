"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/SupabaseProvider";

type Mode = "join" | "create";

export default function RegisterPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("join");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          displayName,
          email,
          password,
          mode,
          familyName: mode === "create" ? familyName : undefined,
          familyCode,
          birthDate: mode === "create" ? birthDate : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Não foi possível criar a conta.");
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);

      if (signInError) {
        setInfo("Conta criada! Faça login para continuar.");
        router.push("/login");
        return;
      }

      if (body.status === "pending") {
        setInfo("Conta criada! Assim que o administrador da família aprovar, você poderá conversar.");
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
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--panel-alt)] p-1">
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`rounded-md py-1.5 text-sm font-medium transition ${
            mode === "join" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
          }`}
        >
          Entrar numa família
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-md py-1.5 text-sm font-medium transition ${
            mode === "create" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
          }`}
        >
          Criar uma família
        </button>
      </div>

      {mode === "join" && (
        <p className="rounded-lg bg-[var(--panel-alt)] p-3 text-xs text-[var(--muted)]">
          Crianças também podem entrar assim — o administrador da família define depois quem é
          adulto ou criança na própria conta.
        </p>
      )}

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

      {mode === "create" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text)]">Nome da família</label>
            <input
              required
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Ex: Família Gonçalves"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text)]">Sua data de nascimento</label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Só adultos (18 anos ou mais) podem criar uma família.
            </p>
          </div>
        </>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">
          {mode === "create" ? "Crie um código de acesso da família" : "Código da família"}
        </label>
        <input
          required
          value={familyCode}
          onChange={(e) => setFamilyCode(e.target.value)}
          placeholder={mode === "create" ? "Só quem tiver esse código pode pedir entrada" : "Peça para um membro da família"}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        {mode === "join" && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            Depois de criar a conta, um administrador da família precisa aprovar sua entrada.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {info && <p className="text-sm text-[var(--accent)]">{info}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
      >
        {loading ? "Criando conta..." : mode === "create" ? "Criar família" : "Pedir para entrar"}
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
