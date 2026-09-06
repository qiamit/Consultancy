"use client";

import { PAGE_SIZE_OPTIONS } from "./search-utils";

export type QeManagedListFilter = "all" | "managed" | "not_managed";

const QE_MANAGED_FILTER_OPTIONS: { value: QeManagedListFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "managed", label: "Managed by QE" },
  { value: "not_managed", label: "Not Managed by QE" },
];

export function BisProjectsMasterHeaderBar({
  title = "All BIS Licenses",
  onAddNew,
  searchQuery,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  grandTotal,
  filteredTotal,
  qeManagedFilter,
  onQeManagedFilterChange,
}: {
  title?: string;
  onAddNew: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  grandTotal: number;
  filteredTotal: number;
  /** When set, show QE management dropdown (All BIS Licenses master only). */
  qeManagedFilter?: QeManagedListFilter;
  onQeManagedFilterChange?: (v: QeManagedListFilter) => void;
}) {
  const searchActive = searchQuery.trim().length > 0;
  const filterActive = Boolean(qeManagedFilter && qeManagedFilter !== "all");

  return (
    <header className="border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="shrink-0">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <div className="w-full max-w-[min(100%,14rem)] sm:max-w-[16rem] md:max-w-[18rem] lg:max-w-[20rem]">
              <label htmlFor="bis-projects-master-search" className="sr-only">
                Search clients, IS codes, CM/L numbers, billing, and other fields
              </label>
              <input
                id="bis-projects-master-search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search All Fields"
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
            <select
              id="bis-projects-master-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Entries per page"
              title="Entries per page"
              className="shrink-0 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {qeManagedFilter && onQeManagedFilterChange ? (
              <select
                id="bis-projects-master-qe-managed-filter"
                value={qeManagedFilter}
                onChange={(e) =>
                  onQeManagedFilterChange(e.target.value as QeManagedListFilter)
                }
                aria-label="Filter by QE management"
                title="Filter by QE management"
                className="shrink-0 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {QE_MANAGED_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {(searchActive || filterActive) && filteredTotal !== grandTotal ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:ml-auto">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {filteredTotal} match{filteredTotal === 1 ? "" : "es"}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-violet-400 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 shadow-sm hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40"
            title="Open QE Assistant — AI-powered Quality Engineering helper"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("qe-assistant:open", {
                  detail: { module: "bis-projects" },
                }),
              )
            }
          >
            QE Assistant
          </button>
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            Add New Project
          </button>
        </div>
      </div>
    </header>
  );
}
