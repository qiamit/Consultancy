"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  computeLicenseDisplayStatus,
  isRenewalWindowActive,
  formatCmDisplay,
  licenceValidityDisplayWithWindow90,
  type LicenseDisplayStatus,
} from "@backend/modules/bis/bis-project-license-status";
import {
  MANAK_ONLINE_APPLICATION_LICENCE_REPORT_URL,
  manakRenewalLinkAriaLabel,
  manakRenewalLinkNativeTitle,
} from "@backend/modules/bis/manak-online-portal";
import { bisStandardsWebsiteSearchUrl } from "@backend/modules/bis/bis-standards-portal";
import type { BisProjectMasterRow } from "@backend/shared/types/bis-project-master";
import { bisIsCodeDisplayLabel } from "@backend/modules/bis/bis-project-is-code-label";
import { LicenseScopeViewModal } from "./license-scope-view-modal";
import { openManakEbisAssist } from "./manak-ebis-assist";
import {
  BisProjectsMasterFooterBar,
  BIS_PROJECTS_TABLE_COL_COUNT,
} from "./footer-bar";

/** Copy CM/L as exactly 10 digits for pasting into Manak Online search. */
function copyCmLTenDigits(cmLDigits: string | null | undefined): void {
  const digits = String(cmLDigits ?? "").replace(/\D/g, "");
  if (!digits) return;
  const ten = digits.length >= 10 ? digits.slice(-10) : digits.padStart(10, "0");
  try {
    const el = document.createElement("textarea");
    el.value = ten;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, ten.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    if (ok) return;
  } catch {
    // fall through to Clipboard API
  }
  void navigator.clipboard?.writeText(ten).catch(() => {});
}

const chk =
  "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-sky-500";

const actionLink =
  "text-sm font-medium underline-offset-2 hover:underline";

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dash(v: string | number | null | undefined): string {
  if (v == null) return "—";
  const s = String(v).trim();
  return s === "" ? "—" : s;
}

function clientLabel(r: BisProjectMasterRow): string {
  const c = r.clients;
  if (!c) return "—";
  const company = (c.company_name ?? "").trim();
  if (company) return company;
  const name = (c.name ?? "").trim();
  return name || "—";
}

function isLabel(r: BisProjectMasterRow): string {
  const i = r.is_codes;
  if (!i) return "—";
  return bisIsCodeDisplayLabel(i);
}

function licenseStatusLineClass(lic: LicenseDisplayStatus): string {
  switch (lic) {
    case "Operative":
      return "font-medium text-green-600 dark:text-green-400";
    case "Deferred":
      return "font-medium text-blue-600 dark:text-blue-400";
    case "Expired":
      return "font-medium text-red-600 dark:text-red-400";
    case "Stop Marking":
      return "font-semibold text-orange-600 dark:text-orange-400";
    default:
      return "font-medium text-zinc-500 dark:text-zinc-400";
  }
}

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
      aria-label="Select all BIS projects on this page"
    />
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      {children}
    </p>
  );
}

type RowBits = {
  r: BisProjectMasterRow;
  lic: LicenseDisplayStatus;
  cmDisplay: string;
  cmLicenceLinkable: boolean;
  renewalWindow: ReturnType<typeof licenceValidityDisplayWithWindow90> | null;
};

function rowBits(r: BisProjectMasterRow): RowBits {
  const lic = computeLicenseDisplayStatus(
    r.project_kind,
    r.license_validity_date,
    r.status,
  );
  const cmDisplay = formatCmDisplay(r.project_kind, r.cm_l_digits);
  return {
    r,
    lic,
    cmDisplay,
    cmLicenceLinkable: r.project_kind !== "application" && cmDisplay !== "—",
    renewalWindow:
      r.project_kind !== "application"
        ? licenceValidityDisplayWithWindow90(r.license_validity_date)
        : null,
  };
}

function IsCodeCell({ r }: { r: BisProjectMasterRow }) {
  if (r.is_codes) {
    return (
      <a
        href={bisStandardsWebsiteSearchUrl(isLabel(r))}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block break-words font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
      >
        {isLabel(r)}
      </a>
    );
  }
  return (
    <div className="break-words font-medium text-zinc-900 dark:text-zinc-100">
      {isLabel(r)}
    </div>
  );
}

