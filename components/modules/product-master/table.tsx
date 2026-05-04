"use client";

import { useEffect, useRef } from "react";
import type { ProductMasterRow } from "@/lib/types/product-master";
import { ProductMasterFooterBar } from "./footer-bar";

const COL_COUNT = 8;

function dash(v: string | null | undefined): string {
  return v == null || v === "" ? "—" : v;
}

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function categoryLabel(c: ProductMasterRow): string {
  return c.category === "service" ? "Service" : "Product";
}

function GroupCell({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  /** Category column reads better left-aligned; other columns stay centered. */
  align?: "center" | "left";
}) {
  const ta = align === "left" ? "text-left" : "text-center";
  return (
    <td className={`align-middle px-3 py-2 ${ta} text-zinc-700 dark:text-zinc-300`}>
      <div className={`space-y-1 text-sm leading-snug ${ta}`}>{children}</div>
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
      aria-label="Select all items on this page"
    />
  );
}

export function ProductMasterTable({
  rows,
  idParam,
  onEditRow,
  matchedCount,
  grandCount,
  searchActive,
  onImportFile,
  onExport,
  onPrintList,
  onDelete,
  deleteDisabled,
  onDeleteRow,
  selectedIds,
  onToggleRowSelection,
  onToggleSelectPage,
}: {
  rows: ProductMasterRow[];
  idParam: string | null;
  onEditRow: (r: ProductMasterRow) => void;
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  onImportFile: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  onDeleteRow: (r: ProductMasterRow) => void;
  selectedIds: ReadonlySet<string>;
  onToggleRowSelection: (id: string) => void;
  onToggleSelectPage: () => void;
}) {
  const emptyMaster = grandCount === 0;
  const noMatches = !emptyMaster && rows.length === 0;
  const pageRowIds = rows.map((r) => r.id);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1120px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-100 text-center text-xs font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
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
            <th className="min-w-[140px] px-3 py-2 text-left align-middle">
              Category
            </th>
            <th className="min-w-[240px] px-3 py-2 text-center align-middle">
              {"Name & Description"}
            </th>
            <th className="min-w-[120px] px-3 py-2 text-center align-middle">
              Unit / Make
            </th>
            <th className="min-w-[100px] px-3 py-2 text-center align-middle">
              HSN / GST
            </th>
            <th className="min-w-[160px] px-3 py-2 text-center align-middle">
              Prices
            </th>
            <th className="min-w-[120px] px-3 py-2 text-center align-middle">
              Stock
            </th>
            <th className="min-w-[5.5rem] px-2 py-2 text-center align-middle">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950/40">
          {emptyMaster ? (
            <tr>
              <td
                colSpan={COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No items yet. Use &quot;Add New Item&quot; to open the form and
                save.
              </td>
            </tr>
          ) : noMatches ? (
            <tr>
              <td
                colSpan={COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No records match your search. Try different keywords or clear
                the search box.
              </td>
            </tr>
          ) : (
            rows.map((c) => {
              const active = idParam === c.id;
              const rowLabel = `Select ${c.item_code}: ${c.name}`;
              const isProduct = c.category === "product";
              return (
                <tr
                  key={c.id}
                  className={
                    active
                      ? "bg-sky-50 dark:bg-sky-950/30"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  }
                >
                  <td className="w-11 px-2 py-2 text-center align-middle">
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => onToggleRowSelection(c.id)}
                        className={chk}
                        aria-label={rowLabel}
                        title={rowLabel}
                      />
                    </div>
                  </td>
                  <GroupCell align="left">
                    <StackLine muted className="text-[11px]">
                      {categoryLabel(c)}
                    </StackLine>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {dash(c.item_code)}
                    </div>
                  </GroupCell>

                  <GroupCell>
                    <StackLine>{dash(c.name)}</StackLine>
                    <StackLine muted className="line-clamp-2 text-[11px]">
                      {dash(c.description)}
                    </StackLine>
                  </GroupCell>

                  <GroupCell>
                    <StackLine>{dash(c.unit_of_item)}</StackLine>
                    <StackLine muted className="text-[11px]">
                      {dash(c.make)}
                    </StackLine>
                  </GroupCell>

                  <GroupCell>
                    <StackLine className="tabular-nums">{dash(c.hsn_code)}</StackLine>
                    <StackLine muted className="text-[11px]">
                      {dash(c.gst_rate)}
                    </StackLine>
                  </GroupCell>

                  <GroupCell>
                    <StackLine muted className="tabular-nums text-[11px]">
                      MRP {formatInr(c.mrp)}
                    </StackLine>
                    <StackLine muted className="tabular-nums text-[11px]">
                      Sale {formatInr(c.sale_price)}
                    </StackLine>
                    {isProduct ? (
                      <StackLine muted className="tabular-nums text-[11px]">
                        Purchase {formatInr(c.purchase_price)}
                      </StackLine>
                    ) : (
                      <StackLine muted className="text-[11px]">
                        —
                      </StackLine>
                    )}
                  </GroupCell>

                  <GroupCell>
                    {isProduct ? (
                      <>
                        <StackLine muted className="text-[11px]">
                          Open: {dash(c.opening_stock)}
                        </StackLine>
                        <StackLine muted className="text-[11px]">
                          Low: {dash(c.low_stock_value)}
                        </StackLine>
                      </>
                    ) : (
                      <StackLine muted className="text-[11px]">
                        —
                      </StackLine>
                    )}
                  </GroupCell>

                  <td className="align-middle px-2 py-2 text-center">
                    <div
                      className="flex flex-col items-center gap-1.5"
                      role="group"
                      aria-label="Row actions"
                    >
                      <button
                        type="button"
                        onClick={() => onEditRow(c)}
                        className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRow(c)}
                        className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <ProductMasterFooterBar
          matchedCount={matchedCount}
          grandCount={grandCount}
          searchActive={searchActive}
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
