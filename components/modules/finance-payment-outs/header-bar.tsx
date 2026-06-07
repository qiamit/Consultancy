"use client";

import { useEffect, useState } from "react";
import { CLIENT_FIELD_LABEL_CLASS } from "@/components/modules/client-master/constants";
import { PAGE_SIZE_OPTIONS } from "./search-utils";

const pageBtn =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

export function FinancePaymentOutsHeaderBar(props: {
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
  const {
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
  } = props;
  const [goDraft, setGoDraft] = useState(String(page));
  useEffect(() => setGoDraft(String(page)), [page]);
  const searchActive = searchQuery.trim().length > 0;
  const navDisabled = grandTotal === 0;
  return (
    <header className="border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Payment OUT</h1>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search date, client, amount, status..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={navDisabled || page <= 1}
              onClick={() => onPageChange(page - 1)}
              className={pageBtn}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={navDisabled || page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className={pageBtn}
            >
              Next
            </button>
            <label className={CLIENT_FIELD_LABEL_CLASS}>Go</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={goDraft}
              onChange={(e) => setGoDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onPageChange(Math.max(1, Math.min(totalPages, Number(goDraft) || 1)));
              }}
              className="w-14 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-center text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
            {searchActive && filteredTotal !== grandTotal ? (
              <span className="text-xs text-zinc-600 dark:text-zinc-400">{filteredTotal} matches</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Add New Payment
        </button>
      </div>
    </header>
  );
}


