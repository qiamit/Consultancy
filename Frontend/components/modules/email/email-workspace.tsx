"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FOLDER_LABELS, resolveImapFolder } from "@backend/modules/email/providers";
import type {
  ComposeMode,
  EmailAccountSafe,
  EmailFolderKey,
  EmailMessageRow,
} from "@backend/shared/types/email";
import {
  loadEmailPreferences,
  saveEmailPreferences,
  syncIntervalMs,
  type EmailPreferences,
} from "@backend/modules/email/preferences";
import { EmailAccountModal } from "./email-account-modal";
import { EmailSettingsModal } from "./email-settings-modal";
import { EmailConversationView } from "./email-conversation-view";
import { decodeHtmlEntities } from "@backend/modules/email/format-body";
import { threadCountForMessage } from "@backend/modules/email/threading";
import {
  EMAIL_FOLDERS,
  formatEmailDate,
  parseAddressList,
} from "./constants";
import { useSyncedRows } from "@/components/modules/finance/use-finance-master-state";

type ComposeAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  contentBase64: string;
};

type ComposeState = {
  open: boolean;
  mode: ComposeMode;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: ComposeAttachment[];
  inReplyTo?: string;
  references?: string;
};

const emptyCompose = (): ComposeState => ({
  open: false,
  mode: "new",
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  body: "",
  attachments: [],
});

type MessageReadFilter = EmailPreferences["defaultReadFilter"];

