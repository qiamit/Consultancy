"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { SALES_ORDER_LIST_PATH } from "@/components/modules/finance-sales-orders/constants";
import { TAX_INVOICE_LIST_PATH } from "@/components/modules/finance-tax-invoices/constants";
import type { FinanceQuotationRow } from "@backend/shared/types/finance-quotation";
import { formatDateField } from "@backend/shared/format-date";
import { FinanceQuotationsFooterBar } from "./footer-bar";

const COL_COUNT = 7;

function clientLabel(r: FinanceQuotationRow): string {
  const c = r.clients;
  if (!c) return "—";
  const company = (c.company_name ?? "").trim();
  const name = (c.name ?? "").trim();
  return company || name || "—";
}

function dash(v: string | null | undefined): string {
  return v == null || v === "" ? "—" : v;
}

function GroupCell({
  children,
  textCenter,
}: {
  children: React.ReactNode;
  textCenter?: boolean;
}) {
  return (
    <td
      className={`align-top px-3 py-2 text-zinc-700 dark:text-zinc-300${textCenter ? " text-center" : ""}`}
    >
      <div
        className={`space-y-1 text-sm leading-snug${textCenter ? " text-center" : ""}`}
      >
        {children}
      </div>
    </td>
  );
}

function StackLine({
  children,
  muted,
  className = "",
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  const base = muted
    ? "text-xs text-zinc-500 dark:text-zinc-400"
    : "text-zinc-700 dark:text-zinc-300";
  return <div className={`${base} ${className}`.trim()}>{children}</div>;
}

const chk =
  "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-sky-500";

function PageSelectAllCheckbox({
  pageRowIds,
  selectedIds,
  onTogglePage,
}: {
  pageRowIds: string[];
  selectedIds: ReadonlySet<string>;
  onTogglePage: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const disabled = pageRowIds.length === 0;
  const allSelected =
    !disabled && pageRowIds.every((id) => selectedIds.has(id));
  const someSelected =
    !disabled && pageRowIds.some((id) => selectedIds.has(id)) && !allSelected;

  useEffect(() => {
    const el = ref.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <input
      ref={ref}
      type="checkbox"
      disabled={disabled}
      checked={allSelected}
      onChange={onTogglePage}
      className={chk}
      title="Select all on this page"
      aria-label="Select all quotations on this page"
    />
  );
}

export function FinanceQuotationsTable({
  rows,
  idParam,
  onEditRow,
  onDownloadRow,
  onShareRow,
  onStatusChange,
  matchedCount,
  grandCount,
  searchActive,
  grandTotalSum,
  onImportFile,
  onExport,
  onPrintList,
  onDelete,
  deleteDisabled,
  selectedIds,
  onToggleRowSelection,
  onToggleSelectPage,
}: {
  rows: FinanceQuotationRow[];
  idParam: string | null;
  onEditRow: (r: FinanceQuotationRow) => void;
  onDownloadRow: (r: FinanceQuotationRow) => void;
  onShareRow: (r: FinanceQuotationRow) => void | Promise<void>;
  onStatusChange: (
    r: FinanceQuotationRow,
    status: "pending" | "accepted" | "cancelled",
  ) => void;
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  grandTotalSum: number;
  onImportFile: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleRowSelection: (id: string) => void;
  onToggleSelectPage: () => void;
}) {
  const emptyMaster = grandCount === 0;
  const noMatches = !emptyMaster && rows.length === 0;
  const pageRowIds = rows.map((r) => r.id);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[920px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-100 text-left text-xs font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
          <tr>
            <th className="w-11 px-2 py-2 text-center align-middle">
              <div className="flex justify-center">
                <PageSelectAllCheckbox
                  pageRowIds={pageRowIds}
                  selectedIds={selectedIds}
                  onTogglePage={onToggleSelectPage}
                />
              </div>
            </th>
            <th className="min-w-[160px] px-3 py-2">Quotation Details</th>
            <th className="min-w-[160px] px-3 py-2 text-center">Client</th>
            <th className="min-w-[100px] px-3 py-2 text-center">Type</th>
            <th className="min-w-[90px] px-3 py-2 text-center">Status</th>
            <th className="min-w-[120px] px-3 py-2 text-right">Total</th>
            <th className="w-[15%] px-2 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950/40">
          {emptyMaster ? (
            <tr>
              <td
                colSpan={COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No quotations yet. Use &quot;Add New Quotation&quot; to open the
                form and save.
              </td>
            </tr>
          ) : noMatches ? (
            <tr>
              <td
                colSpan={COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No quotations match your search. Try different keywords or clear
                the search box.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const active = idParam === r.id;
              const rowLabel = `Select ${r.quotation_number}`;
              return (
                <tr
                  key={r.id}
                  className={
                    active
                      ? "bg-sky-50 dark:bg-sky-950/30"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  }
                >
                  <td className="w-11 px-2 py-2 text-center align-top">
                    <div className="flex justify-center pt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => onToggleRowSelection(r.id)}
                        className={chk}
                        aria-label={rowLabel}
                        title={rowLabel}
                      />
                    </div>
                  </td>
                  <GroupCell>
                    <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {r.quotation_number}
                    </div>
                    <StackLine muted>Date: {formatDateField(r.quotation_date)}</StackLine>
                  </GroupCell>

                  <GroupCell textCenter>
                    <StackLine>{clientLabel(r)}</StackLine>
                  </GroupCell>

                  <GroupCell textCenter>
                    <StackLine className="capitalize">{r.quotation_type}</StackLine>
                  </GroupCell>

                  <GroupCell textCenter>
                    <select
                      value={r.quotation_status ?? "pending"}
                      onChange={(e) =>
                        onStatusChange(
                          r,
                          e.target.value as "pending" | "accepted" | "cancelled",
                        )
                      }
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs capitalize text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </GroupCell>

                  <td className="align-top px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                    <div>
                      {Number(r.grand_total).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      GST:{" "}
                      {Number(r.tax_total).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </td>

                  <td className="align-top px-2 py-2 text-right">
                    <div
                      className="flex flex-col items-end gap-1"
                      role="group"
                      aria-label="Row actions"
                    >
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditRow(r)}
                          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          Edit
                        </button>
                        <span className="text-zinc-400 dark:text-zinc-600">
                          |
                        </span>
                        <Link
                          href={`${SALES_ORDER_LIST_PATH}?new=1&quotation_id=${encodeURIComponent(r.id)}`}
                          className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          Sales Order
                        </Link>
                        <span className="text-zinc-400 dark:text-zinc-600">
                          |
                        </span>
                        <Link
                          href={`${TAX_INVOICE_LIST_PATH}?new=1&quotation_id=${encodeURIComponent(r.id)}`}
                          className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                        >
                          Tax Invoice
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void onShareRow(r)}
                          className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                        >
                          Share
                        </button>
                        <span className="text-zinc-400 dark:text-zinc-600">
                          |
                        </span>
                        <button
                          type="button"
                          onClick={() => onDownloadRow(r)}
                          className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <FinanceQuotationsFooterBar
          matchedCount={matchedCount}
          grandCount={grandCount}
          searchActive={searchActive}
          grandTotalSum={grandTotalSum}
          selectedCount={selectedIds.size}
          onImportFile={onImportFile}
          onExport={onExport}
          onPrintList={onPrintList}
          onDelete={onDelete}
          deleteDisabled={deleteDisabled}
        />
      </table>
    </div>
  );
}
