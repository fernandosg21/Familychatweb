export function formatMessageTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatConversationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return formatMessageTime(iso);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";

  const diffDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (diffDays < 7) {
    return date.toLocaleDateString("pt-BR", { weekday: "long" });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function formatDaySeparator(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Hoje";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatLastSeen(iso: string) {
  const date = new Date(iso);
  const diffMinutes = (Date.now() - date.getTime()) / 60_000;
  if (diffMinutes < 2) return "online";
  if (diffMinutes < 60) return `visto há ${Math.round(diffMinutes)} min`;
  return `visto por último ${formatConversationTime(iso).toLowerCase()} às ${formatMessageTime(iso)}`;
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
