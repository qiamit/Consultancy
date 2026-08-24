"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";
import {
  useFinanceListPagination,
  usePrunedSetSelection,
  useRouteBoundFormState,
  useSyncedRows,
} from "@/components/modules/finance/use-finance-master-state";
import {
  deleteIsCodeMaster,
  deleteIsCodesMaster,
  importIsCodesMaster,
} from "@backend/actions/is-codes";
import { buildIsCodeExportCsv, parseIsCodeImportCsv } from "@backend/modules/is-code/is-code-master-csv";
import type { IsCodeMasterRow } from "@backend/shared/types/is-code-master";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { emptyForm, rowToForm } from "./constants";
import { IsCodeMasterForm } from "./form";
import { IsCodeMasterHeaderBar } from "./header-bar";
import { filterIsCodesBySearch, PAGE_SIZE_OPTIONS } from "./search-utils";
import { printIsCodeMasterList } from "./print-is-code-row";
import { IsCodeMasterTable } from "./table";

const ENUM_FIELD_ERROR_MESSAGES: Record<string, string> = {
  enum: "Invalid option selected.",
  enum_aspect_of_is:
    "Aspect of IS is not recognized. Choose from the dropdown or add it with +.",
  enum_unit_of_is:
    "Unit is not recognized. Choose from the dropdown or add it with +.",
};

