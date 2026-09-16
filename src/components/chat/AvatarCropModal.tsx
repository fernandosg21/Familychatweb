"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cropImageToSquare } from "@/lib/image";

const VIEWPORT_SIZE = 260;

export function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const baseScale = useMemo(() => {
    if (!natural.width || !natural.height) return 0;
    return VIEWPORT_SIZE / Math.min(natural.width, natural.height);
  }, [natural]);

  const scale = baseScale * zoom;
  const displayWidth = natural.width * scale;
  const displayHeight = natural.height * scale;

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta a prévia ao fechar o modal
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => {
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clampOffset(x: number, y: number, currentScale: number) {
    const w = natural.width * currentScale;
    const h = natural.height * currentScale;
    const minX = Math.min(0, VIEWPORT_SIZE - w);
    const minY = Math.min(0, VIEWPORT_SIZE - h);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  }

  function handleZoomChange(value: number) {
    setZoom(value);
    setOffset((prev) => clampOffset(prev.x, prev.y, baseScale * value));
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.originX + dx, dragRef.current.originY + dy, scale));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  async function handleConfirm() {
    if (!file || !natural.width) return;
    setSaving(true);
    try {
      const cropped = await cropImageToSquare(file, { ...offset, scale, viewportSize: VIEWPORT_SIZE });
      onConfirm(cropped);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!file} onClose={onCancel} title="Ajustar foto de perfil">
      {imageUrl && (
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative touch-none overflow-hidden rounded-full bg-black/10"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- preview local antes do upload, não vem do Supabase Storage */}
            <img
              src={imageUrl}
              alt="Pré-visualização para recorte"
              draggable={false}
              className="absolute select-none"
              style={{
                left: offset.x,
                top: offset.y,
                width: displayWidth || undefined,
                height: displayHeight || undefined,
                maxWidth: "none",
              }}
            />
          </div>
          <p className="text-center text-xs text-[var(--muted)]">Arraste para posicionar e use o controle para dar zoom.</p>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="w-full max-w-[260px] accent-[var(--accent)]"
            aria-label="Zoom"
          />
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--text)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Usar foto"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
