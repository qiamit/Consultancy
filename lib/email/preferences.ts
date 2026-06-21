export type EmailTextSize = "small" | "medium" | "large";
export type EmailReadFilter = "all" | "unread" | "read" | "starred";
export type SyncIntervalMinutes = 1 | 2 | 5;
export type MessagesPerPage = 10 | 20 | 50;

export interface EmailPreferences {
  autoSync: boolean;
  syncIntervalMinutes: SyncIntervalMinutes;
  messagesPerPage: MessagesPerPage;
  defaultReadFilter: EmailReadFilter;
  markReadOnOpen: boolean;
  confirmDelete: boolean;
  composeShowCcBcc: boolean;
  messageTextSize: EmailTextSize;
}

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  autoSync: true,
  syncIntervalMinutes: 1,
  messagesPerPage: 10,
  defaultReadFilter: "all",
  markReadOnOpen: true,
  confirmDelete: true,
  composeShowCcBcc: false,
  messageTextSize: "medium",
};

const STORAGE_KEY = "email-preferences-v1";
const LEGACY_AUTO_SYNC_KEY = "email-auto-sync-enabled";

export function loadEmailPreferences(): EmailPreferences {
  if (typeof window === "undefined") return DEFAULT_EMAIL_PREFERENCES;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_EMAIL_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch {
    /* ignore */
  }

  const legacy = localStorage.getItem(LEGACY_AUTO_SYNC_KEY);
  if (legacy === "0") {
    return { ...DEFAULT_EMAIL_PREFERENCES, autoSync: false };
  }

  return DEFAULT_EMAIL_PREFERENCES;
}

export function saveEmailPreferences(prefs: EmailPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  localStorage.setItem(LEGACY_AUTO_SYNC_KEY, prefs.autoSync ? "1" : "0");
}

export function syncIntervalMs(prefs: EmailPreferences): number {
  return prefs.syncIntervalMinutes * 60_000;
}

export const MESSAGE_TEXT_SIZE_CLASS: Record<EmailTextSize, string> = {
  small: "text-xs leading-relaxed",
  medium: "text-sm leading-relaxed",
  large: "text-base leading-relaxed",
};
