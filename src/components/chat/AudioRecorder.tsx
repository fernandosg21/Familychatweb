"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { formatDuration } from "@/lib/format";

export function AudioRecorder({
  onSend,
  onCancel,
}: {
  onSend: (file: File) => void;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (cancelledRef.current) return;
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
          onSend(file);
        };

        recorder.start();
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      })
      .catch(() => {
        onCancel();
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAndSend() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function cancel() {
    cancelledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  }

  return (
    <div className="flex flex-1 items-center gap-3 px-2">
      <button
        onClick={cancel}
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full text-red-500 hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Cancelar gravação"
      >
        <Trash2 size={20} />
      </button>
      <div className="flex flex-1 items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        <span className="text-sm text-[var(--text)]">Gravando {formatDuration(seconds)}</span>
      </div>
      <button
        onClick={stopAndSend}
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white"
        aria-label="Enviar áudio"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
