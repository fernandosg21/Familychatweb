import { Sidebar } from "@/components/chat/Sidebar";
import { ApprovalGate } from "@/components/chat/ApprovalGate";
import { PresenceProvider } from "@/components/providers/PresenceProvider";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApprovalGate>
      <PresenceProvider>
        <div className="flex h-dvh w-full overflow-hidden">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </div>
      </PresenceProvider>
    </ApprovalGate>
  );
}
