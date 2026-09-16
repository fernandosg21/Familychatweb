export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-current border-t-transparent text-[var(--accent)]"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Carregando"
    />
  );
}
