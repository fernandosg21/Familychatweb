"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Avatar } from "@/components/ui/Avatar";
import { subscribeToPush } from "@/lib/push";
import { useMyFamily } from "@/hooks/useMyFamily";
import { PendingApprovals } from "@/components/chat/PendingApprovals";
import { FamilyMembersAdmin } from "@/components/chat/FamilyMembersAdmin";
import { CreateMemberAccount } from "@/components/chat/CreateMemberAccount";
import { signOutWithChildAlert } from "@/lib/auth";

export default function SettingsPage() {
  const { supabase, user, profile, refreshProfile } = useSupabase();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [status, setStatus] = useState(profile?.status ?? "");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const avatarInput = useRef<HTMLInputElement>(null);
  const { family } = useMyFamily();

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || profile?.display_name, status: status.trim() })
      .eq("id", user.id);
    await refreshProfile();
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    await refreshProfile();
  }

  async function changePassword() {
    setPasswordMessage(null);
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "A senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordMessage({ type: "error", text: "Não foi possível trocar a senha. Tente novamente." });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage({ type: "ok", text: "Senha alterada com sucesso." });
  }

  async function enableNotifications() {
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission === "granted") await subscribeToPush();
  }

  async function logout() {
    await signOutWithChildAlert(supabase, profile);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-[var(--panel)]">
      <header className="flex items-center gap-3 bg-[var(--header)] px-4 py-3 text-white">
        <Link href="/chat" className="rounded-full p-1 hover:bg-white/10" aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-medium">Configurações</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <button onClick={() => avatarInput.current?.click()} className="relative">
            <Avatar name={profile?.display_name ?? "Eu"} src={profile?.avatar_url} size={96} />
            <span className="absolute bottom-0 right-0 rounded-full bg-[var(--accent)] p-1.5 text-white text-xs">
              ✏️
            </span>
          </button>
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
          <p className="text-sm text-[var(--muted)]">
            {profile?.username && family ? `${profile.username}@${family.slug}` : user?.email}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text)]">Nome</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text)]">Recado</label>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="Disponível"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>

        <div className="mt-8 rounded-lg border border-[var(--border)] p-4">
          <p className="font-medium text-[var(--text)]">Notificações push</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Receba um alerta em tempo real quando chegar uma nova mensagem.
          </p>
          {notifStatus === "granted" && <p className="mt-2 text-sm text-[var(--accent)]">Ativadas ✓</p>}
          {notifStatus === "denied" && (
            <p className="mt-2 text-sm text-red-500">
              Bloqueadas no navegador. Ative nas configurações do site.
            </p>
          )}
          {notifStatus !== "granted" && notifStatus !== "unsupported" && (
            <button
              onClick={enableNotifications}
              className="mt-3 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-dark)]"
            >
              Ativar notificações
            </button>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-[var(--border)] p-4">
          <p className="font-medium text-[var(--text)]">Trocar senha</p>
          <div className="mt-3 space-y-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nova senha"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.type === "ok" ? "text-[var(--accent)]" : "text-red-500"}`}>
                {passwordMessage.text}
              </p>
            )}
            <button
              onClick={changePassword}
              disabled={passwordSaving || !newPassword || !confirmPassword}
              className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
            >
              {passwordSaving ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        </div>

        {family && (
          <div className="mt-8 rounded-lg border border-[var(--border)] p-4">
            <p className="font-medium text-[var(--text)]">{family.name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {family.member_count} {family.member_count === 1 ? "membro" : "membros"}
              {profile?.family_role === "admin" && " · você é administrador(a)"}
            </p>
          </div>
        )}

        <PendingApprovals />
        <CreateMemberAccount />
        <FamilyMembersAdmin />

        <button
          onClick={logout}
          className="mt-8 w-full rounded-lg border border-red-500 py-2.5 font-medium text-red-500 hover:bg-red-500/10"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
