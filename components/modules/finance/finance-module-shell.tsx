import type { ReactNode } from "react";

export function FinanceModuleShell({
  breadcrumb,
  title,
  description,
  children,
}: {
  breadcrumb: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-5 sm:py-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{breadcrumb}</div>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