function CmLBlock({ bits }: { bits: RowBits }) {
  const { r, lic, cmDisplay, cmLicenceLinkable } = bits;
  return (
    <div className="flex flex-col gap-0.5 leading-snug">
      {cmLicenceLinkable ? (
        <a
          href={MANAK_ONLINE_APPLICATION_LICENCE_REPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => copyCmLTenDigits(r.cm_l_digits)}
          onMouseDown={() => copyCmLTenDigits(r.cm_l_digits)}
          className="font-mono text-xs tabular-nums text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
          title="Copies 10-digit CM/L, then opens BIS Manakonline reports"
          aria-label="Copy 10-digit CM/L number and open BIS Manakonline Application and Licence related reports in a new tab"
        >
          {cmDisplay}
        </a>
      ) : (
        <div className="font-mono text-xs tabular-nums text-zinc-800 dark:text-zinc-200">
          {cmDisplay}
        </div>
      )}
      {lic === "Operative" || lic === "Deferred" || lic === "Expired" ? (
        <button
          type="button"
          onClick={() =>
            openManakEbisAssist({
              userId: r.portal_user_id,
              password: r.portal_password,
              clientName: clientLabel(r),
              isLabel: isLabel(r),
            })
          }
          className={`w-fit text-xs underline-offset-2 hover:underline ${licenseStatusLineClass(lic)}`}
          title={manakRenewalLinkNativeTitle(r.portal_user_id, r.portal_password)}
          aria-label={`${lic} status — open Manak eBIS login and copy password`}
        >
          {lic}
        </button>
      ) : (
        <div className={`text-xs ${licenseStatusLineClass(lic)}`}>{lic}</div>
      )}
    </div>
  );
}

function ValidityBlock({ bits }: { bits: RowBits }) {
  const { r, lic, renewalWindow } = bits;
  if (r.project_kind === "application") return <span>—</span>;
  if (!renewalWindow) return <span>—</span>;
  return (
    <div className="space-y-1.5 text-xs leading-snug">
      <div className="tabular-nums text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {renewalWindow.main}
      </div>
      {isRenewalWindowActive(r.license_validity_date, r.status) ? (
        <button
          type="button"
          onClick={() =>
            openManakEbisAssist({
              userId: r.portal_user_id,
              password: r.portal_password,
              clientName: clientLabel(r),
              isLabel: isLabel(r),
            })
          }
          className="inline-flex font-medium text-red-600 underline-offset-2 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
          title={manakRenewalLinkNativeTitle(r.portal_user_id, r.portal_password)}
          aria-label={manakRenewalLinkAriaLabel(r.portal_user_id, r.portal_password)}
        >
          Apply for Renewal
        </button>
      ) : lic === "Stop Marking" ? (
        <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
          Restore Compliance
        </span>
      ) : lic === "Expired" ? (
        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Fresh Application
        </span>
      ) : null}
    </div>
  );
}

function RowActions({
  r,
  onEditRow,
  onDeleteRow,
  onScope,
  stack = false,
}: {
  r: BisProjectMasterRow;
  onEditRow: (r: BisProjectMasterRow) => void;
  onDeleteRow: (r: BisProjectMasterRow) => void;
  onScope: (r: BisProjectMasterRow) => void;
  stack?: boolean;
}) {
  return (
    <div
      className={
        stack
          ? "flex flex-col items-center gap-1.5"
          : "flex flex-wrap items-center gap-3"
      }
      role="group"
      aria-label="Row actions"
    >
      <button
        type="button"
        onClick={() => onScope(r)}
        className={`${actionLink} text-sky-600 dark:text-sky-400`}
        title="View licence scope"
      >
        Scope
      </button>
      <button
        type="button"
        onClick={() => onEditRow(r)}
        className={`${actionLink} text-sky-600 dark:text-sky-400`}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDeleteRow(r)}
        className={`${actionLink} text-red-600 dark:text-red-400`}
      >
        Delete
      </button>
    </div>
  );
}

