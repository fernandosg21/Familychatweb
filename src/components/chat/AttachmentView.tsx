"use client";

import { useSignedUrl } from "@/hooks/useSignedUrl";
import { formatDuration, formatFileSize } from "@/lib/format";
import type { MessageAttachment } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";

function DocumentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function AttachmentView({ attachment, caption }: { attachment: MessageAttachment; caption?: string | null }) {
  const url = useSignedUrl(attachment.storage_path);

  if (attachment.mime_type.startsWith("image/")) {
    return (
      <div className="overflow-hidden rounded-lg">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={caption || attachment.file_name || "Imagem"}
            className="max-h-80 w-full max-w-xs object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-48 w-64 items-center justify-center bg-black/5">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  if (attachment.mime_type.startsWith("video/")) {
    return (
      <div className="overflow-hidden rounded-lg">
        {url ? (
          <video src={url} controls className="max-h-80 w-full max-w-xs" preload="metadata" />
        ) : (
          <div className="flex h-48 w-64 items-center justify-center bg-black/5">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  if (attachment.mime_type.startsWith("audio/")) {
    return (
      <div className="flex w-64 flex-col gap-1">
        {url ? (
          <audio src={url} controls className="w-full" preload="metadata" />
        ) : (
          <div className="flex h-10 items-center justify-center">
            <Spinner size={18} />
          </div>
        )}
        <span className="text-xs text-[var(--muted)]">{formatDuration(attachment.duration_seconds)}</span>
      </div>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      download={attachment.file_name ?? undefined}
      className="flex w-64 items-center gap-3 rounded-lg bg-black/5 p-3 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="text-[var(--accent)]">
        <DocumentIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.file_name || "Documento"}</p>
        <p className="text-xs text-[var(--muted)]">{formatFileSize(attachment.size_bytes)}</p>
      </div>
    </a>
  );
}
