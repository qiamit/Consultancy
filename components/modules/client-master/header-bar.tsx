"use client";

import { useState } from "react";
import { useGoPageDraft } from "@/components/modules/finance/use-finance-master-state";
import { CLIENT_FIELD_LABEL_CLASS } from "./constants";
import { PAGE_SIZE_OPTIONS } from "./search-utils";

const pageBtn =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

export function ClientMasterHeaderBar({
  onAddNew,
  searchQuery,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  grandTotal,
  filteredTotal,
  page,
  totalPages,
  onPageChange,
}: {
  onAddNew: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  grandTotal: number;
  filteredTotal: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const searchActive = searchQuery.trim().length > 0;
  const { goDisplay: goDraft, setGoDraft, clearGoDraft } = useGoPageDraft(page);

  function handleGoTo() {
    const n = Number.parseInt(goDraft.trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      setGoDraft(null);
      return;
    }
    const p = Math.min(n, totalPages);
    clearGoDraft();
    onPageChange(p);
  }

  const showPagination = filteredTotal > 0;
  const navDisabled = grandTotal === 0;

  return (
    <header className="border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="shrink-0">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Client Master
          </h1>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="client-master-search" className="sr-only">
              Search all fields: company, GST, contact, address, balance, notes,
              and more
            </label>
            <input
              id="client-master-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search All Fields"
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
            <select
              id="client-master-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Entries per page"
              title="Entries per page"
              className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            {searchActive && filteredTotal !== grandTotal ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {filteredTotal} match
                  {filteredTotal === 1 ? "" : "es"}
                </span>
              </p>
            ) : null}

            {showPagination ? (
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-zinc-200 pt-2 sm:w-auto sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 dark:border-zinc-600">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Page{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {page}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {totalPages}
                  </span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={navDisabled || page <= 1}
                    onClick={() => { clearGoDraft(); onPageChange(page - 1); }}
                    className={pageBtn}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={navDisabled || page >= totalPages}
                    onClick={() => { clearGoDraft(); onPageChange(page + 1); }}
                    className={pageBtn}
                  >
                    Next
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <label htmlFor="client-master-go-page" className={CLIENT_FIELD_LABEL_CLASS}>
                    Go to
                  </label>
                  <input
                    id="client-master-go-page"
                    type="number"
                    min={1}
                    max={totalPages}
                    value={goDraft}
                    onChange={(e) => setGoDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGoTo();
                      }
                    }}
                    className="w-14 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-center text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    aria-label="Page number to go to"
                  />
                  <button
                    type="button"
                    onClick={handleGoTo}
                    disabled={navDisabled}
                    className={`${pageBtn} px-3`}
                  >
                    Go
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex shrink-0 items-center justify-center self-start rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 sm:self-center lg:self-center"
        >
          Add New Client
        </button>
      </div>
    </header>
  );
}
