"use client";

import { useMemo } from "react";
import {
  EMAIL_BODY_CONTENT_CLASS,
  cleanPlainEmailText,
  decodeHtmlEntities,
  htmlToPlainText,
  htmlWithInlineViewLinks,
  injectImageUrlsFromHtml,
  plainTextToHtmlWithViewLinks,
  sanitizeEmailHtmlForDisplay,
} from "@/lib/email/format-body";
import { MESSAGE_TEXT_SIZE_CLASS, type EmailTextSize } from "@/lib/email/preferences";

export function EmailMessageBody({
  bodyHtml,
  bodyText,
  textSize = "medium",
}: {
  bodyHtml?: string | null;
  bodyText?: string | null;
  textSize?: EmailTextSize;
}) {
  const sanitizedHtml = useMemo(
    () => (bodyHtml?.trim() ? sanitizeEmailHtmlForDisplay(bodyHtml) : ""),
    [bodyHtml],
  );

  const plainRaw = useMemo(() => {
    const fromText = bodyText?.trim() ? decodeHtmlEntities(bodyText.trim()) : "";
    let raw = fromText || (sanitizedHtml ? htmlToPlainText(sanitizedHtml) : "");
    raw = injectImageUrlsFromHtml(raw, sanitizedHtml);
    return cleanPlainEmailText(raw);
  }, [bodyText, sanitizedHtml]);

  const plainHtml = useMemo(
    () => (plainRaw ? plainTextToHtmlWithViewLinks(plainRaw) : ""),
    [plainRaw],
  );

  const formattedHtml = useMemo(
    () => (sanitizedHtml ? htmlWithInlineViewLinks(sanitizedHtml) : ""),
    [sanitizedHtml],
  );

  const contentHtml = plainHtml || formattedHtml;

  if (!contentHtml) {
    return <p className="text-sm text-zinc-500">No message content.</p>;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div
        className={`${EMAIL_BODY_CONTENT_CLASS} ${MESSAGE_TEXT_SIZE_CLASS[textSize]} whitespace-pre-wrap font-sans`}
        lang="auto"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
}
