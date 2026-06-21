"use client";

import type { EmailMessageRow } from "@/lib/types/email";
import type { EmailTextSize } from "@/lib/email/preferences";
import { formatEmailDate } from "./constants";
import { EmailMessageBody } from "./email-message-body";
import { EmailMessageAttachments } from "./email-message-attachments";

function folderLabel(folder: string): string {
  const f = folder.toUpperCase();
  if (f.includes("INBOX")) return "Inbox";
  if (f.includes("SENT")) return "Sent";
  if (f.includes("DRAFT")) return "Drafts";
  if (f.includes("TRASH") || f.includes("DELETED")) return "Trash";
  if (f.includes("JUNK") || f.includes("SPAM")) return "Junk";
  if (f.includes("ARCHIVE")) return "Archive";
  return folder;
}

export function EmailConversationView({
  thread,
  activeEmail,
  selectedId,
  textSize,
  loadingBodyId,
  bodyLoadError,
  onRetryBody,
}: {
  thread: EmailMessageRow[];
  activeEmail: string | null;
  selectedId: string | null;
  textSize: EmailTextSize;
  loadingBodyId: string | null;
  bodyLoadError: { id: string; message: string } | null;
  onRetryBody: (messageId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {thread.map((msg) => {
        const isOutgoing =
          activeEmail &&
          msg.from_address?.toLowerCase() === activeEmail.toLowerCase();
        const isSelected = msg.id === selectedId;

        return (
          <article
            key={msg.id}
            className={`rounded-xl border p-4 ${
              isSelected
                ? "border-sky-300 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60"
            }`}
          >
            <header className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isOutgoing
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {isOutgoing ? "Sent" : "Received"}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {folderLabel(msg.folder)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {msg.from_name || msg.from_address || "Unknown sender"}
                </p>
                <p className="text-xs text-zinc-500">
                  To: {(msg.to_addresses ?? []).map((a) => a.address).join(", ") || "—"}
                </p>
              </div>
              <time className="shrink-0 text-xs text-zinc-500">
                {formatEmailDate(msg.email_date)}
              </time>
            </header>

            {loadingBodyId === msg.id ? (
              <p className="text-sm text-zinc-500">Loading message…</p>
            ) : bodyLoadError?.id === msg.id ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600 dark:text-red-400">{bodyLoadError.message}</p>
                <button
                  type="button"
                  onClick={() => onRetryBody(msg.id)}
                  className="text-xs text-sky-600 hover:underline dark:text-sky-400"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <EmailMessageBody
                  textSize={textSize}
                  bodyHtml={msg.body_html}
                  bodyText={msg.body_text ?? msg.snippet}
                />
                <EmailMessageAttachments messageId={msg.id} attachments={msg.attachments} />
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
