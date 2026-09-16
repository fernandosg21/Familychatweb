"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useConversations } from "@/hooks/useConversations";
import { usePresence } from "@/hooks/usePresence";
import { Avatar } from "@/components/ui/Avatar";
import { ConversationListItem } from "@/components/chat/ConversationListItem";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { NewGroupDialog } from "@/components/chat/NewGroupDialog";

export function Sidebar() {
  const { profile } = useSupabase();
  const { conversations, loading } = useConversations();
  const onlineIds = usePresence();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const hideOnMobile = pathname !== "/chat" && pathname.startsWith("/chat/");

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const name =
      c.type === "group"
        ? c.name || ""
        : c.participants.find((p) => p.user_id !== profile?.id)?.profile?.display_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className={`${hideOnMobile ? "hidden md:flex" : "flex"} h-full w-full flex-col border-r border-[var(--border)] bg-[var(--panel)] md:w-[380px] md:shrink-0`}>
      <header className="flex items-center justify-between bg-[var(--header)] px-4 py-2.5 text-white">
        <Link href="/settings">
          <Avatar name={profile?.display_name ?? "Eu"} src={profile?.avatar_url} size={38} />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setNewChatOpen(true)}
            className="rounded-full p-2 hover:bg-white/10"
            aria-label="Nova conversa"
            title="Nova conversa"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full p-2 hover:bg-white/10"
              aria-label="Mais opções"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="12" cy="19" r="1.6" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-40 mt-1 w-52 rounded-lg bg-[var(--panel)] py-1 text-[var(--text)] shadow-xl border border-[var(--border)]">
                  {profile?.is_adult && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setNewGroupOpen(true);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Novo grupo
                    </button>
                  )}
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Configurações
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="p-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar conversa"
          className="w-full rounded-lg bg-[var(--panel-alt)] px-3 py-2 text-sm text-[var(--text)] outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-center text-sm text-[var(--muted)]">Carregando...</p>}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-sm text-[var(--muted)]">Nenhuma conversa ainda.</p>
            <button
              onClick={() => setNewChatOpen(true)}
              className="text-sm font-medium text-[var(--accent)]"
            >
              Iniciar uma conversa
            </button>
          </div>
        )}
        {filtered.map((c) => {
          const other = c.participants.find((p) => p.user_id !== profile?.id);
          return (
            <ConversationListItem
              key={c.id}
              conversation={c}
              online={c.type === "direct" && !!other && onlineIds.has(other.user_id)}
            />
          );
        })}
      </div>

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} />
      <NewGroupDialog open={newGroupOpen} onClose={() => setNewGroupOpen(false)} />
    </div>
  );
}
