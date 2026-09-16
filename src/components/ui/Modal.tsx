"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-lg bg-[var(--panel)] shadow-xl animate-in fade-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-base font-medium">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
