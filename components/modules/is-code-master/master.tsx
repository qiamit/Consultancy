"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteIsCodeMaster,
  deleteIsCodesMaster,
  importIsCodesMaster,
} from "@/lib/actions/is-codes";
import { buildIsCodeExportCsv, parseIsCodeImportCsv } from "@/lib/is-code-master-csv";
import type { IsCodeMasterRow } from "@/lib/types/is-code-master";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState(() => emptyForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const idParam = searchParams.get("id");
  const isNewParam = searchParams.get("new") === "1";
  const editRow =
    idParam && !isNewParam
      ? rows.find((r) => r.id === idParam) ?? undefined
      : undefined;
  const formVisible = isNewParam || !!editRow;

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    const id = searchParams.get("id");
    const isNew = searchParams.get("new");
    if (isNew === "1") {
      setForm(emptyForm());
      return;
    }
    if (id) {
      const row = initialRows.find((r) => r.id === id);
      if (row) {
        setForm(rowToForm(row));
        return;
      }
    }
    setForm(emptyForm());
  }, [searchParams, initialRows]);

  const filteredRows = useMemo(
    () => filterIsCodesBySearch(rows, searchQuery),
    [rows, searchQuery],
  );

  const grandTotal = rows.length;
  const filteredTotal = filteredRows.length;
  const searchActive = searchQuery.trim().length > 0;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTotal / pageSize) || 1,
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());

  useEffect(() => {
    const valid = new Set(filteredRows.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [filteredRows]);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectPage = useCallback(() => {
    setSelectedIds((prev) => {
      const ids = paginatedRows.map((r) => r.id);
      const next = new Set(prev);
      const allOnPage =
        ids.length > 0 && ids.every((id) => next.has(id));
      if (allOnPage) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }, [paginatedRows]);

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
    <div className="mx-auto max-w-[1400px] space-y-0">
      {errMsg && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
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
          onPageSizeChange={setPageSize}
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
          onToggleSelectPage={toggleSelectPage}
        />
      </div>

      {formVisible ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="is-code-master-form-title"
            className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
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
