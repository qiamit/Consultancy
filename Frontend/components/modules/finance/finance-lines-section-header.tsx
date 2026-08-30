"use client";

import { useEffect, useRef, useState } from "react";
import { CLIENT_FIELD_LABEL_BLOCK_CLASS } from "@/components/modules/client-master/constants";
import {
  FINANCE_LINES_COLUMN_LABELS,
  type FinanceLinesColumnKey,
} from "./finance-lines-table-columns";

const columnBtnClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

export function FinanceLinesSectionHeader({
  availableColumns,
  visibleColumns,
  onToggleColumn,
}: {
  availableColumns: readonly FinanceLinesColumnKey[];
  visibleColumns: readonly FinanceLinesColumnKey[];
  onToggleColumn: (column: FinanceLinesColumnKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="flex items-center justify-between gap-3">
      <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>
        Product &amp; Services
      </label>
      <div className="relative shrink-0" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={columnBtnClass}
          aria-expanded={open}
          aria-haspopup="true"
        >
          Column
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[10.5rem] rounded-lg border border-zinc-300 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
          >
            {availableColumns.map((column) => {
              const checked = visibleColumns.includes(column);
              return (
                <label
                  key={column}
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleColumn(column)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  {FINANCE_LINES_COLUMN_LABELS[column]}
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
