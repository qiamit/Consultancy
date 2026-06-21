import type { ReactNode } from "react";

export function FinanceModuleShell({
  breadcrumb,
  title,
  description,
  actions,
  children,
}: {
  breadcrumb: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
      <header className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3 sm:px-5 sm:py-4">
        <div className="text-[11px] font-medium text-zinc-500">{breadcrumb}</div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{title}</h1>
            {description ? (
              <p className="mt-0.5 max-w-2xl text-sm text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
