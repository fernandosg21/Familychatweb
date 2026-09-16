import { MapPin } from "lucide-react";
import type { LocationMetadata } from "@/lib/types";

export function LocationCard({ location }: { location: LocationMetadata }) {
  const { lat, lng } = location;
  const delta = 0.01;
  const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat}%2C${lng}&layer=mapnik`;
  const openUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <a
      href={openUrl}
      target="_blank"
      rel="noreferrer"
      className="block w-64 overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
    >
      <iframe
        src={embedSrc}
        className="pointer-events-none h-36 w-full"
        loading="lazy"
        title="Localização compartilhada"
      />
      <div className="flex items-center gap-2 bg-black/5 px-3 py-2 dark:bg-white/5">
        <MapPin size={16} className="text-[var(--accent)]" />
        <span className="text-sm font-medium">{location.label || "Localização atual"}</span>
      </div>
    </a>
  );
}
