"use client";

import { useSidebarLayout } from "./sidebar-layout-context";

export function SidebarToggleButton() {
  const { open, toggle } = useSidebarLayout();

  return (
    <button
      type="button"
      onClick={toggle}
      className="shrink-0 rounded-none border border-zinc-200 bg-zinc-50 p-2 text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
      aria-label={open ? "Hide sidebar" : "Show sidebar"}
      aria-expanded={open}
      title={open ? "Hide sidebar" : "Show sidebar"}
    >
      <MenuIcon className="h-4 w-4" />
    </button>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
