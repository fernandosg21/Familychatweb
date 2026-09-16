"use client";

import { FileText } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { formatDuration, formatFileSize } from "@/lib/format";
import type { MessageAttachment } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentIcon, AttachmentTitle } from "@/components/ui/attachment";

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
    <Attachment href={url ?? undefined} target="_blank" rel="noreferrer" download={attachment.file_name ?? undefined}>
      <AttachmentIcon>
        <FileText />
      </AttachmentIcon>
      <AttachmentContent>
        <AttachmentTitle>{attachment.file_name || "Documento"}</AttachmentTitle>
        <AttachmentDescription>{formatFileSize(attachment.size_bytes)}</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  );
}
