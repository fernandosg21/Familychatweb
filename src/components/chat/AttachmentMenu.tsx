"use client";

import { useRef, useState } from "react";
import { Camera, FileText, Image as ImageIcon, MapPin, Paperclip } from "lucide-react";

interface AttachmentMenuProps {
  onFiles: (files: FileList) => void;
  onLocation: () => void;
}

function MenuIcon({ children, label, color }: { children: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex w-16 flex-col items-center gap-1.5">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white [&>svg]:size-5"
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
        <Paperclip size={22} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="animate-in absolute bottom-14 left-0 z-40 flex w-max max-w-[calc(100vw-2rem)] flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl">
            <button onClick={() => pick(photoInput)} type="button">
              <MenuIcon label="Galeria" color="#7f66ff">
                <ImageIcon />
              </MenuIcon>
            </button>
            <button onClick={() => pick(cameraInput)} type="button">
              <MenuIcon label="Câmera" color="#ff5f5f">
                <Camera />
              </MenuIcon>
            </button>
            <button onClick={() => pick(documentInput)} type="button">
              <MenuIcon label="Documento" color="#5f8fff">
                <FileText />
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
                <MapPin />
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