export function EmailWorkspace({
  initialAccounts,
  setupError = null,
}: {
  initialAccounts: EmailAccountSafe[];
  setupError?: string | null;
}) {
  const router = useRouter();
  const [accounts] = useSyncedRows(initialAccounts);
  const [accountId, setAccountId] = useState<string>(
    initialAccounts.find((a) => a.is_default)?.id ?? initialAccounts[0]?.id ?? "",
  );
  const effectiveAccountId = useMemo(() => {
    if (accountId && accounts.some((a) => a.id === accountId)) return accountId;
    return accounts.find((a) => a.is_default)?.id ?? accounts[0]?.id ?? "";
  }, [accountId, accounts]);
  const [folderKey, setFolderKey] = useState<EmailFolderKey>("inbox");
  const [messages, setMessages] = useState<EmailMessageRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editAccount, setEditAccount] = useState<EmailAccountSafe | null>(null);
  const [compose, setCompose] = useState<ComposeState>(emptyCompose);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [loadingBodyId, setLoadingBodyId] = useState<string | null>(null);
  const [bodyLoadError, setBodyLoadError] = useState<{ id: string; message: string } | null>(null);
  const [threadMessages, setThreadMessages] = useState<EmailMessageRow[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferences>(() => loadEmailPreferences());
  const [readFilter, setReadFilter] = useState<MessageReadFilter>(
    () => loadEmailPreferences().defaultReadFilter,
  );
  const [listPage, setListPage] = useState(1);
  const syncingRef = useRef(false);

  const messagePageSize = preferences.messagesPerPage;
  const listScopeKey = `${effectiveAccountId}|${folderKey}|${readFilter}|${search}|${messagePageSize}`;
  const [appliedListScopeKey, setAppliedListScopeKey] = useState(listScopeKey);
  if (listScopeKey !== appliedListScopeKey) {
    setAppliedListScopeKey(listScopeKey);
    setListPage(1);
  }

  const activeAccount = accounts.find((a) => a.id === effectiveAccountId) ?? null;
  const selected = useMemo(
    () => (selectedId ? messages.find((m) => m.id === selectedId) ?? null : null),
    [messages, selectedId],
  );

  const displayThread = useMemo(() => {
    if (threadMessages.length > 0) return threadMessages;
    return selected ? [selected] : [];
  }, [threadMessages, selected]);

  function messageNeedsBody(msg: EmailMessageRow) {
    return (
      !msg.body_text?.trim() &&
      (!msg.body_html?.trim() || msg.body_html.trim().length <= 80)
    );
  }

  function clearSelectedMessage() {
    setSelectedId(null);
    setThreadMessages([]);
    setBodyLoadError(null);
  }

  function selectMessage(messageId: string) {
    setCompose(emptyCompose());
    setSelectedId(messageId);
    setBodyLoadError(null);
    const msg = messages.find((m) => m.id === messageId);
    if (msg && preferences.markReadOnOpen && !msg.is_read) void patchMessage(messageId, { isRead: true });
    void loadThread(messageId);
  }

  const imapFolder = useMemo(() => {
    if (!activeAccount) return "INBOX";
    if (folderKey === "starred") return resolveImapFolder(activeAccount.provider, "inbox");
    return resolveImapFolder(activeAccount.provider, folderKey);
  }, [activeAccount, folderKey]);

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = messages;
    if (folderKey === "starred") list = list.filter((m) => m.is_starred);
    if (readFilter === "unread") list = list.filter((m) => !m.is_read);
    else if (readFilter === "read") list = list.filter((m) => m.is_read);
    else if (readFilter === "starred") list = list.filter((m) => m.is_starred);
    if (!q) return list;
    return list.filter(
      (m) =>
        m.subject?.toLowerCase().includes(q) ||
        m.from_name?.toLowerCase().includes(q) ||
        m.from_address?.toLowerCase().includes(q) ||
        m.snippet?.toLowerCase().includes(q),
    );
  }, [messages, search, folderKey, readFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / messagePageSize));
  const safePage = Math.min(listPage, totalPages);
  const pagedMessages = useMemo(
    () =>
      filteredMessages.slice(
        (safePage - 1) * messagePageSize,
        safePage * messagePageSize,
      ),
    [filteredMessages, safePage, messagePageSize],
  );
  const pageStart = filteredMessages.length === 0 ? 0 : (safePage - 1) * messagePageSize + 1;
  const pageEnd = Math.min(safePage * messagePageSize, filteredMessages.length);

  const loadMessages = useCallback(async () => {
    if (!effectiveAccountId) return;
    const params = new URLSearchParams({
      accountId: effectiveAccountId,
      folder: imapFolder,
      starred: folderKey === "starred" ? "1" : "0",
    });
    const res = await fetch(`/api/email/messages/list?${params}`);
    if (res.ok) {
      const data = (await res.json()) as { messages: EmailMessageRow[] };
      setMessages(data.messages);
    }
  }, [effectiveAccountId, imapFolder, folderKey]);

  const loadMessageBody = useCallback(async (messageId: string) => {
    setLoadingBodyId(messageId);
    setBodyLoadError(null);
    try {
      const res = await fetch(`/api/email/messages/body?id=${messageId}`);
      const data = (await res.json()) as {
        body_text?: string | null;
        body_html?: string | null;
        attachments?: EmailMessageRow["attachments"];
        has_attachments?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setBodyLoadError({ id: messageId, message: data.error ?? "Could not load message body." });
        return;
      }
      const patch = (m: EmailMessageRow) =>
        m.id === messageId
          ? {
              ...m,
              body_text: data.body_text ?? m.body_text,
              body_html: data.body_html ?? m.body_html,
              attachments: data.attachments ?? m.attachments,
              has_attachments:
                data.has_attachments ??
                (data.attachments?.length ? true : m.has_attachments),
            }
          : m;
      setMessages((msgs) => msgs.map(patch));
      setThreadMessages((thread) => thread.map(patch));
    } finally {
      setLoadingBodyId(null);
    }
  }, []);

  const loadThread = useCallback(
    async (messageId: string) => {
      setLoadingThread(true);
      setBodyLoadError(null);
      try {
        const res = await fetch(`/api/email/messages/thread?id=${messageId}`);
        const data = (await res.json()) as {
          messages?: EmailMessageRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Could not load conversation");
        const thread = data.messages ?? [];
        setThreadMessages(thread);
        setMessages((msgs) => {
          const map = new Map(msgs.map((m) => [m.id, m]));
          for (const t of thread) {
            map.set(t.id, { ...(map.get(t.id) ?? t), ...t });
          }
          return Array.from(map.values());
        });
        for (const m of thread) {
          if (messageNeedsBody(m)) void loadMessageBody(m.id);
        }
      } catch {
        setThreadMessages([]);
        void loadMessageBody(messageId);
      } finally {
        setLoadingThread(false);
      }
    },
    [loadMessageBody],
  );

  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  async function syncMailbox(allFolders = false) {
    if (!effectiveAccountId || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/email/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          allFolders
            ? { accountId: effectiveAccountId, allFolders: true }
            : { accountId: effectiveAccountId, folderKey },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      await loadMessages();
      const activeSelectedId = selectedIdRef.current;
      if (activeSelectedId) void loadThread(activeSelectedId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }

  const syncMailboxRef = useRef(syncMailbox);
  useEffect(() => {
    syncMailboxRef.current = syncMailbox;
  });

  function updatePreferences(next: EmailPreferences) {
    setPreferences(next);
    saveEmailPreferences(next);
  }

  useEffect(() => {
    if (!effectiveAccountId) return;
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams({
        accountId: effectiveAccountId,
        folder: imapFolder,
        starred: folderKey === "starred" ? "1" : "0",
      });
      const res = await fetch(`/api/email/messages/list?${params}`);
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { messages: EmailMessageRow[] };
      setMessages(data.messages);
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveAccountId, imapFolder, folderKey]);

  useEffect(() => {
    if (!preferences.autoSync || !effectiveAccountId) return;
    let cancelled = false;
    const runSync = () => {
      if (!cancelled) void syncMailboxRef.current(false);
    };
    const initialTimer = window.setTimeout(runSync, 0);
    const timer = window.setInterval(runSync, syncIntervalMs(preferences));
    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [preferences.autoSync, preferences.syncIntervalMinutes, effectiveAccountId]);

  function buildReplyCompose(base: EmailMessageRow, mode: "reply" | "replyAll" | "forward"): ComposeState {
    const from = base.from_address ?? "";
    if (mode === "reply") {
      return {
        open: true,
        mode: "reply",
        to: from,
        cc: "",
        bcc: "",
        subject: base.subject?.startsWith("Re:") ? base.subject : `Re: ${base.subject ?? ""}`,
        body: `\n\n---\nOn ${formatEmailDate(base.email_date)}, ${base.from_name ?? from} wrote:\n${base.body_text ?? base.snippet ?? ""}`,
        attachments: [],
        inReplyTo: base.message_id ?? undefined,
        references: base.reply_references ?? base.message_id ?? undefined,
      };
    }
    if (mode === "replyAll") {
      const others = [...(base.to_addresses ?? []), ...(base.cc_addresses ?? [])]
        .map((a) => a.address)
        .filter((a) => a && a !== activeAccount?.email_address);
      return {
        open: true,
        mode: "replyAll",
        to: [from, ...others].filter(Boolean).join(", "),
        cc: "",
        bcc: "",
        subject: base.subject?.startsWith("Re:") ? base.subject : `Re: ${base.subject ?? ""}`,
        body: `\n\n---\n${base.body_text ?? base.snippet ?? ""}`,
        attachments: [],
        inReplyTo: base.message_id ?? undefined,
        references: base.reply_references ?? base.message_id ?? undefined,
      };
    }
    return {
      open: true,
      mode: "forward",
      to: "",
      cc: "",
      bcc: "",
      subject: base.subject?.startsWith("Fwd:") ? base.subject : `Fwd: ${base.subject ?? ""}`,
      body: `\n\n--- Forwarded message ---\nFrom: ${base.from_name ?? from}\nSubject: ${base.subject}\n\n${base.body_text ?? base.snippet ?? ""}`,
      attachments: [],
    };
  }

  function openCompose(mode: ComposeMode, base?: EmailMessageRow) {
    setShowCcBcc(preferences.composeShowCcBcc);
    if (mode === "new") {
      setCompose({ ...emptyCompose(), open: true, mode: "new" });
      return;
    }
    if (!base) return;
    setCompose(buildReplyCompose(base, mode));
  }

  async function replyWithAi(base: EmailMessageRow) {
    if (!effectiveAccountId) return;
    const draft = buildReplyCompose(base, "reply");
    setCompose(draft);
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/email/ai-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: effectiveAccountId,
          draft: {
            mode: "reply",
            subject: draft.subject || base.subject,
            originalFrom: base.from_address,
            originalBody: base.body_text ?? base.snippet,
            recipientHint: draft.to,
            instructions: "Write for BIS/ISO certification consultancy context.",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI reply failed");
      setCompose((c) => ({
        ...c,
        open: true,
        mode: "reply",
        subject: data.subject || c.subject,
        body: data.body || c.body,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI reply failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function patchMessage(id: string, patch: { isRead?: boolean; isStarred?: boolean }) {
    await fetch("/api/email/messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: id, ...patch }),
    });
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              is_read: patch.isRead ?? m.is_read,
              is_starred: patch.isStarred ?? m.is_starred,
              is_flagged: patch.isStarred ?? m.is_flagged,
            }
          : m,
      ),
    );
  }

  async function deleteMessage(id: string) {
    if (preferences.confirmDelete && !confirm("Delete this message?")) return;
    await fetch(`/api/email/messages?id=${id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) clearSelectedMessage();
  }

  async function moveMessage(id: string, folderKey: EmailFolderKey) {
    setError(null);
    const res = await fetch("/api/email/messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: id, moveToFolderKey: folderKey }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not move message.");
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) clearSelectedMessage();
    await loadMessages();
  }

  function runMessageAction(action: string) {
    if (!selected) return;
    switch (action) {
      case "reply":
        openCompose("reply", selected);
        break;
      case "replyAll":
        openCompose("replyAll", selected);
        break;
      case "forward":
        openCompose("forward", selected);
        break;
      case "markRead":
        void patchMessage(selected.id, { isRead: true });
        break;
      case "markUnread":
        void patchMessage(selected.id, { isRead: false });
        break;
      case "flag":
        void patchMessage(selected.id, { isStarred: true });
        break;
      case "unflag":
        void patchMessage(selected.id, { isStarred: false });
        break;
      case "delete":
        void deleteMessage(selected.id);
        break;
      case "moveInbox":
        void moveMessage(selected.id, "inbox");
        break;
      case "moveArchive":
        void moveMessage(selected.id, "archive");
        break;
      case "moveJunk":
        void moveMessage(selected.id, "junk");
        break;
      case "moveTrash":
        void moveMessage(selected.id, "trash");
        break;
      default:
        break;
    }
  }

  async function addComposeAttachments(files: FileList | null) {
    if (!files?.length) return;
    const maxBytes = 10 * 1024 * 1024;
    const next = [...compose.attachments];
    for (const file of Array.from(files)) {
      if (file.size > maxBytes) {
        setError(`"${file.name}" must be under 10 MB`);
        continue;
      }
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.includes(",") ? result.split(",")[1]! : "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      next.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        contentBase64,
      });
    }
    setCompose((c) => ({ ...c, attachments: next }));
  }

  async function sendCompose() {
    if (!effectiveAccountId) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: effectiveAccountId,
          to: parseAddressList(compose.to),
          cc: parseAddressList(compose.cc),
          bcc: parseAddressList(compose.bcc),
          subject: compose.subject,
          text: compose.body,
          inReplyTo: compose.inReplyTo,
          references: compose.references,
          attachments: compose.attachments.map((a) => ({
            filename: a.name,
            contentType: a.type,
            content: a.contentBase64,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setCompose(emptyCompose());
      setFolderKey("sent");
      await syncMailbox();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function aiDraft(mode: "draft" | "reply" | "replyAll" | "forward") {
    if (!effectiveAccountId) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/email/ai-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: effectiveAccountId,
          draft: {
            mode,
            subject: compose.subject || selected?.subject,
            originalFrom: selected?.from_address,
            originalBody: selected?.body_text ?? selected?.snippet,
            recipientHint: compose.to,
            instructions: "Write for BIS/ISO certification consultancy context.",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI draft failed");
      setCompose((c) => ({
        ...c,
        open: true,
        subject: data.subject || c.subject,
        body: data.body || c.body,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI draft failed");
    } finally {
      setAiLoading(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        {setupError && (
          <p className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {setupError.includes("email_accounts")
              ? "Email module database tables are missing. Run npm run migrate for email_accounts, then refresh."
              : setupError}
          </p>
        )}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">View Email</h1>
          <p className="mt-2 max-w-md text-sm text-zinc-500">
            Connect Gmail, Outlook, Hotmail, Zoho, or any IMAP mailbox. AI-assisted draft & reply per account.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditAccount(null);
              setShowAccountModal(true);
            }}
            className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Add email account
          </button>
        </div>
        <EmailAccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          account={editAccount}
          onSaved={(warning) => {
            if (warning) setNotice(warning);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {notice && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}
      {setupError && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {setupError}
        </div>
      )}
      {/* Toolbar — Outlook-style ribbon */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => openCompose("new")}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
        >
          New email
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && openCompose("reply", selected)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-zinc-700"
        >
          Reply
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && openCompose("replyAll", selected)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-zinc-700"
        >
          Reply all
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && openCompose("forward", selected)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-zinc-700"
        >
          Forward
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && patchMessage(selected.id, { isRead: !selected.is_read })}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-zinc-700"
        >
          {selected?.is_read ? "Mark unread" : "Mark read"}
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && patchMessage(selected.id, { isStarred: !selected.is_starred })}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-zinc-700"
        >
          {selected?.is_starred ? "Unflag" : "Flag"}
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && deleteMessage(selected.id)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-red-600 disabled:opacity-40 dark:border-zinc-700"
        >
          Delete
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
        <button
          type="button"
          onClick={() => aiDraft(compose.open ? "draft" : selected ? "reply" : "draft")}
          disabled={aiLoading}
          className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 disabled:opacity-40 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300"
        >
          {aiLoading ? "AI…" : "AI draft / reply"}
        </button>
        <button
          type="button"
          onClick={() => void syncMailbox(true)}
          disabled={syncing}
          className="ml-auto rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-zinc-700"
          title={
            preferences.autoSync
              ? `Auto sync every ${preferences.syncIntervalMinutes} min`
              : "Manual sync only"
          }
        >
          {syncing ? "Syncing…" : preferences.autoSync ? "Sync (auto)" : "Sync"}
        </button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mail"
          className="w-40 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Folder pane */}
        <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
          <div className="border-b border-zinc-200 p-2 dark:border-zinc-800">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name}
                </option>
              ))}
            </select>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {EMAIL_FOLDERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFolderKey(key);
                  clearSelectedMessage();
                  setListPage(1);
                }}
                className={`mb-0.5 flex w-full items-center rounded-lg px-3 py-2 text-left text-xs ${
                  folderKey === key
                    ? "bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-400"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                }`}
              >
                {FOLDER_LABELS[key]}
              </button>
            ))}
          </nav>
          <div className="shrink-0 border-t border-zinc-200 p-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
            >
              Settings
            </button>
          </div>
        </aside>

        {/* Message list */}
        <section className="flex w-80 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
          <div className="space-y-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-500">
              <span>{FOLDER_LABELS[folderKey]}</span>
              <span>
                {filteredMessages.length === 0
                  ? "0 messages"
                  : `${pageStart}–${pageEnd} of ${filteredMessages.length}`}
              </span>
            </div>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as MessageReadFilter)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="all">All messages</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="starred">Starred</option>
            </select>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] disabled:opacity-40 dark:border-zinc-700"
                >
                  ← Prev
                </button>
                <span className="text-[11px] text-zinc-500">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] disabled:opacity-40 dark:border-zinc-700"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
          <ul className="flex-1 overflow-y-auto">
            {pagedMessages.length === 0 ? (
              <li className="p-4 text-center text-xs text-zinc-500">
                No messages match this filter. Click Sync to fetch mail.
              </li>
            ) : (
              pagedMessages.map((m) => (
                <li
                  key={m.id}
                  className={`group flex border-b border-zinc-100 dark:border-zinc-800/80 ${
                    selectedId === m.id ? "bg-sky-50 dark:bg-sky-950/20" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectMessage(m.id)}
                    className={`min-w-0 flex-1 px-3 py-2.5 text-left transition ${
                      selectedId === m.id
                        ? ""
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    } ${!m.is_read ? "font-semibold" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-xs text-zinc-900 dark:text-zinc-100">
                        {m.from_name || m.from_address || "Unknown"}
                      </span>
                      <span className="shrink-0 text-[10px] text-zinc-500">
                        {formatEmailDate(m.email_date)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                      {decodeHtmlEntities(m.subject ?? "(No subject)")}
                      {threadCountForMessage(m, messages) > 1 && (
                        <span className="ml-1 text-[10px] font-normal text-zinc-400">
                          ({threadCountForMessage(m, messages)})
                        </span>
                      )}
                    </p>
                    <p className="line-clamp-1 text-[11px] text-zinc-500">
                      {decodeHtmlEntities(m.snippet ?? "")}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {m.is_starred && <span className="text-[10px] text-amber-500">★</span>}
                      {m.has_attachments && <span className="text-[10px] text-zinc-400">📎</span>}
                    </div>
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    aria-label="Delete message"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteMessage(m.id);
                    }}
                    className="shrink-0 self-center rounded-md px-2 py-2 text-base text-red-600 opacity-80 hover:bg-red-50 hover:opacity-100 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    🗑️
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Reading pane / Compose */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {compose.open ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                <span className="text-sm font-semibold capitalize">{compose.mode} message</span>
                <button
                  type="button"
                  onClick={() => setCompose(emptyCompose())}
                  className="text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Close
                </button>
              </div>
              <div className="space-y-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
                <input
                  value={compose.to}
                  onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                  placeholder="To"
                  className="w-full border-b border-zinc-200 bg-transparent py-1 text-sm outline-none dark:border-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-[11px] text-sky-600 dark:text-sky-400"
                >
                  {showCcBcc ? "Hide" : "Show"} Cc/Bcc
                </button>
                {showCcBcc && (
                  <>
                    <input
                      value={compose.cc}
                      onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))}
                      placeholder="Cc"
                      className="w-full border-b border-zinc-200 bg-transparent py-1 text-sm outline-none dark:border-zinc-700"
                    />
                    <input
                      value={compose.bcc}
                      onChange={(e) => setCompose((c) => ({ ...c, bcc: e.target.value }))}
                      placeholder="Bcc"
                      className="w-full border-b border-zinc-200 bg-transparent py-1 text-sm outline-none dark:border-zinc-700"
                    />
                  </>
                )}
                <input
                  value={compose.subject}
                  onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                  placeholder="Subject"
                  className="w-full border-b border-zinc-200 bg-transparent py-1 text-sm outline-none dark:border-zinc-700"
                />
              </div>
              <textarea
                value={compose.body}
                onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
                className="min-h-0 flex-1 resize-none p-4 text-sm outline-none dark:bg-zinc-900"
              />
              <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                    Attach files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void addComposeAttachments(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {compose.attachments.map((file) => (
                    <span
                      key={file.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      📎 {file.name}
                      <button
                        type="button"
                        onClick={() =>
                          setCompose((c) => ({
                            ...c,
                            attachments: c.attachments.filter((a) => a.id !== file.id),
                          }))
                        }
                        className="text-zinc-500 hover:text-red-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={sendCompose}
                  disabled={sending}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
                <button
                  type="button"
                  onClick={() => aiDraft(compose.mode === "new" ? "draft" : compose.mode)}
                  disabled={aiLoading}
                  className="rounded-lg border border-violet-300 px-4 py-2 text-xs text-violet-700 dark:border-violet-900 dark:text-violet-300"
                >
                  AI rewrite
                </button>
              </div>
            </div>
          ) : selected ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex w-full shrink-0 border-b border-zinc-200 dark:border-zinc-800">
                <div className="min-w-0 flex-[7] border-r border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <h2 className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                    {decodeHtmlEntities(selected.subject ?? "(No subject)")}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {displayThread.length > 1
                      ? `${displayThread.length} messages in this conversation`
                      : `From: ${selected.from_name ?? selected.from_address} · ${formatEmailDate(selected.email_date)}`}
                  </p>
                  {displayThread.length === 1 && (
                    <>
                      <p className="text-xs text-zinc-500">
                        To: {(selected.to_addresses ?? []).map((a) => a.address).join(", ") || "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        Sync Inbox and Sent folders to load the full conversation thread.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex min-w-[11rem] flex-[3] flex-col items-end justify-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() => void replyWithAi(selected)}
                    className="w-full max-w-[10.5rem] rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50"
                  >
                    {aiLoading ? "AI writing…" : "Reply with AI"}
                  </button>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const action = e.target.value;
                      e.target.value = "";
                      if (action) runMessageAction(action);
                    }}
                    className="w-full max-w-[10.5rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    <option value="" disabled>
                      Actions
                    </option>
                    <option value="reply">Reply</option>
                    <option value="replyAll">Reply all</option>
                    <option value="forward">Forward</option>
                    <option value="markRead">Mark as read</option>
                    <option value="markUnread">Mark as unread</option>
                    <option value="flag">Flag</option>
                    <option value="unflag">Remove flag</option>
                    <option value="moveInbox">Move to Inbox</option>
                    <option value="moveArchive">Move to Archive</option>
                    <option value="moveJunk">Move to Junk</option>
                    <option value="moveTrash">Move to Trash</option>
                    <option value="delete">Delete</option>
                  </select>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
                {loadingThread ? (
                  <p className="text-sm text-zinc-500">Loading conversation…</p>
                ) : (
                  <EmailConversationView
                    thread={displayThread}
                    activeEmail={activeAccount?.email_address ?? null}
                    selectedId={selectedId}
                    textSize={preferences.messageTextSize}
                    loadingBodyId={loadingBodyId}
                    bodyLoadError={bodyLoadError}
                    onRetryBody={(id) => void loadMessageBody(id)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              Select a message or compose new email
            </div>
          )}
        </section>
      </div>

      <EmailSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        preferences={preferences}
        onPreferencesChange={updatePreferences}
        activeAccountId={accountId}
        lastSyncAt={activeAccount?.last_sync_at ?? null}
        syncing={syncing}
        onSyncNow={() => void syncMailbox(true)}
        accounts={accounts}
        onAddAccount={() => {
          setEditAccount(null);
          setShowAccountModal(true);
        }}
        onEditAccount={(account) => {
          setEditAccount(account);
          setShowAccountModal(true);
        }}
      />
      <EmailAccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        account={editAccount}
        onSaved={(warning) => {
          if (warning) setNotice(warning);
          router.refresh();
        }}
      />
    </div>
  );
}
