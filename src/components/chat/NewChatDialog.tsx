"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { useProfiles } from "@/hooks/useProfiles";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export function NewChatDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profiles = useProfiles();
  const { supabase } = useSupabase();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function startChat(otherId: string) {
    setBusyId(otherId);
    const { data, error } = await supabase.rpc("create_direct_conversation", { other_user_id: otherId });
    setBusyId(null);
    if (!error && data) {
      onClose();
      router.push(`/chat/${data}`);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova conversa">
      {profiles.length === 0 && (
        <p className="py-6 text-center text-sm text-[var(--muted)]">
          Ainda não há outros membros da família cadastrados.
        </p>
      )}
      <ul className="space-y-1">
        {profiles.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => startChat(p.id)}
              disabled={busyId === p.id}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
            >
              <Avatar name={p.display_name} src={p.avatar_url} />
              <span className="flex-1 font-medium text-[var(--text)]">{p.display_name}</span>
              {busyId === p.id && <Spinner size={18} />}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
