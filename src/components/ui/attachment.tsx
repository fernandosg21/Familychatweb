import * as React from "react";

import { cn } from "@/lib/utils";

function Attachment({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="attachment"
      className={cn(
        "flex w-64 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-3 transition-colors hover:bg-black/5 dark:hover:bg-white/10",
        className
      )}
      {...props}
    />
  );
}

function AttachmentIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-icon"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] [&>svg]:size-5",
        className
      )}
      {...props}
    />
  );
}

function AttachmentContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="attachment-content" className={cn("min-w-0 flex-1", className)} {...props} />;
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="attachment-title"
      className={cn("truncate text-sm font-medium text-[var(--text)]", className)}
      {...props}
    />
  );
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="attachment-description" className={cn("text-xs text-[var(--muted)]", className)} {...props} />;
}

export { Attachment, AttachmentIcon, AttachmentContent, AttachmentTitle, AttachmentDescription };
