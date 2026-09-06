"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import {
  applyProviderPreset,
} from "@backend/modules/email/providers";
import { saveEmailAccount, deleteEmailAccount } from "@backend/actions/email-accounts";
import type { EmailAccountSafe, EmailProvider } from "@backend/shared/types/email";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";
import { PROVIDER_OPTIONS } from "./constants";

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const SIGNATURE_MIN_HEIGHT_PX = 48;

function fitTextareaToContent(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, SIGNATURE_MIN_HEIGHT_PX)}px`;
}

export function EmailAccountModal({
  open,
  onClose,
  account,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  account?: EmailAccountSafe | null;
  onSaved: (warning?: string) => void;
}) {
  const { open: sidebarOpen } = useSidebarLayout();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<EmailProvider>(account?.provider ?? "gmail");
  const signatureRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const el = signatureRef.current;
    if (el) fitTextareaToContent(el);
  }, [open, account?.id, account?.signature]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("provider", provider);
    if (account?.id) fd.set("id", account.id);

    start(async () => {
      try {
        const res = await saveEmailAccount(fd);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (res.warning) {
          onSaved(res.warning);
          onClose();
          return;
        }
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save account. Try again.");
      }
    });
  }

  function handleDelete() {
    if (!account?.id || !confirm("Remove this email account?")) return;
    start(async () => {
      await deleteEmailAccount(account.id);
      onSaved();
      onClose();
    });
  }

  const serverPreset = applyProviderPreset(provider);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${
        sidebarOpen ? "lg:left-64" : "lg:left-0"
      }`}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {account ? "Edit email account" : "Add email account"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as EmailProvider)}
                className={inp}
              >
                {PROVIDER_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Display name
              </label>
              <input name="display_name" required defaultValue={account?.display_name ?? ""} className={inp} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Email address
              </label>
              <input
                name="email_address"
                type="email"
                required
                defaultValue={account?.email_address ?? ""}
                className={inp}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Username (if different)
              </label>
              <input name="username" defaultValue={account?.username ?? ""} className={inp} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              App password {account ? "(leave blank to keep)" : ""}
            </label>
            <input
              name="password"
              type="password"
              required={!account}
              autoComplete="new-password"
              placeholder={
                provider === "zoho"
                  ? "12-character Zoho app password (not login password)"
                  : "App password (not your login password)"
              }
              className={inp}
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              name="test_connection"
              value="1"
              className="mt-0.5"
            />
            Test IMAP connection when saving (and Resend API if @qengineering.in). Optional — account saves even if test fails.
          </label>

          {provider === "custom" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  IMAP host
                </label>
                <input name="imap_host" defaultValue={account?.imap_host ?? ""} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  SMTP host
                </label>
                <input name="smtp_host" defaultValue={account?.smtp_host ?? ""} className={inp} />
              </div>
              <input type="hidden" name="imap_port" value={account?.imap_port ?? serverPreset.imap_port} />
              <input type="hidden" name="smtp_port" value={account?.smtp_port ?? serverPreset.smtp_port} />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Signature
            </label>
            <textarea
              ref={signatureRef}
              name="signature"
              rows={2}
              defaultValue={account?.signature ?? ""}
              onInput={(e) => fitTextareaToContent(e.currentTarget)}
              className={`${inp} resize-none overflow-hidden`}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              name="is_default"
              value="1"
              defaultChecked={account ? Boolean(account.is_default) : true}
            />
            Default Account
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save account"}
            </button>
            {account && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
