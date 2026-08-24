"use client";

import type { ReactNode } from "react";
import { useSidebarLayout } from "./sidebar-layout-context";

export function SidebarAside({ children }: { children: ReactNode }) {
  const { open, setOpen } = useSidebarLayout();

  return (
    <>
      {/* Mobile backdrop — closes sidebar when tapped */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {children}
      </aside>
    </>
  );
}
