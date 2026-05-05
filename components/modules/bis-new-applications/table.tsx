"use client";

import { useEffect, useRef } from "react";
import {
  computeLicenseDisplayStatus,
  formatCmDisplay,
  licenceValidityDisplayWithWindow90,
  type LicenseDisplayStatus,
} from "@/lib/bis-project-license-status";
import {
  MANAK_ONLINE_APPLICATION_LICENCE_REPORT_URL,
  manakOnlineEbisLoginHref,
  manakRenewalLinkAriaLabel,
  manakRenewalLinkNativeTitle,
} from "@/lib/manak-online-portal";
import { bisStandardsWebsiteSearchUrl } from "@/lib/bis-standards-portal";
import type { BisNewApplicationMasterRow } from "@/lib/types/bis-new-application-master";
import { bisIsCodeDisplayLabel } from "@/lib/bis-project-is-code-label";
import { projectKindLabel } from "./constants";
import {
  BisNewApplicationsMasterFooterBar,
  BIS_PROJECTS_TABLE_COL_COUNT,
} from "./footer-bar";

/** User ID is passed via `?userId=` on the link; clipboard carries password only. */
function copyManakPortalPasswordOnly(
  portalPassword: string | null | undefined,
): void {
  const pass = (portalPassword ?? "").trim();
  if (!pass) return;
  void navigator.clipboard.writeText(pass).catch(() => {});
}

const chk =
  "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-sky-500";

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dash(v: string | null | undefined): string {
  return v == null || v === "" ? "—" : v;
}

function clientLabel(r: BisNewApplicationMasterRow): string {
  const c = r.clients;
  if (!c) return "—";
  const company = (c.company_name ?? "").trim();
  if (company) return company;
  const name = (c.name ?? "").trim();
  return name || "—";
}

function isLabel(r: BisNewApplicationMasterRow): string {
  const i = r.is_codes;
  if (!i) return "—";
  return bisIsCodeDisplayLabel(i);
}

function licenseStatusLineClass(lic: LicenseDisplayStatus): string {
  switch (lic) {
    case "Operative":
      return "font-medium text-green-600 dark:text-green-400";
    case "Deferred":
      return "font-medium text-amber-600 dark:text-amber-400";
    case "Expired":
      return "font-medium text-red-600 dark:text-red-400";
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
      aria-label="Select all BIS new applications on this page"
    />
  );
}

export function BisNewApplicationsMasterTable({
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
  rows: BisNewApplicationMasterRow[];
  idParam: string | null;
  onEditRow: (r: BisNewApplicationMasterRow) => void;
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  onImportFile: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  onDeleteRow: (r: BisNewApplicationMasterRow) => void;
  selectedIds: ReadonlySet<string>;
  onToggleRowSelection: (id: string) => void;
  onToggleSelectPage: () => void;
}) {
  const emptyMaster = grandCount === 0;
  const noMatches = !emptyMaster && rows.length === 0;
  const pageRowIds = rows.map((r) => r.id);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[860px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
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
            <th className="min-w-[200px] px-3 py-2">IS Code & Type</th>
            <th className="min-w-[160px] px-3 py-2 text-center">
              Name of the Client
            </th>
            <th className="min-w-[130px] px-3 py-2 text-center">CM/L Number</th>
            <th className="min-w-[110px] px-3 py-2 text-center">
              License Validity
            </th>
            <th className="min-w-[120px] px-3 py-2 text-center">Billing</th>
            <th className="min-w-[5.5rem] px-2 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950/40">
          {emptyMaster ? (
            <tr>
              <td
                colSpan={BIS_PROJECTS_TABLE_COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No BIS new applications yet. Use &quot;Add New&quot; to open the form
                and save.
              </td>
            </tr>
          ) : noMatches ? (
            <tr>
              <td
                colSpan={BIS_PROJECTS_TABLE_COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No records match your search. Try different keywords or clear the
                search box.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const active = idParam === r.id;
              const lic = computeLicenseDisplayStatus(
                r.project_kind,
                r.license_validity_date,
              );
              const cmDisplay = formatCmDisplay(r.project_kind, r.cm_l_digits);
              const cmLicenceLinkable =
                r.project_kind !== "application" && cmDisplay !== "—";
              const renewalWindow =
                r.project_kind !== "application"
                  ? licenceValidityDisplayWithWindow90(r.license_validity_date)
                  : null;
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
                  <td className="align-top px-3 py-2 text-zinc-800 dark:text-zinc-200">
                    <div className="max-w-[240px] space-y-1 break-words leading-snug">
                      {r.is_codes ? (
                        <a
                          href={bisStandardsWebsiteSearchUrl(isLabel(r))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
                        >
                          {isLabel(r)}
                        </a>
                      ) : (
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {isLabel(r)}
                        </div>
                      )}
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        {projectKindLabel(r.project_kind)}
                      </div>
                    </div>
                  </td>
                  <td className="align-top px-3 py-2 text-center text-zinc-700 dark:text-zinc-300">
                    <div className="mx-auto max-w-[220px] break-words leading-snug">
                      {clientLabel(r)}
                    </div>
                  </td>
                  <td className="align-top px-3 py-2 text-center text-zinc-700 dark:text-zinc-300">
                    <div className="mx-auto min-w-0 max-w-[200px] space-y-1 text-center leading-snug">
                      {cmLicenceLinkable ? (
                        <a
                          href={MANAK_ONLINE_APPLICATION_LICENCE_REPORT_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block font-mono text-xs tabular-nums text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
                          title="Open BIS Manakonline — Application/Licence related reports (new tab)"
                          aria-label="Open BIS Manakonline Application and Licence related reports in a new tab"
                        >
                          {cmDisplay}
                        </a>
                      ) : (
                        <div className="font-mono text-xs tabular-nums text-zinc-800 dark:text-zinc-200">
                          {cmDisplay}
                        </div>
                      )}
                      <div className={`text-xs ${licenseStatusLineClass(lic)}`}>
                        {lic}
                      </div>
                    </div>
                  </td>
                  <td className="align-top px-3 py-2 text-center text-zinc-700 dark:text-zinc-300">
                    {r.project_kind === "application" ? (
                      "—"
                    ) : renewalWindow ? (
                      <div className="mx-auto max-w-[11rem] space-y-1.5 text-center text-xs leading-snug">
                        <div className="tabular-nums text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {renewalWindow.main}
                        </div>
                        <a
                          href={manakOnlineEbisLoginHref(r.portal_user_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => copyManakPortalPasswordOnly(r.portal_password)}
                          className="inline-block font-medium text-red-600 underline-offset-2 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
                          title={manakRenewalLinkNativeTitle(
                            r.portal_user_id,
                            r.portal_password,
                          )}
                          aria-label={manakRenewalLinkAriaLabel(
                            r.portal_user_id,
                            r.portal_password,
                          )}
                        >
                          Apply for Renewal
                        </a>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="align-top px-3 py-2 text-center text-xs text-zinc-700 dark:text-zinc-300">
                    <div className="mx-auto min-w-0 max-w-[220px] space-y-1 text-center leading-snug">
                      <div className="tabular-nums">{formatInr(r.billing_amount)}</div>
                      <div className="text-zinc-500 dark:text-zinc-400">
                        {dash(r.billing_frequency)}
                      </div>
                    </div>
                  </td>
                  <td className="align-top px-2 py-2 text-center">
                    <div
                      className="flex flex-col items-center gap-1.5"
                      role="group"
                      aria-label="Row actions"
                    >
                      <button
                        type="button"
                        onClick={() => onEditRow(r)}
                        className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRow(r)}
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
        <BisNewApplicationsMasterFooterBar
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
