import Image from "next/image";

export default function ChatEmptyPage() {
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-4 bg-[var(--panel-alt)] p-8 text-center md:flex">
      <Image
        src="/icons/icon-96.png"
        alt="Family Chat"
        width={96}
        height={96}
        className="rounded-2xl opacity-90"
      />
      <h2 className="text-xl font-light text-[var(--text)]">Family Chat</h2>
      <p className="max-w-xs text-sm text-[var(--muted)]">
        Selecione uma conversa para começar a trocar mensagens com sua família.
      </p>
    </div>
  );
}
