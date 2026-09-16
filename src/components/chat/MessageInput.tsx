"use client";

import { useRef, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { sendFileMessage, sendLocationMessage, sendTextMessage } from "@/lib/messages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { AttachmentMenu } from "@/components/chat/AttachmentMenu";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import type { Message } from "@/lib/types";

export function MessageInput({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: (message: Message) => void;
}) {
  const { supabase, user } = useSupabase();
  const { notifyTyping } = useTypingIndicator(conversationId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingRef = useRef(0);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingRef.current > 1500) {
      notifyTyping();
      lastTypingRef.current = now;
    }
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    try {
      const message = await sendTextMessage(supabase, conversationId, user.id, trimmed);
      onSent(message);
    } finally {
      setSending(false);
    }
  }

  async function handleFiles(files: FileList) {
    if (!user) return;
    setSending(true);
    try {
      for (const file of Array.from(files)) {
        const message = await sendFileMessage(supabase, conversationId, user.id, file);
        onSent(message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function handleLocation() {
    if (!user || !("geolocation" in navigator)) return;
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const message = await sendLocationMessage(
            supabase,
            conversationId,
            user.id,
            pos.coords.latitude,
            pos.coords.longitude
          );
          onSent(message);
        } finally {
          setLocationBusy(false);
        }
      },
      () => setLocationBusy(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleAudioSend(file: File) {
    setRecording(false);
    if (!user) return;
    setSending(true);
    try {
      const message = await sendFileMessage(supabase, conversationId, user.id, file);
      onSent(message);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-[var(--border)] bg-[var(--panel-alt)] p-2 sm:p-3">
      {recording ? (
        <AudioRecorder onSend={handleAudioSend} onCancel={() => setRecording(false)} />
      ) : (
        <>
          <AttachmentMenu onFiles={handleFiles} onLocation={handleLocation} />

          <div className="flex flex-1 items-end rounded-2xl bg-[var(--panel)] px-3 py-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={locationBusy ? "Obtendo localização..." : "Escreva uma mensagem"}
              className="max-h-32 w-full resize-none bg-transparent text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>

          {text.trim() ? (
            <button
              onClick={handleSend}
              disabled={sending}
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-60"
              aria-label="Enviar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-17l19 8.5-19 8.5Zm2-2.9 12.85-5.6L5 6.4v4.2l7.5 1.4-7.5 1.4v4.2Z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setRecording(true)}
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Gravar áudio"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
