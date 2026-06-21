"use client";

import type { EmailMessageRow } from "@/lib/types/email";

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailMessageAttachments({
  messageId,
  attachments,
}: {
  messageId: string;
  attachments: EmailMessageRow["attachments"];
}) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((file, i) => {
        const index = file.index ?? i;
        const href = `/api/email/messages/attachment?messageId=${encodeURIComponent(messageId)}&index=${index}`;
        return (
          <a
            key={`${file.filename}-${index}`}
            href={href}
            download={file.filename}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-sky-800 dark:hover:bg-sky-950/30"
          >
            <span aria-hidden>📎</span>
            <span className="truncate">{file.filename}</span>
            {file.size ? (
              <span className="shrink-0 text-[10px] text-zinc-400">({formatSize(file.size)})</span>
            ) : null}
          </a>
        );
      })}
    </div>
  );
}
