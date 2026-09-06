"use client";

import { manakOnlineEbisLoginHref } from "@backend/modules/bis/manak-online-portal";

export type ManakEbisAssistPayload = {
  userId: string;
  password: string;
  clientName?: string;
  isLabel?: string;
  savedAt: number;
};

const STORAGE_PREFIX = "manak_ebis_assist:";

function storageKey(token: string): string {
  return `${STORAGE_PREFIX}${token}`;
}

/**
 * Opens Manak eBIS login directly (no intermediate assist tab).
 * Manak fills User ID / Password from `?userId=` and `?passwd=` (same as their server HTML).
 */
export function openManakEbisAssist(payload: {
  userId: string | null | undefined;
  password: string | null | undefined;
  clientName?: string | null;
  isLabel?: string | null;
}): ManakEbisAssistPayload {
  const data: ManakEbisAssistPayload = {
    userId: String(payload.userId ?? "").trim(),
    password: String(payload.password ?? "").trim(),
    clientName: String(payload.clientName ?? "").trim() || undefined,
    isLabel: String(payload.isLabel ?? "").trim() || undefined,
    savedAt: Date.now(),
  };

  window.open(
    manakOnlineEbisLoginHref(data.userId, data.password),
    "_blank",
    "noopener,noreferrer",
  );

  return data;
}

export function readManakEbisAssistPayload(
  token: string | null | undefined,
): ManakEbisAssistPayload | null {
  const t = String(token ?? "").trim();
  if (!t) return null;
  try {
    const raw = localStorage.getItem(storageKey(t));
    if (!raw) return null;
    localStorage.removeItem(storageKey(t));
    const parsed = JSON.parse(raw) as ManakEbisAssistPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - (parsed.savedAt || 0) > 30 * 60 * 1000) return null;
    return {
      userId: String(parsed.userId ?? "").trim(),
      password: String(parsed.password ?? "").trim(),
      clientName: parsed.clientName,
      isLabel: parsed.isLabel,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearManakEbisAssistPayload(token?: string | null): void {
  try {
    if (token) {
      localStorage.removeItem(storageKey(token));
      return;
    }
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
