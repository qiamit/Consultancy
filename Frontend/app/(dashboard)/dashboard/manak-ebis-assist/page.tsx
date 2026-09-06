"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MANAK_ONLINE_EBIS_LOGIN_URL,
  manakOnlineEbisLoginHref,
} from "@backend/modules/bis/manak-online-portal";
import {
  clearManakEbisAssistPayload,
  readManakEbisAssistPayload,
  type ManakEbisAssistPayload,
} from "@/components/modules/bis-projects/manak-ebis-assist";

function AssistBody() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const [payload, setPayload] = useState<ManakEbisAssistPayload | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState<"userId" | "password" | null>(null);

  useEffect(() => {
    const data = readManakEbisAssistPayload(token);
    setPayload(data);
    setReady(true);
    if (!data) return;

    const loginUrl = manakOnlineEbisLoginHref(data.userId, data.password);
    const timer = window.setTimeout(() => {
      window.open(loginUrl, "_blank", "noopener,noreferrer");
    }, 350);

    return () => window.clearTimeout(timer);
  }, [token]);

  const loginHref = useMemo(
    () => manakOnlineEbisLoginHref(payload?.userId, payload?.password),
    [payload?.userId, payload?.password],
  );

  function copyField(which: "userId" | "password", value: string) {
    const text = value.trim();
    if (!text) return;
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      el.setSelectionRange(0, text.length);
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch {
      void navigator.clipboard?.writeText(text).catch(() => {});
    }
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1500);
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          Manak eBIS Login Assist
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No login details were found. Open this from{" "}
          <span className="font-semibold">Apply for Renewal</span> on a license
          that has User ID / Password saved.
        </p>
        <Link
          href="/dashboard/bis-projects"
          className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Back to BIS License Operative
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
          Apply for Renewal
        </p>
        <h1 className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
          Manak eBIS Login Assist
        </h1>
        {payload.clientName ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {payload.clientName}
            {payload.isLabel ? ` · ${payload.isLabel}` : ""}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Manak Online blocks other websites from auto-filling their login form
          (and blocks paste). This license&apos;s User ID and Password are ready
          below. Manak login opens in a new tab — type these values into the
          Manak fields (captcha still required on their site).
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">
              User ID
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={payload.userId || "—"}
                className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 font-mono text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
              />
              <button
                type="button"
                onClick={() => copyField("userId", payload.userId)}
                disabled={!payload.userId}
                className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {copied === "userId" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">
              Password
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={payload.password || "—"}
                className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 font-mono text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
              />
              <button
                type="button"
                onClick={() => copyField("password", payload.password)}
                disabled={!payload.password}
                className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {copied === "password" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={loginHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Open Manak eBIS Login
          </a>
          <button
            type="button"
            onClick={() => {
              clearManakEbisAssistPayload(token);
              setPayload(null);
            }}
            className="inline-flex rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear details
          </button>
        </div>

        <p className="mt-3 text-[11px] text-zinc-400">
          Login URL: {MANAK_ONLINE_EBIS_LOGIN_URL}
        </p>
      </div>
    </div>
  );
}

export default function ManakEbisAssistPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-10 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <AssistBody />
    </Suspense>
  );
}
