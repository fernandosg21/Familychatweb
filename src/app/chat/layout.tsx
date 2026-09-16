import { Sidebar } from "@/components/chat/Sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
