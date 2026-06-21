"use client";

import type { TestParameterMasterRow } from "@/lib/types/test-parameter-master";
import { isCodeLabelFromRow } from "./constants";
import { TestParameterMasterFooterBar } from "./footer-bar";

const chk =
  "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-900";

const COL_COUNT = 8;

function dash(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t === "" ? "—" : t;
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
  const allOnPage =
    pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds.has(id));
  const someOnPage =
    !allOnPage && pageRowIds.some((id) => selectedIds.has(id));
  return (
    <input
      type="checkbox"
      checked={allOnPage}
      ref={(el) => {
        if (el) el.indeterminate = someOnPage;
      }}
      onChange={onTogglePage}
      className={chk}
      aria-label="Select all rows on this page"
      title="Select all rows on this page"
    />
  );
}

export function TestParameterMasterTable({
  rows,
  idParam,
  onEditRow,
  matchedCount,
  grandCount,
  searchActive,
  onExport,
  onPrintList,
  onDelete,
  deleteDisabled,
  onDeleteRow,
  selectedIds,
  onToggleRowSelection,
  onToggleSelectPage,
}: {
  rows: TestParameterMasterRow[];
  idParam: string | null;
  onEditRow: (r: TestParameterMasterRow) => void;
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  onDeleteRow: (r: TestParameterMasterRow) => void;
  selectedIds: ReadonlySet<string>;
  onToggleRowSelection: (id: string) => void;
  onToggleSelectPage: () => void;
}) {
  const emptyMaster = grandCount === 0;
  const noMatches = !emptyMaster && rows.length === 0;
  const pageRowIds = rows.map((r) => r.id);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
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
            <th className="min-w-[140px] px-3 py-2">IS Code</th>
            <th className="min-w-[160px] px-3 py-2">Name of the Test</th>
            <th className="min-w-[100px] px-3 py-2">Clause No</th>
            <th className="min-w-[140px] px-3 py-2">Test Method</th>
            <th className="min-w-[80px] px-3 py-2">Unit</th>
            <th className="min-w-[120px] px-3 py-2">Specified Value</th>
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
                No test parameters yet. Use &quot;Add New Test Parameter&quot; to
                open the form and save.
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
            rows.map((r) => {
              const active = idParam === r.id;
              const rowLabel = `Select ${r.test_name}`;
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
                  <td className="px-3 py-2 align-top font-medium text-sky-700 dark:text-sky-400">
                    {isCodeLabelFromRow(r)}
                  </td>
                  <td className="px-3 py-2 align-top">{dash(r.test_name)}</td>
                  <td className="px-3 py-2 align-top">{dash(r.clause_no)}</td>
                  <td className="px-3 py-2 align-top">{dash(r.test_method)}</td>
                  <td className="px-3 py-2 align-top">{dash(r.unit)}</td>
                  <td className="px-3 py-2 align-top">
                    {dash(r.specified_value)}
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
        <TestParameterMasterFooterBar
          matchedCount={matchedCount}
          grandCount={grandCount}
          searchActive={searchActive}
          selectedCount={selectedIds.size}
          onExport={onExport}
          onPrintList={onPrintList}
          onDelete={onDelete}
          deleteDisabled={deleteDisabled}
        />
      </table>
    </div>
  );
}
