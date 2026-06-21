import type { EmailFolderKey, EmailProvider } from "@/lib/types/email";

export type ProviderPreset = {
  label: string;
  imap: { host: string; port: number; secure: boolean };
  smtp: { host: string; port: number; secure: boolean };
  folders: Record<EmailFolderKey, string>;
};

export const EMAIL_PROVIDER_PRESETS: Record<Exclude<EmailProvider, "custom">, ProviderPreset> = {
  gmail: {
    label: "Gmail",
    imap: { host: "imap.gmail.com", port: 993, secure: true },
    smtp: { host: "smtp.gmail.com", port: 587, secure: false },
    folders: {
      inbox: "INBOX",
      sent: "[Gmail]/Sent Mail",
      drafts: "[Gmail]/Drafts",
      trash: "[Gmail]/Trash",
      junk: "[Gmail]/Spam",
      archive: "[Gmail]/All Mail",
      outbox: "[Gmail]/Outbox",
      starred: "INBOX",
    },
  },
  outlook: {
    label: "Outlook / Microsoft 365",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    folders: {
      inbox: "INBOX",
      sent: "Sent",
      drafts: "Drafts",
      trash: "Deleted",
      junk: "Junk Email",
      archive: "Archive",
      outbox: "Outbox",
      starred: "INBOX",
    },
  },
  hotmail: {
    label: "Hotmail / Live",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    folders: {
      inbox: "INBOX",
      sent: "Sent",
      drafts: "Drafts",
      trash: "Deleted",
      junk: "Junk Email",
      archive: "Archive",
      outbox: "Outbox",
      starred: "INBOX",
    },
  },
  zoho: {
    label: "Zoho Mail",
    imap: { host: "imappro.zoho.in", port: 993, secure: true },
    smtp: { host: "smtppro.zoho.in", port: 587, secure: false },
    folders: {
      inbox: "INBOX",
      sent: "Sent",
      drafts: "Drafts",
      trash: "Trash",
      junk: "Spam",
      archive: "Archive",
      outbox: "Outbox",
      starred: "INBOX",
    },
  },
  yahoo: {
    label: "Yahoo Mail",
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 587, secure: false },
    folders: {
      inbox: "INBOX",
      sent: "Sent",
      drafts: "Draft",
      trash: "Trash",
      junk: "Bulk Mail",
      archive: "Archive",
      outbox: "Outbox",
      starred: "INBOX",
    },
  },
};

export const FOLDER_LABELS: Record<EmailFolderKey, string> = {
  inbox: "Inbox",
  sent: "Sent Items",
  drafts: "Drafts",
  trash: "Deleted Items",
  junk: "Junk Email",
  archive: "Archive",
  outbox: "Outbox",
  starred: "Starred",
};

export function resolveImapFolder(
  provider: EmailProvider,
  folderKey: EmailFolderKey,
  customImapHost?: string | null,
): string {
  if (folderKey === "starred") return "INBOX";
  if (provider === "custom") {
    const defaults: Record<EmailFolderKey, string> = {
      inbox: "INBOX",
      sent: "Sent",
      drafts: "Drafts",
      trash: "Trash",
      junk: "Junk",
      archive: "Archive",
      outbox: "Outbox",
      starred: "INBOX",
    };
    return defaults[folderKey];
  }
  return EMAIL_PROVIDER_PRESETS[provider].folders[folderKey];
}

export function applyProviderPreset(
  provider: EmailProvider,
  overrides?: Partial<{
    imap_host: string;
    smtp_host: string;
    imap_port: number;
    smtp_port: number;
  }>,
) {
  if (provider === "custom") {
    return {
      imap_host: overrides?.imap_host ?? "",
      imap_port: overrides?.imap_port ?? 993,
      imap_secure: true,
      smtp_host: overrides?.smtp_host ?? "",
      smtp_port: overrides?.smtp_port ?? 587,
      smtp_secure: false,
    };
  }
  const preset = EMAIL_PROVIDER_PRESETS[provider];
  return {
    imap_host: preset.imap.host,
    imap_port: preset.imap.port,
    imap_secure: preset.imap.secure,
    smtp_host: preset.smtp.host,
    smtp_port: preset.smtp.port,
    smtp_secure: preset.smtp.secure,
  };
}
