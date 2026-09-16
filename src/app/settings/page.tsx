"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, LogOut, Pencil, ShieldAlert } from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Avatar } from "@/components/ui/Avatar";
import { subscribeToPush } from "@/lib/push";
import { useMyFamily } from "@/hooks/useMyFamily";
import { PendingApprovals } from "@/components/chat/PendingApprovals";
import { FamilyMembersAdmin } from "@/components/chat/FamilyMembersAdmin";
import { CreateMemberAccount } from "@/components/chat/CreateMemberAccount";
import { AvatarCropModal } from "@/components/chat/AvatarCropModal";
import { signOutWithChildAlert } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function SettingsPage() {
  const { supabase, user, profile, refreshProfile } = useSupabase();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  // Começa igual no servidor e no primeiro render do cliente ("unsupported")
  // para não causar erro de hidratação; o valor real só existe no navegador,
  // então é lido depois, em useEffect.
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported">("unsupported");
  const avatarInput = useRef<HTMLInputElement>(null);
  const { family } = useMyFamily();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê API só disponível no navegador
    if ("Notification" in window) setNotifStatus(Notification.permission);
  }, []);

  // O perfil chega de forma assíncrona depois do primeiro render (o hook
  // useState acima só olha profile uma vez, no mount, quando ainda é null).
  // Preenche os campos assim que o perfil carregar, só na primeira vez —
  // usar profile?.id como dependência evita sobrescrever o que a pessoa
  // estiver digitando quando o perfil é apenas atualizado (ex: após salvar).
  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o perfil assim que ele carrega
    setDisplayName(profile.display_name ?? "");
    setStatus(profile.status ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);

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
    setAvatarSaving(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    setAvatarSaving(false);
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
          <ChevronLeft size={22} />
        </Link>
        <h1 className="font-medium">Configurações</h1>
      </header>

      <div className="flex-1 overflow-x-hidden overflow-y-auto p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <button
            onClick={() => avatarInput.current?.click()}
            disabled={avatarSaving}
            className="relative disabled:opacity-60"
          >
            <Avatar name={profile?.display_name ?? "Eu"} src={profile?.avatar_url} size={96} />
            <span className="absolute bottom-0 right-0 flex rounded-full bg-[var(--accent)] p-1.5 text-white">
              <Pencil size={14} />
            </span>
          </button>
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAvatarFile(file);
              e.target.value = "";
            }}
          />
          <AvatarCropModal
            file={avatarFile}
            onCancel={() => setAvatarFile(null)}
            onConfirm={(cropped) => {
              setAvatarFile(null);
              uploadAvatar(cropped);
            }}
          />
          <p className="max-w-full break-all text-center text-sm text-[var(--muted)]">
            {profile?.username && family ? `${profile.username}@${family.slug}` : user?.email}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text)]">Nome</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="off"
              name="display-name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text)]">Recado</label>
            <input
              autoComplete="off"
              name="status-message"
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
          {notifStatus === "granted" && (
            <Badge className="mt-2" variant="default">
              Ativadas
            </Badge>
          )}
          {notifStatus === "denied" && (
            <Alert variant="destructive" className="mt-2">
              <ShieldAlert />
              <AlertDescription>Bloqueadas no navegador. Ative nas configurações do site.</AlertDescription>
            </Alert>
          )}
          {notifStatus !== "granted" && notifStatus !== "unsupported" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text)]">
              <Checkbox checked={false} onCheckedChange={() => enableNotifications()} />
              Ativar notificações
            </label>
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
              <Alert variant={passwordMessage.type === "ok" ? "success" : "destructive"}>
                <AlertDescription>{passwordMessage.text}</AlertDescription>
              </Alert>
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500 py-2.5 font-medium text-red-500 hover:bg-red-500/10">
              <LogOut size={18} />
              Sair da conta
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Você vai precisar entrar de novo com seu login e senha para voltar a usar o app neste aparelho.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={logout}>
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
