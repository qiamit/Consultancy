"use client";

import Link from "next/link";
import { useSidebarLayout } from "./sidebar-layout-context";

export function MobileTopBar() {
  const { toggle } = useSidebarLayout();
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">
      <button
        type="button"
        onClick={toggle}
        className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label="Toggle navigation"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
        <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-sm">
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span className="truncate text-sm font-bold text-zinc-900 dark:text-white">Smart Consultancy</span>
      </Link>
    </div>
  );
}