export function IsCodeMaster({
  initialRows,
  fetchError,
  queryError,
  dbErrorCode,
  dbErrorHint,
  aspectOptions,
  unitOptions,
}: {
  initialRows: IsCodeMasterRow[];
  fetchError?: string | null;
  queryError?: string;
  dbErrorCode?: string;
  dbErrorHint?: string;
  aspectOptions: AppDropdownOptionRow[];
  unitOptions: AppDropdownOptionRow[];
}) {
  const { open: sidebarOpen } = useSidebarLayout();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useSyncedRows(initialRows);
  const [searchQuery, setSearchQuery] = useState("");

  const idParam = searchParams.get("id");
  const isNewParam = searchParams.get("new") === "1";
  const editRow =
    idParam && !isNewParam
      ? rows.find((r) => r.id === idParam) ?? undefined
      : undefined;
  const formVisible = isNewParam || !!editRow;
  const formOpenKey = formVisible
    ? isNewParam
      ? "new"
      : idParam
        ? `edit:${idParam}`
        : null
    : null;
  const [form, setForm] = useRouteBoundFormState(
    formOpenKey,
    () => {
      if (isNewParam) return emptyForm();
      if (idParam) {
        const row = initialRows.find((r) => r.id === idParam);
        if (row) return rowToForm(row);
      }
      return emptyForm();
    },
    emptyForm(),
  );

  const filteredRows = useMemo(
    () => filterIsCodesBySearch(rows, searchQuery),
    [rows, searchQuery],
  );

  const grandTotal = rows.length;
  const filteredTotal = filteredRows.length;
  const searchActive = searchQuery.trim().length > 0;

  const {
    pageSize,
    page,
    setPage,
    totalPages,
    paginated: paginatedRows,
    onPageSizeChange,
  } = useFinanceListPagination(filteredRows, searchQuery, PAGE_SIZE_OPTIONS[0]);

  const filteredRowIds = useMemo(
    () => filteredRows.map((r) => r.id),
    [filteredRows],
  );
  const { selectedIds, toggleRowSelection, toggleSelectPage } =
    usePrunedSetSelection(filteredRowIds);

  const toggleSelectPageRows = useCallback(() => {
    toggleSelectPage(paginatedRows.map((r) => r.id));
  }, [toggleSelectPage, paginatedRows]);

  function selectRow(r: IsCodeMasterRow) {
    router.replace(`/dashboard/is-code-master?id=${r.id}`, { scroll: false });
  }

  function addNew() {
    router.replace("/dashboard/is-code-master?new=1", { scroll: false });
  }

  function closeForm() {
    router.replace("/dashboard/is-code-master", { scroll: false });
  }

  function updateField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleExport() {
    const csv = buildIsCodeExportCsv(filteredRows);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "is-code-master-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintList() {
    const selectedRows = filteredRows.filter((r) => selectedIds.has(r.id));
    const toPrint =
      selectedRows.length > 0 ? selectedRows : filteredRows;
    if (toPrint.length === 0) {
      window.alert(
        selectedIds.size > 0
          ? "No matching rows for the current search. Clear the search or adjust filters."
          : "No rows to print. Adjust your search or add IS codes.",
      );
      return;
    }
    printIsCodeMasterList(toPrint);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = parseIsCodeImportCsv(text);
    if (!parsed.ok) {
      window.alert(parsed.error);
      return;
    }
    const result = await importIsCodesMaster(parsed.rows);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    window.alert(`Imported ${result.inserted} IS code(s).`);
    router.refresh();
  }

  function handleDelete() {
    const bulkIds = filteredRows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => r.id);

    if (bulkIds.length > 0) {
      const n = bulkIds.length;
      if (
        !window.confirm(
          n === 1
            ? "Delete this IS code permanently? Attached files will be removed. This cannot be undone."
            : `Delete ${n} IS codes permanently? Attached files will be removed. This cannot be undone.`,
        )
      ) {
        return;
      }
      void deleteIsCodesMaster(bulkIds);
      return;
    }

    if (!idParam || isNewParam) return;
    if (!rows.some((r) => r.id === idParam)) return;
    if (
      !window.confirm(
        "Delete this IS code permanently? Attached files will be removed. This cannot be undone.",
      )
    ) {
      return;
    }
    void deleteIsCodeMaster(idParam);
  }

  function handleDeleteRow(r: IsCodeMasterRow) {
    const label = r.is_number ?? "this record";
    if (
      !window.confirm(
        `Delete "${label}" permanently? Files will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    void deleteIsCodeMaster(r.id);
  }

  const hasSelection = selectedIds.size > 0;
  const canDeleteOpenRow =
    !!idParam &&
    !isNewParam &&
    rows.some((r) => r.id === idParam);
  const deleteDisabled = !hasSelection && !canDeleteOpenRow;

  const enumMsg =
    queryError &&
    (ENUM_FIELD_ERROR_MESSAGES[queryError] ??
      (queryError.startsWith("enum_")
        ? ENUM_FIELD_ERROR_MESSAGES.enum
        : undefined));

  const errMsg =
    enumMsg ??
    (queryError === "is_number"
      ? "IS number is required."
      : queryError === "title"
        ? "IS code title is required."
        : queryError === "year"
          ? "Revision year must be a valid 4-digit year (1000–9999)."
          : queryError === "reaffirm_year"
            ? "Reaffirmation year must be four digits or left blank."
            : queryError === "duplicate"
            ? "This IS number and revision year are already used. Each pair must be unique."
            : queryError === "amount"
              ? "Enter valid amounts for currency fields."
              : queryError === "db"
                ? "Could not save. Check your connection and try again."
                : fetchError ?? null);

  const existingFiles = editRow?.files ?? [];

  return (
    <div className="w-full max-w-none space-y-0">
      {errMsg && (
        <p className="mb-4 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errMsg}
          {queryError === "db" && (dbErrorHint || dbErrorCode) ? (
            <span className="mt-2 block break-words font-mono text-xs font-normal text-red-900/90 dark:text-red-100/90">
              {dbErrorCode ? `${dbErrorCode}: ` : null}
              {dbErrorHint ?? ""}
            </span>
          ) : null}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <IsCodeMasterHeaderBar
          onAddNew={addNew}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          grandTotal={grandTotal}
          filteredTotal={filteredTotal}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <IsCodeMasterTable
          rows={paginatedRows}
          idParam={idParam}
          onEditRow={selectRow}
          matchedCount={filteredTotal}
          grandCount={grandTotal}
          searchActive={searchActive}
          onImportFile={handleImportFile}
          onExport={handleExport}
          onPrintList={handlePrintList}
          onDelete={handleDelete}
          deleteDisabled={deleteDisabled}
          onDeleteRow={handleDeleteRow}
          selectedIds={selectedIds}
          onToggleRowSelection={toggleRowSelection}
          onToggleSelectPage={toggleSelectPageRows}
          onFilesChanged={(isCodeId, files) => {
            setRows((prev) =>
              prev.map((r) => r.id === isCodeId ? { ...r, files } : r)
            );
          }}
        />
      </div>

      {formVisible ? (
        <div
          className={`fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55 ${
            sidebarOpen ? "lg:left-64" : "lg:left-0"
          }`}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="is-code-master-form-title"
            className="mb-10 w-full max-w-5xl rounded-none border-[2mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <IsCodeMasterForm
              visible
              overlay
              formValues={form}
              isNewParam={isNewParam}
              idParam={idParam}
              existingFiles={existingFiles}
              onClose={closeForm}
              onAddNew={addNew}
              onUpdateField={updateField}
              aspectOptions={aspectOptions}
              unitOptions={unitOptions}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
