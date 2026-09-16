import Image from "next/image";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const PALETTE = ["#00a884", "#7f66ff", "#ff8a65", "#4fc3f7", "#f06292", "#ffb300"];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({
  name,
  src,
  size = 40,
  online,
}: {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full text-white font-medium select-none"
          style={{ width: size, height: size, background: colorFor(name || "?"), fontSize: size * 0.4 }}
        >
          {initials(name || "?") || "?"}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-[var(--panel)] bg-[var(--accent)]"
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      )}
    </div>
  );
}
