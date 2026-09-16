import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/icons/icon-96.png"
            alt="Family Chat"
            width={80}
            height={80}
            className="rounded-2xl shadow-lg"
            priority
          />
          <h1 className="text-2xl font-semibold text-[var(--text)]">Family Chat</h1>
          <p className="text-sm text-[var(--muted)]">O chat privado da nossa família</p>
        </div>
        {children}
      </div>
    </div>
  );
}
