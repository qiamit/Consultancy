"use client";

import { useEffect, useRef, useState } from "react";
import { bisStandardsWebsiteSearchUrl } from "@backend/modules/bis/bis-standards-portal";
import type { IsCodeFileRow, IsCodeMasterRow } from "@backend/shared/types/is-code-master";
import { formatReaffirmationDisplay } from "./constants";
import { IsCodeMasterFooterBar } from "./footer-bar";
import { FileManagerModal } from "./file-manager-modal";

const COL_COUNT = 7;

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
  "h-4 w-4 appearance-none rounded-none border border-zinc-300 bg-white text-sky-600 accent-sky-600 focus:ring-0 dark:border-zinc-600 dark:bg-zinc-900 dark:text-sky-500";

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
      aria-label="Select all IS codes on this page"
    />
  );
}

export function IsCodeMasterTable({
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
  onFilesChanged,
}: {
  rows: IsCodeMasterRow[];
  idParam: string | null;
  onEditRow: (r: IsCodeMasterRow) => void;
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  onImportFile: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  onDeleteRow: (r: IsCodeMasterRow) => void;
  selectedIds: ReadonlySet<string>;
  onToggleRowSelection: (id: string) => void;
  onToggleSelectPage: () => void;
  onFilesChanged: (isCodeId: string, files: IsCodeFileRow[]) => void;
}) {
  const emptyMaster = grandCount === 0;
  const noMatches = !emptyMaster && rows.length === 0;
  const pageRowIds = rows.map((r) => r.id);
  const [fileManagerRow, setFileManagerRow] = useState<IsCodeMasterRow | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1000px] w-full divide-y divide-zinc-200 rounded-none text-sm dark:divide-zinc-800 [border-radius:0]">
        <thead className="rounded-none bg-zinc-100 text-left text-xs font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
          <tr className="rounded-none">
            <th className="w-11 rounded-none px-2 py-2 text-center align-middle">
              <div className="flex justify-center">
                <PageSelectAllCheckbox
                  pageRowIds={pageRowIds}
                  selectedIds={selectedIds}
                  onTogglePage={onToggleSelectPage}
                />
              </div>
            </th>
            <th className="min-w-[140px] rounded-none px-3 py-2">IS Details</th>
            <th className="min-w-[150px] rounded-none px-3 py-2 text-center">Slab Rate</th>
            <th className="min-w-[160px] rounded-none px-3 py-2 text-center">Title & Manual</th>
            <th className="min-w-[150px] rounded-none px-2 py-2 text-center">Marking Fee</th>
            <th className="min-w-[120px] rounded-none px-3 py-2 text-center">
              {"Files & Charges"}
            </th>
            <th className="min-w-[5.5rem] rounded-none px-2 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950/40">
          {emptyMaster ? (
            <tr>
              <td
                colSpan={COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No IS codes yet. Use &quot;Add New IS Code&quot; to open the form
                and save.
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
              const rowLabel = `Select ${c.is_number}: ${c.revision_year}`;
              const nFiles = c.files?.length ?? 0;
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
                    <a
                      href={bisStandardsWebsiteSearchUrl(
                        `${c.is_number}: ${c.revision_year}`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
                    >
                      {c.is_number}: {c.revision_year}
                    </a>
                    <StackLine className="text-[11px]">
                      {formatReaffirmationDisplay(c.reaffirmation_year)}
                      <span className="text-zinc-500 dark:text-zinc-500">
                        {" "}
                        |{" "}
                      </span>
                      {dash(c.amendment_number)}
                    </StackLine>
                    <StackLine className="text-[11px]">
                      {dash(c.aspect_of_is)}
                    </StackLine>
                  </GroupCell>

                  <GroupCell textCenter>
                    <StackLine muted className="tabular-nums text-[11px]">
                      {dash(c.slab_1_quantity)} / {formatInr(c.slab_1_rate)}
                    </StackLine>
                    <StackLine muted className="tabular-nums text-[11px]">
                      {dash(c.slab_2_quantity)} / {formatInr(c.slab_2_rate)}
                    </StackLine>
                    <StackLine muted className="tabular-nums text-[11px]">
                      {dash(c.slab_3_quantity)} / {formatInr(c.slab_3_rate)}
                    </StackLine>
                  </GroupCell>

                  <GroupCell textCenter>
                    <StackLine className="line-clamp-2 min-w-0 break-words text-pretty [overflow-wrap:anywhere]">
                      {dash(c.is_code_title)}
                    </StackLine>
                    <StackLine muted>
                      {dash(c.product_manual_number)}
                    </StackLine>
                  </GroupCell>

                  <GroupCell textCenter>
                    <StackLine muted className="tabular-nums text-[11px]">
                      L - {formatInr(c.mmf_large_scale)} | M -{" "}
                      {formatInr(c.mmf_medium_scale)}
                    </StackLine>
                    <StackLine muted className="tabular-nums text-[11px]">
                      S - {formatInr(c.mmf_small_scale)} | µ -{" "}
                      {formatInr(c.mmf_micro_scale)}
                    </StackLine>
                  </GroupCell>

                  <td className="align-top px-3 py-2 text-center text-zinc-700 dark:text-zinc-300">
                    <div className="space-y-1 text-sm leading-snug">
                      <StackLine className="text-xs text-zinc-600 dark:text-zinc-400">
                        <button
                          type="button"
                          onClick={() => setFileManagerRow(c)}
                          className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                          title={nFiles === 0
                            ? "No files — click to add"
                            : (c.files ?? []).map((f) => f.file_name ?? "").join(", ")}
                        >
                          {nFiles === 0
                            ? "Add Files"
                            : `View Files (${nFiles})`}
                        </button>
                      </StackLine>
                      <StackLine muted>{dash(c.unit_of_is)}</StackLine>
                      <StackLine className="tabular-nums text-[11px]">
                        {formatInr(c.testing_charges)}
                      </StackLine>
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
        <IsCodeMasterFooterBar
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

      {fileManagerRow && (
        <FileManagerModal
          row={fileManagerRow}
          onClose={() => setFileManagerRow(null)}
          onFilesChanged={(isCodeId, files) => {
            onFilesChanged(isCodeId, files);
          }}
        />
      )}
    </div>
  );
}
