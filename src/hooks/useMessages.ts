"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Message } from "@/lib/types";

// Além do canal de tempo real, busca de novo em intervalos curtos: garante
// que a conversa se atualiza sozinha mesmo se o push falhar por algum
// motivo do lado do Supabase, sem depender de um F5 manual.
const POLL_INTERVAL_MS = 6000;

export function useMessages(conversationId: string | null) {
  const { supabase, user } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const knownIds = useRef<Set<string>>(new Set());

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return null;
    const { data, error } = await supabase
      .from("messages")
      .select(
        "*, sender:profiles(id,display_name,avatar_url), attachments:message_attachments(*)"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error || !data) return null;
    return data as unknown as Message[];
  }, [conversationId, supabase]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const rows = await fetchMessages();
    if (rows) {
      knownIds.current = new Set(rows.map((m) => m.id));
      setMessages(rows);
    }
    setLoading(false);
  }, [fetchMessages]);

  // Igual a loadMessages, mas sem piscar o estado de carregamento — usada
  // pelo polling e pela recuperação do canal, que rodam em segundo plano.
  const silentRefresh = useCallback(async () => {
    const rows = await fetchMessages();
    if (rows) {
      knownIds.current = new Set(rows.map((m) => m.id));
      setMessages(rows);
    }
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial ao trocar de conversa
    loadMessages();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          if (knownIds.current.has(newMessage.id)) return;
          knownIds.current.add(newMessage.id);

          const { data: sender } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newMessage.sender_id)
            .single();

          setMessages((prev) => [...prev, { ...newMessage, sender: sender ?? undefined, attachments: [] }]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated, sender: m.sender, attachments: m.attachments } : m))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_attachments" },
        (payload) => {
          const attachment = payload.new as Message["attachments"] extends (infer A)[] | undefined
            ? A
            : never;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === (attachment as { message_id: string }).message_id
                ? { ...m, attachments: [...(m.attachments ?? []), attachment as NonNullable<Message["attachments"]>[number]] }
                : m
            )
          );
        }
      )
      .subscribe((status) => {
        // Se o canal cair (erro de rede, timeout, etc.), busca de novo em
        // vez de deixar a tela travada até um refresh manual.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") silentRefresh();
      });

    const pollId = setInterval(silentRefresh, POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [conversationId, supabase, user, loadMessages, silentRefresh]);

  // Ecoa a própria mensagem na hora do envio, sem esperar o canal de tempo
  // real ou o próximo polling — é o próprio remetente vendo o que acabou de
  // mandar, não depende de nada do lado do servidor.
  const addLocalMessage = useCallback((message: Message) => {
    if (knownIds.current.has(message.id)) return;
    knownIds.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  }, []);

  return { messages, loading, reload: loadMessages, addLocalMessage };
}
