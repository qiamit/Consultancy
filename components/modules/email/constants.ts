import type { EmailFolderKey, EmailProvider } from "@/lib/types/email";

export const EMAIL_FOLDERS: EmailFolderKey[] = [
  "inbox",
  "sent",
  "drafts",
  "outbox",
  "archive",
  "junk",
  "trash",
  "starred",
];

export const PROVIDER_OPTIONS: { value: EmailProvider; label: string }[] = [
  { value: "gmail", label: "Gmail" },
  { value: "outlook", label: "Outlook / Microsoft 365" },
  { value: "hotmail", label: "Hotmail / Live" },
  { value: "zoho", label: "Zoho Mail" },
  { value: "yahoo", label: "Yahoo Mail" },
  { value: "custom", label: "Other (IMAP/SMTP)" },
];

export function formatEmailDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function parseAddressList(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
