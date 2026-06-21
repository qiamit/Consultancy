import type { EmailMessageRow } from "@/lib/types/email";

const SUBJECT_PREFIX_RE = /^\s*(re|fw|fwd|aw|sv|vs):\s*/i;

export function normalizeEmailSubject(subject: string | null | undefined): string {
  if (!subject?.trim()) return "";
  let s = subject.trim();
  while (SUBJECT_PREFIX_RE.test(s)) {
    s = s.replace(SUBJECT_PREFIX_RE, "").trim();
  }
  return s.toLowerCase();
}

export function subjectsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeEmailSubject(a);
  const nb = normalizeEmailSubject(b);
  return na.length > 0 && na === nb;
}

export function buildConversationThread(
  anchor: EmailMessageRow,
  pool: EmailMessageRow[],
): EmailMessageRow[] {
  const thread = pool.filter((m) => subjectsMatch(m.subject, anchor.subject));
  if (!thread.some((m) => m.id === anchor.id)) {
    thread.push(anchor);
  }
  return thread.sort(
    (a, b) =>
      new Date(a.email_date ?? 0).getTime() - new Date(b.email_date ?? 0).getTime(),
  );
}

export function threadCountForMessage(
  anchor: EmailMessageRow,
  pool: EmailMessageRow[],
): number {
  return buildConversationThread(anchor, pool).length;
}
