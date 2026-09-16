"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { useProfiles } from "@/hooks/useProfiles";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export function NewGroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profiles = useProfiles();
  const { supabase } = useSupabase();
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createGroup() {
    if (!name.trim() || selected.size === 0) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_group_conversation", {
      group_name: name.trim(),
      member_ids: Array.from(selected),
    });
    setBusy(false);
    if (!error && data) {
      onClose();
      setName("");
      setSelected(new Set());
      router.push(`/chat/${data}`);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo grupo">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do grupo"
        className="mb-4 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
      />
      <p className="mb-2 text-xs font-medium uppercase text-[var(--muted)]">Participantes</p>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {profiles.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => toggle(p.id)}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
              type="button"
            >
              <Avatar name={p.display_name} src={p.avatar_url} />
              <span className="flex-1 font-medium text-[var(--text)]">{p.display_name}</span>
              <input
                type="checkbox"
                readOnly
                checked={selected.has(p.id)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={createGroup}
        disabled={busy || !name.trim() || selected.size === 0}
        className="mt-4 w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:bg-[var(--accent-dark)] disabled:opacity-50"
      >
        {busy ? "Criando..." : "Criar grupo"}
      </button>
    </Modal>
  );
}