export function BisProjectsMasterTable({
  rows,
  idParam,
  onEditRow,
  matchedCount,
  grandCount,
  searchActive,
  page,
  totalPages,
  onPageChange,
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
  rows: BisProjectMasterRow[];
  idParam: string | null;
  onEditRow: (r: BisProjectMasterRow) => void;
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onImportFile: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  onDeleteRow: (r: BisProjectMasterRow) => void;
  selectedIds: ReadonlySet<string>;
  onToggleRowSelection: (id: string) => void;
  onToggleSelectPage: () => void;
}) {
  const emptyMaster = grandCount === 0;
  const noMatches = !emptyMaster && rows.length === 0;
  const pageRowIds = rows.map((r) => r.id);
  const [scopeViewRow, setScopeViewRow] = useState<BisProjectMasterRow | null>(null);

  const footerProps = {
    matchedCount,
    grandCount,
    searchActive,
    selectedCount: selectedIds.size,
    page,
    totalPages,
    onPageChange,
    onImportFile,
    onExport,
    onPrintList,
    onDelete,
    deleteDisabled,
  };

  const emptyMessage = emptyMaster
    ? 'No BIS projects yet. Use "Add New Project" to open the form and save.'
    : "No records match your search. Try different keywords or clear the search box.";

  return (
    <>
      {/* Mobile / PWA — stacked cards (Client Master style readability) */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/80">
          <PageSelectAllCheckbox
            pageRowIds={pageRowIds}
            selectedIds={selectedIds}
            onTogglePage={onToggleSelectPage}
          />
          <span className="text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">
            Select page
          </span>
        </div>

        {emptyMaster || noMatches ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">{emptyMessage}</p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((r) => {
              const active = idParam === r.id;
              const bits = rowBits(r);
              const rowLabel = `Select ${clientLabel(r)}`;
              return (
                <article
                  key={r.id}
                  className={`space-y-3 px-3 py-3 ${
                    active ? "bg-sky-50 dark:bg-sky-950/30" : "bg-white dark:bg-zinc-950/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => onToggleRowSelection(r.id)}
                      className={`${chk} mt-0.5 shrink-0`}
                      aria-label={rowLabel}
                      title={rowLabel}
                    />
                    <div className="min-w-0 flex-1">
                      <FieldLabel>Name of the Client</FieldLabel>
                      <p className="break-words text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                        {clientLabel(r)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <FieldLabel>IS Code</FieldLabel>
                      <IsCodeCell r={r} />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel>CM/L Number</FieldLabel>
                      <CmLBlock bits={bits} />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel>License Validity</FieldLabel>
                      <ValidityBlock bits={bits} />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel>Billing</FieldLabel>
                      <div className="space-y-0.5 text-sm leading-snug text-zinc-700 dark:text-zinc-300">
                        <div className="tabular-nums">{formatInr(r.billing_amount)}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {dash(r.billing_frequency)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Action</FieldLabel>
                    <RowActions
                      r={r}
                      onEditRow={onEditRow}
                      onDeleteRow={onDeleteRow}
                      onScope={setScopeViewRow}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <BisProjectsMasterFooterBar
          {...footerProps}
          asBar
          goPageInputId="bis-projects-master-go-page-mobile"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1000px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-100 text-left text-xs font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
            <tr>
              <th className="w-11 px-2 py-2 text-center align-middle">
                <div className="flex items-center justify-center">
                  <PageSelectAllCheckbox
                    pageRowIds={pageRowIds}
                    selectedIds={selectedIds}
                    onTogglePage={onToggleSelectPage}
                  />
                </div>
              </th>
              <th className="min-w-[180px] px-3 py-2">Name of the Client</th>
              <th className="min-w-[140px] px-3 py-2">IS Code</th>
              <th className="min-w-[130px] px-3 py-2 text-center">CM/L Number</th>
              <th className="min-w-[120px] px-3 py-2 text-center">License Validity</th>
              <th className="min-w-[110px] px-3 py-2 text-center">Billing</th>
              <th className="min-w-[5.5rem] px-2 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950/40">
            {emptyMaster || noMatches ? (
              <tr>
                <td
                  colSpan={BIS_PROJECTS_TABLE_COL_COUNT}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const active = idParam === r.id;
                const bits = rowBits(r);
                const rowLabel = `Select ${clientLabel(r)}`;
                return (
                  <tr
                    key={r.id}
                    className={
                      active
                        ? "bg-sky-50 dark:bg-sky-950/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }
                  >
                    <td className="w-11 px-2 py-2 text-center align-middle">
                      <div className="flex items-center justify-center">
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
                    <td className="align-top px-3 py-2">
                      <div className="max-w-[240px] break-words font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                        {clientLabel(r)}
                      </div>
                    </td>
                    <td className="align-top px-3 py-2">
                      <div className="max-w-[200px]">
                        <IsCodeCell r={r} />
                      </div>
                    </td>
                    <td className="align-top px-3 py-2 text-center">
                      <div className="flex flex-col items-center">
                        <CmLBlock bits={bits} />
                      </div>
                    </td>
                    <td className="align-top px-3 py-2 text-center text-zinc-700 dark:text-zinc-300">
                      <div className="flex justify-center text-center">
                        <ValidityBlock bits={bits} />
                      </div>
                    </td>
                    <td className="align-top px-3 py-2 text-center text-xs text-zinc-700 dark:text-zinc-300">
                      <div className="space-y-1 whitespace-nowrap leading-snug">
                        <div className="tabular-nums">{formatInr(r.billing_amount)}</div>
                        <div className="text-zinc-500 dark:text-zinc-400">
                          {dash(r.billing_frequency)}
                        </div>
                      </div>
                    </td>
                    <td className="align-top px-2 py-2 text-center">
                      <RowActions
                        r={r}
                        onEditRow={onEditRow}
                        onDeleteRow={onDeleteRow}
                        onScope={setScopeViewRow}
                        stack
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <BisProjectsMasterFooterBar
            {...footerProps}
            goPageInputId="bis-projects-master-go-page"
          />
        </table>
      </div>

      {scopeViewRow && (
        <LicenseScopeViewModal row={scopeViewRow} onClose={() => setScopeViewRow(null)} />
      )}
    </>
  );
}
