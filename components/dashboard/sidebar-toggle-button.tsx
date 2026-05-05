"use client";

import { useSidebarLayout } from "./sidebar-layout-context";

export function SidebarToggleButton() {
  const { open, toggle } = useSidebarLayout();

  return (
    <button
      type="button"
      onClick={toggle}
      className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
      aria-label={open ? "Hide sidebar" : "Show sidebar"}
      aria-expanded={open}
      title={open ? "Hide sidebar" : "Show sidebar"}
    >
      {open ? (
        <ChevronLeftIcon className="h-4 w-4" aria-hidden />
      ) : (
        <ChevronRightIcon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}
