"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchUnreadEmailCount } from "@backend/actions/email-accounts";

export function HeaderEmailButton({
  initialUnreadCount = 0,
}: {
  initialUnreadCount?: number;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnreadCount);
  const isActive =
    pathname === "/dashboard/email" || pathname.startsWith("/dashboard/email/");

  const refreshCount = useCallback(() => {
    void fetchUnreadEmailCount().then(setUnread);
  }, []);

  useEffect(() => {
    setUnread(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    refreshCount();
    const id = window.setInterval(refreshCount, 60_000);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (isActive) refreshCount();
  }, [isActive, refreshCount]);

  const badgeLabel =
    unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

  return (
    <Link
      href="/dashboard/email"
      title={
        unread > 0
          ? `Email — ${unread} unread`
          : "Email"
      }
      aria-label={
        unread > 0 ? `Email, ${unread} unread messages` : "Email"
      }
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-none border shadow-sm transition-colors ${
        isActive
          ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      {badgeLabel ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-zinc-900">
          {badgeLabel}
        </span>
      ) : null}
    </Link>
  );
}
