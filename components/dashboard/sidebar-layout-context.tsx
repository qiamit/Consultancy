"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SidebarLayoutValue = {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const SidebarLayoutContext = createContext<SidebarLayoutValue | null>(null);

export function useSidebarLayout() {
  const ctx = useContext(SidebarLayoutContext);
  if (!ctx) {
    throw new Error("useSidebarLayout must be used within SidebarLayoutProvider");
  }
  return ctx;
}

export function SidebarLayoutProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({
      open,
      toggle,
      setOpen,
    }),
    [open],
  );

  return (
    <SidebarLayoutContext.Provider value={value}>
      {children}
    </SidebarLayoutContext.Provider>
  );
}

export function MainContentOffset({ children }: { children: ReactNode }) {
  const { open } = useSidebarLayout();
  return (
    <div
      className={`transition-[padding] duration-200 ease-out ${
        open ? "lg:pl-64" : "lg:pl-0"
      }`}
    >
      {children}
    </div>
  );
}

/** When the sidebar is off-screen, a narrow control on the left edge to reopen it. */
export function SidebarExpandFab() {
  const { open, toggle } = useSidebarLayout();
  if (open) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed left-0 top-1/2 z-50 -translate-y-1/2 rounded-r-md border border-l-0 border-zinc-200 bg-white px-1.5 py-3 text-zinc-600 shadow-md transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      aria-label="Show sidebar"
      title="Show sidebar"
    >
      <ChevronRightIcon className="h-5 w-5" aria-hidden />
    </button>
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
