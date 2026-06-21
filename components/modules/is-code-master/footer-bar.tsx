"use client";

import { useRef } from "react";

const btn =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

export function IsCodeMasterFooterBar({
  matchedCount,
  grandCount,
  searchActive,
  selectedCount,
  onImportFile,
  onExport,
  onPrintList,
  onDelete,
  deleteDisabled,
}: {
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  selectedCount: number;
  onImportFile: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const subsetNote =
    searchActive && matchedCount !== grandCount
      ? ` (${matchedCount} of ${grandCount} loaded)`
      : "";

  return (
    <tfoot className="border-t border-zinc-200 bg-zinc-100 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200">
      <tr>
        <td colSpan={7} className="px-3 py-2 align-middle">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="min-w-0 shrink-0">
              <span>Total Entries: {matchedCount}</span>
              {subsetNote ? (
                <span className="block text-xs font-normal text-zinc-600 dark:text-zinc-400 lg:inline lg:before:content-['_·_']">
                  {subsetNote.trim()}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onImportFile(f);
                }}
              />
              <button
                type="button"
                className={`${btn} border-violet-400 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40`}
                title="Open QE Assistant — AI-powered Quality Engineering helper"
                onClick={() => window.dispatchEvent(new CustomEvent("qe-assistant:open", { detail: { module: "is-codes" } }))}
              >
                QE Assistant
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => fileRef.current?.click()}
              >
                Import
              </button>
              <button type="button" className={btn} onClick={onExport}>
                Export
              </button>
              <button
                type="button"
                className={btn}
                onClick={onPrintList}
                title={
                  selectedCount > 0
                    ? `Print ${selectedCount} selected row${selectedCount === 1 ? "" : "s"} (current search)`
                    : "Print all rows matching the current search (check rows to print only those)"
                }
              >
                Print
              </button>
              <button
                type="button"
                className={`${btn} border-red-300 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50`}
                disabled={deleteDisabled}
                title={
                  deleteDisabled
                    ? "Select one or more rows, or open a record with Edit, then use Delete"
                    : selectedCount > 0
                      ? `Delete ${selectedCount} selected record${selectedCount === 1 ? "" : "s"}`
                      : "Delete the IS code currently open for edit"
                }
                onClick={onDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  );
}
