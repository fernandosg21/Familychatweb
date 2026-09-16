"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "family-chat:install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS] = useState(
    () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
  );
  const [isStandalone] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true)
  );

  useEffect(() => {
    if (isStandalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS não dispara beforeinstallprompt: mostramos instruções mesmo assim.
    const timer = setTimeout(() => {
      if (isIOS) setVisible(true);
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, [isIOS, isStandalone]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (isStandalone || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 animate-in">
      <div className="flex items-start gap-3 rounded-xl bg-[var(--panel)] p-4 shadow-2xl border border-[var(--border)]">
        <Image src="/icons/icon-96.png" alt="Family Chat" width={48} height={48} className="rounded-xl" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text)]">Instalar o Family Chat</p>
          {isIOS ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Toque em <Share size={13} className="inline align-text-bottom" aria-hidden /> Compartilhar e depois em
              &quot;Adicionar à Tela de Início&quot;.
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Instale para abrir mais rápido e receber notificações em tempo real.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {!isIOS && (
              <button
                onClick={install}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-dark)]"
              >
                Instalar
              </button>
            )}
            <button
              onClick={dismiss}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
