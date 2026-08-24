"use client";

import { useEffect, useRef } from "react";
import type { ClientMasterRow } from "@backend/shared/types/client-master";
import { formatClientPhoneDisplay } from "./constants";
import { ClientMasterFooterBar } from "./footer-bar";

const COL_COUNT = 7;

function dash(v: string | null | undefined): string {
  return v == null || v === "" ? "—" : v;
}

function formatPayTerm(term: string | null | undefined): string {
  if (!term) return "—";
  if (term === "100% Advance") return "100 % Advance";
  return term;
}

/** Single flowing line of address parts (spaces only; wraps in UI). */
function addressInline(c: ClientMasterRow): string {
  const parts = [c.address, c.city, c.pin_code, c.state, c.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
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

/** Stacked value only (column header in `thead` provides context). */
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
      aria-label="Select all clients on this page"
    />
  );
}

export function ClientMasterTable({
  clients,
  idParam,
  onEditRow,
  matchedCount,
  grandCount,
  searchActive,
  openingBalanceSum,
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
  clients: ClientMasterRow[];
  idParam: string | null;
  onEditRow: (c: ClientMasterRow) => void;
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  openingBalanceSum: number;
  onImportFile: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  onDeleteRow: (c: ClientMasterRow) => void;
  selectedIds: ReadonlySet<string>;
  onToggleRowSelection: (id: string) => void;
  onToggleSelectPage: () => void;
}) {
  const emptyMaster = grandCount === 0;
  const noMatches = !emptyMaster && clients.length === 0;
  const pageRowIds = clients.map((c) => c.id);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1000px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
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
            <th className="min-w-[140px] px-3 py-2">Company Details</th>
            <th className="min-w-[120px] px-3 py-2 text-center">Company Status</th>
            <th className="min-w-[130px] px-3 py-2 text-center">Contact Details</th>
            <th className="min-w-[180px] px-3 py-2 text-center">Address</th>
            <th className="min-w-[120px] px-3 py-2 text-center">Balance Details</th>
            <th className="min-w-[5.5rem] px-2 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950/40">
          {emptyMaster ? (
            <tr>
              <td
                colSpan={COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No clients yet. Use &quot;Add New Client&quot; to open the form
                and save.
              </td>
            </tr>
          ) : noMatches ? (
            <tr>
              <td
                colSpan={COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No clients match your search. Try different keywords or clear
                the search box.
              </td>
            </tr>
          ) : (
            clients.map((c) => {
              const active = idParam === c.id;
              const company = c.company_name ?? c.name;
              const rowLabel = `Select ${company}`;
              return (
                <tr
                  key={c.id}
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
                        checked={selectedIds.has(c.id)}
                        onChange={() => onToggleRowSelection(c.id)}
                        className={chk}
                        aria-label={rowLabel}
                        title={rowLabel}
                      />
                    </div>
                  </td>
                  <GroupCell>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {company}
                    </div>
                    <StackLine>{dash(c.gst_number)}</StackLine>
                  </GroupCell>

                  <GroupCell textCenter>
                    <StackLine>{dash(c.company_type)}</StackLine>
                    <StackLine>{dash(c.company_scale)}</StackLine>
                    <StackLine>{dash(c.company_status)}</StackLine>
                  </GroupCell>

                  <GroupCell textCenter>
                    <StackLine>{dash(c.contact_person_name)}</StackLine>
                    <StackLine>{dash(formatClientPhoneDisplay(c))}</StackLine>
                    <StackLine>
                      <span className="block w-full break-all">{dash(c.email)}</span>
                    </StackLine>
                  </GroupCell>

                  <td className="max-w-[20rem] min-w-0 align-top px-3 py-2 text-center text-sm leading-snug text-zinc-700 dark:text-zinc-300">
                    <div className="line-clamp-3 min-w-0 break-words text-center text-pretty [overflow-wrap:anywhere]">
                      {addressInline(c)}
                    </div>
                  </td>

                  <GroupCell textCenter>
                    <StackLine className="tabular-nums">
                      {c.opening_balance != null
                        ? Number(c.opening_balance).toLocaleString("en-IN", {
                            style: "currency",
                            currency: "INR",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"}
                    </StackLine>
                    <StackLine>{dash(c.balance_type)}</StackLine>
                    <StackLine>{formatPayTerm(c.payment_term)}</StackLine>
                  </GroupCell>

                  <td className="align-top px-2 py-2 text-center">
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
        <ClientMasterFooterBar
          matchedCount={matchedCount}
          grandCount={grandCount}
          searchActive={searchActive}
          openingBalanceSum={openingBalanceSum}
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
