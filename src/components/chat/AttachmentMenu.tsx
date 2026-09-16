"use client";

import { useRef, useState } from "react";

interface AttachmentMenuProps {
  onFiles: (files: FileList) => void;
  onLocation: () => void;
}

function MenuIcon({ children, label, color }: { children: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex w-16 flex-col items-center gap-1.5">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl text-white"
        style={{ background: color }}
      >
        {children}
      </div>
      <span className="whitespace-nowrap text-xs text-[var(--text)]">{label}</span>
    </div>
  );
}

export function AttachmentMenu({ onFiles, onLocation }: AttachmentMenuProps) {
  const [open, setOpen] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  function pick(ref: React.RefObject<HTMLInputElement | null>) {
    setOpen(false);
    ref.current?.click();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Anexar"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.83 18.42a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="animate-in absolute bottom-14 left-0 z-40 flex w-max max-w-[calc(100vw-2rem)] flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl">
            <button onClick={() => pick(photoInput)} type="button">
              <MenuIcon label="Galeria" color="#7f66ff">
                🖼️
              </MenuIcon>
            </button>
            <button onClick={() => pick(cameraInput)} type="button">
              <MenuIcon label="Câmera" color="#ff5f5f">
                📷
              </MenuIcon>
            </button>
            <button onClick={() => pick(documentInput)} type="button">
              <MenuIcon label="Documento" color="#5f8fff">
                📄
              </MenuIcon>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onLocation();
              }}
              type="button"
            >
              <MenuIcon label="Localização" color="#00a884">
                📍
              </MenuIcon>
            </button>
          </div>
        </>
      )}

      <input
        ref={photoInput}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      <input
        ref={documentInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}
