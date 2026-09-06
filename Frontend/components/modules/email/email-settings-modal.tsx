"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EmailAccountSafe } from "@backend/shared/types/email";
import type { EmailPreferences } from "@backend/modules/email/preferences";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";
import { PROVIDER_OPTIONS } from "./constants";
import { formatEmailDate } from "./constants";

type Category = "accounts" | "mail" | "general";
type MailSection = "layout" | "compose" | "sync" | "message-handling";
type AccountsSection = "your-accounts";
type GeneralSection = "providers" | "ai";

type SectionId =
  | `accounts:${AccountsSection}`
  | `mail:${MailSection}`
  | `general:${GeneralSection}`;

const CATEGORY_ITEMS: { id: Category; label: string; icon: string }[] = [
  { id: "accounts", label: "Accounts", icon: "👤" },
  { id: "mail", label: "Mail", icon: "✉" },
  { id: "general", label: "General", icon: "⚙" },
];

const SECTIONS: Record<
  Category,
  { id: string; label: string; section: SectionId }[]
> = {
  accounts: [{ id: "your-accounts", label: "Your accounts", section: "accounts:your-accounts" }],
  mail: [
    { id: "layout", label: "Layout", section: "mail:layout" },
    { id: "compose", label: "Compose", section: "mail:compose" },
    { id: "sync", label: "Sync email", section: "mail:sync" },
    { id: "message-handling", label: "Message handling", section: "mail:message-handling" },
  ],
  general: [
    { id: "providers", label: "Mail providers", section: "general:providers" },
    { id: "ai", label: "AI compose", section: "general:ai" },
  ],
};

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-100 py-4 last:border-0 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 sm:max-w-md">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="text-sky-600 focus:ring-sky-500"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export function EmailSettingsModal({
  open,
  onClose,
  preferences,
  onPreferencesChange,
  accounts,
  activeAccountId,
  lastSyncAt,
  syncing,
  onSyncNow,
  onAddAccount,
  onEditAccount,
}: {
  open: boolean;
  onClose: () => void;
  preferences: EmailPreferences;
  onPreferencesChange: (next: EmailPreferences) => void;
  accounts: EmailAccountSafe[];
  activeAccountId: string;
  lastSyncAt: string | null;
  syncing: boolean;
  onSyncNow: () => void;
  onAddAccount: () => void;
  onEditAccount: (account: EmailAccountSafe) => void;
}) {
  const { open: sidebarOpen } = useSidebarLayout();
  const [category, setCategory] = useState<Category>("mail");
  const [section, setSection] = useState<SectionId>("mail:sync");
  const [search, setSearch] = useState("");
  const [signatureAccountId, setSignatureAccountId] = useState(activeAccountId);

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SECTIONS[category];
    return SECTIONS[category].filter((s) => s.label.toLowerCase().includes(q));
  }, [category, search]);

  function patch(partial: Partial<EmailPreferences>) {
    onPreferencesChange({ ...preferences, ...partial });
  }

  function selectCategory(next: Category) {
    setCategory(next);
    setSection(SECTIONS[next][0].section);
  }

  if (!open) return null;

  const signatureAccount =
    accounts.find((a) => a.id === signatureAccountId) ?? accounts[0] ?? null;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 sm:p-6 ${
        sidebarOpen ? "lg:left-64" : "lg:left-0"
      }`}
    >
      <div className="flex h-[min(720px,90vh)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Category nav */}
          <aside className="flex w-44 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search settings"
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {CATEGORY_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectCategory(item.id)}
                  className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                    category === item.id
                      ? "bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-400"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Section nav */}
          <aside className="hidden w-48 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 sm:flex">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {CATEGORY_ITEMS.find((c) => c.id === category)?.label}
              </p>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {(search ? filteredSections : SECTIONS[category]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.section)}
                  className={`mb-0.5 flex w-full rounded-lg px-3 py-2 text-left text-xs ${
                    section === item.section
                      ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8">
            <div className="mb-4 sm:hidden">
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as SectionId)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {SECTIONS[category].map((item) => (
                  <option key={item.id} value={item.section}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {section === "accounts:your-accounts" && (
              <>
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Your accounts
                </h3>
                <div className="space-y-2">
                  {accounts.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                      No email accounts connected yet.
                    </p>
                  ) : (
                    accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-3 dark:border-zinc-700"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {account.display_name}
                            {account.is_default && (
                              <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-zinc-500">{account.email_address}</p>
                          <p className="mt-0.5 text-[11px] capitalize text-zinc-400">
                            {account.provider}
                            {account.last_sync_at &&
                              ` · Last sync ${formatEmailDate(account.last_sync_at)}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEditAccount(account)}
                          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                        >
                          Edit
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={onAddAccount}
                    className="mt-2 flex w-full items-center justify-center rounded-lg border border-dashed border-sky-300 px-3 py-2.5 text-sm font-medium text-sky-600 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950/30"
                  >
                    + Add account
                  </button>
                </div>
              </>
            )}

            {section === "mail:layout" && (
              <>
                <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Layout
                </h3>
                <p className="mb-4 text-xs text-zinc-500">
                  These settings apply to the message list and reading pane.
                </p>
                <SettingRow
                  title="Messages per page"
                  description="How many messages appear in the list before pagination."
                >
                  <select
                    value={preferences.messagesPerPage}
                    onChange={(e) =>
                      patch({ messagesPerPage: Number(e.target.value) as EmailPreferences["messagesPerPage"] })
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </SettingRow>
                <SettingRow
                  title="Default message filter"
                  description="Initial filter when you open a folder."
                >
                  <select
                    value={preferences.defaultReadFilter}
                    onChange={(e) =>
                      patch({ defaultReadFilter: e.target.value as EmailPreferences["defaultReadFilter"] })
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <option value="all">All Message</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="starred">Starred</option>
                  </select>
                </SettingRow>
                <SettingRow
                  title="Message text size"
                  description="Reading pane font size for email body."
                >
                  <RadioGroup
                    name="text-size"
                    value={preferences.messageTextSize}
                    options={[
                      { value: "small", label: "Small" },
                      { value: "medium", label: "Medium" },
                      { value: "large", label: "Large" },
                    ]}
                    onChange={(messageTextSize) => patch({ messageTextSize })}
                  />
                </SettingRow>
              </>
            )}

            {section === "mail:compose" && (
              <>
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Compose
                </h3>
                <SettingRow
                  title="Show Cc and Bcc by default"
                  description="Expand Cc/Bcc fields when starting a new message."
                >
                  <input
                    type="checkbox"
                    checked={preferences.composeShowCcBcc}
                    onChange={(e) => patch({ composeShowCcBcc: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                </SettingRow>
                <SettingRow
                  title="Email signature"
                  description="Per-account signature appended when sending mail."
                >
                  <div className="flex flex-col gap-2 sm:items-end">
                    <select
                      value={signatureAccount?.id ?? ""}
                      onChange={(e) => setSignatureAccountId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 sm:w-56"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.email_address}
                        </option>
                      ))}
                    </select>
                    {signatureAccount && (
                      <>
                        <p className="w-full max-w-xs truncate text-left text-xs text-zinc-500 sm:text-right">
                          {signatureAccount.signature?.trim()
                            ? signatureAccount.signature
                            : "No signature set"}
                        </p>
                        <button
                          type="button"
                          onClick={() => onEditAccount(signatureAccount)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                        >
                          Edit signature
                        </button>
                      </>
                    )}
                  </div>
                </SettingRow>
              </>
            )}

            {section === "mail:sync" && (
              <>
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Sync email
                </h3>
                <SettingRow
                  title="Auto Sync"
                  description="Fetch new mail from the server automatically while this page is open."
                >
                  <input
                    type="checkbox"
                    checked={preferences.autoSync}
                    onChange={(e) => patch({ autoSync: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                </SettingRow>
                {preferences.autoSync && (
                  <SettingRow
                    title="Sync interval"
                    description="How often to check for new messages."
                  >
                    <RadioGroup
                      name="sync-interval"
                      value={String(preferences.syncIntervalMinutes)}
                      options={[
                        { value: "1", label: "Every 1 minute" },
                        { value: "2", label: "Every 2 minutes" },
                        { value: "5", label: "Every 5 minutes" },
                      ]}
                      onChange={(v) =>
                        patch({
                          syncIntervalMinutes: Number(v) as EmailPreferences["syncIntervalMinutes"],
                        })
                      }
                    />
                  </SettingRow>
                )}
                <SettingRow
                  title="Last synced"
                  description={
                    lastSyncAt
                      ? `Active account last synced at ${formatEmailDate(lastSyncAt)}.`
                      : "No sync recorded yet for the active account."
                  }
                >
                  <button
                    type="button"
                    onClick={onSyncNow}
                    disabled={syncing}
                    className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                </SettingRow>
              </>
            )}

            {section === "mail:message-handling" && (
              <>
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Message handling
                </h3>
                <SettingRow
                  title="Mark as read when opened"
                  description="Automatically mark a message as read when you select it."
                >
                  <input
                    type="checkbox"
                    checked={preferences.markReadOnOpen}
                    onChange={(e) => patch({ markReadOnOpen: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                </SettingRow>
                <SettingRow
                  title="Confirm before delete"
                  description="Ask for confirmation before moving a message to trash."
                >
                  <input
                    type="checkbox"
                    checked={preferences.confirmDelete}
                    onChange={(e) => patch({ confirmDelete: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                </SettingRow>
              </>
            )}

            {section === "general:providers" && (
              <>
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Mail providers
                </h3>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Connect Zoho/Gmail/Outlook with IMAP for inbox sync. For{" "}
                  <code className="text-xs">@qengineering.in</code>, outbound send uses
                  Resend when <code className="text-xs">RESEND_API_KEY</code> is set.
                </p>
                <ul className="space-y-2">
                  {PROVIDER_OPTIONS.map((p) => (
                    <li
                      key={p.value}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      {p.label}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {section === "general:ai" && (
              <>
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  AI compose
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  AI draft, reply, and forward suggestions use the active model configured in App
                  Settings. Reply with AI in the reading pane uses the same configuration.
                </p>
                <Link
                  href="/dashboard/settings/app?tab=ai"
                  className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                  onClick={onClose}
                >
                  Open AI Settings
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
