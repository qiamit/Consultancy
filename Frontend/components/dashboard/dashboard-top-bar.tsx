"use client";

import Link from "next/link";
import { useSidebarLayout } from "./sidebar-layout-context";
import { DashboardUserMenu } from "./dashboard-user-menu";

export function DashboardTopBar({
  userName,
  userEmail,
  isAdmin,
}: {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}) {
  const { open, toggle } = useSidebarLayout();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="rounded-none border border-zinc-200 p-2 text-zinc-600 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label={open ? "Hide sidebar" : "Show sidebar"}
          aria-expanded={open}
          title={open ? "Hide sidebar" : "Show sidebar"}
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-sm">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="truncate text-sm font-bold text-zinc-900 dark:text-white">
            Smart Consultancy
          </span>
        </Link>
      </div>

      <DashboardUserMenu
        userName={userName}
        userEmail={userEmail}
        isAdmin={isAdmin}
      />
    </header>
  );
}
