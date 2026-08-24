"use client";

import type { ReactNode } from "react";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";

export function FinanceFormModalShell({
  ariaLabelledBy,
  onClose,
  zIndexClass = "z-[100]",
  children,
}: {
  ariaLabelledBy: string;
  onClose: () => void;
  zIndexClass?: string;
  children: ReactNode;
}) {
  const { open: sidebarOpen } = useSidebarLayout();

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex flex-col overflow-hidden bg-zinc-950/50 p-[2mm] dark:bg-black/55 ${
        sidebarOpen ? "lg:left-64" : "lg:left-0"
      }`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-[2mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
