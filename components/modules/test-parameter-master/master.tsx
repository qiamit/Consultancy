"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteTestParameter,
  deleteTestParameters,
} from "@/lib/actions/test-parameters";
import {
  clearTestParameterFormDraft,
  currentTestParameterFormMode,
  getStoredTestParameterOpenMode,
  loadTestParameterFormDraft,
  saveTestParameterFormDraft,
} from "@/lib/test-parameter-form-draft";
import { emptyForm as isCodeEmptyForm } from "@/components/modules/is-code-master/constants";
import { IsCodeMasterForm } from "@/components/modules/is-code-master/form";
import type { IsCodeFormDropdownOptions } from "@/lib/data/is-code-form-dropdowns";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import type { TestParameterMasterRow } from "@/lib/types/test-parameter-master";
import type { IsCodeComboboxOption } from "@/components/modules/bis-projects/is-code-combobox";
import { emptyForm, rowToForm, formatIsCodeRevisionLabel } from "./constants";
import { TestParameterMasterForm } from "./form";
import { TestParameterMasterHeaderBar } from "./header-bar";
import {
  filterTestParametersBySearch,
  PAGE_SIZE_OPTIONS,
} from "./search-utils";
import {
  buildTestParameterExportCsv,
  printTestParameterList,
} from "./print-test-parameter-list";
import { TestParameterMasterTable } from "./table";

export function TestParameterMaster({
  initialRows,
  fetchError,
  queryError,
  dbErrorCode,
  dbErrorHint,
  isCodeOptions,
  isCodeFormDropdowns,
}: {
  initialRows: TestParameterMasterRow[];
  fetchError?: string | null;
  queryError?: string;
  dbErrorCode?: string;
  dbErrorHint?: string;
  isCodeOptions: IsCodeComboboxOption[];
  isCodeFormDropdowns: IsCodeFormDropdownOptions;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState(() => emptyForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());
  const [embedIsCodeOpen, setEmbedIsCodeOpen] = useState(false);
  const [embedIsCodeForm, setEmbedIsCodeForm] = useState(() =>
    isCodeEmptyForm(),
  );
  const [isCodeView, setIsCodeView] = useState<{
    id: string;
    is_number: string | null;
    revision_year: number | null;
  } | null>(null);

  function viewIsCodeFromRow(r: TestParameterMasterRow) {
    if (!r.is_code_id) return;
    setIsCodeView({
      id: r.is_code_id,
      is_number: r.is_codes?.is_number ?? null,
      revision_year: r.is_codes?.revision_year ?? null,
    });
  }

  const idParam = searchParams.get("id");
  const isNewParam = searchParams.get("new") === "1";
  const savedRecently = searchParams.get("saved") === "1";
  const storedOpenMode = getStoredTestParameterOpenMode();
  const editRow =
    idParam && !isNewParam
      ? (rows.find((r) => r.id === idParam) ?? undefined)
      : undefined;
  const formVisible =
    !savedRecently &&
    (isNewParam ||
      !!editRow ||
      storedOpenMode === "new" ||
      (!!storedOpenMode && storedOpenMode !== "new"));
  const restoredUrlRef = useRef(false);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (searchParams.get("saved") !== "1") return;
    clearTestParameterFormDraft();
    router.replace("/dashboard/test-parameters", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (restoredUrlRef.current) return;
    if (isNewParam || idParam) {
      restoredUrlRef.current = true;
      return;
    }
    const stored = getStoredTestParameterOpenMode();
    if (!stored) return;
    restoredUrlRef.current = true;
    if (stored === "new") {
      router.replace("/dashboard/test-parameters?new=1", { scroll: false });
      return;
    }
    router.replace(
      `/dashboard/test-parameters?id=${encodeURIComponent(stored)}`,
      { scroll: false },
    );
  }, [idParam, isNewParam, router]);

  useEffect(() => {
    const id = searchParams.get("id");
    const isNew = searchParams.get("new");
    if (isNew === "1") {
      const draft = loadTestParameterFormDraft("new");
      setForm(draft ?? emptyForm());
      return;
    }
    if (id) {
      const draft = loadTestParameterFormDraft(id);
      if (draft) {
        setForm(draft);
        return;
      }
      const row = initialRows.find((r) => r.id === id);
      if (row) {
        setForm(rowToForm(row));
        return;
      }
    }
    if (!getStoredTestParameterOpenMode()) {
      setForm(emptyForm());
    }
  }, [searchParams, initialRows]);

  const filteredRows = useMemo(
    () => filterTestParametersBySearch(rows, searchQuery),
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

  function selectRow(r: TestParameterMasterRow) {
    const next = rowToForm(r);
    setForm(next);
    saveTestParameterFormDraft(r.id, next);
    router.replace(`/dashboard/test-parameters?id=${r.id}`, { scroll: false });
  }

  function addNew() {
    clearTestParameterFormDraft();
    const next = emptyForm();
    setForm(next);
    saveTestParameterFormDraft("new", next);
    router.replace("/dashboard/test-parameters?new=1", { scroll: false });
  }

  function closeForm() {
    clearTestParameterFormDraft();
    router.replace("/dashboard/test-parameters", { scroll: false });
  }

  function updateField(key: string, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      const mode = currentTestParameterFormMode(idParam, isNewParam);
      if (mode) saveTestParameterFormDraft(mode, next);
      return next;
    });
  }

  function handleExport() {
    const csv = buildTestParameterExportCsv(filteredRows);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-parameter-export.csv";
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
          : "No rows to print. Adjust your search or add test parameters.",
      );
      return;
    }
    printTestParameterList(toPrint);
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
            ? "Delete this test parameter permanently? This cannot be undone."
            : `Delete ${n} test parameters permanently? This cannot be undone.`,
        )
      ) {
        return;
      }
      void deleteTestParameters(bulkIds);
      return;
    }

    if (!idParam || isNewParam) return;
    if (!rows.some((r) => r.id === idParam)) return;
    if (
      !window.confirm(
        "Delete this test parameter permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    void deleteTestParameter(idParam);
  }

  function handleDeleteRow(r: TestParameterMasterRow) {
    const label = r.test_name ?? "this record";
    if (
      !window.confirm(
        `Delete "${label}" permanently? This cannot be undone.`,
      )
    ) {
      return;
    }
    void deleteTestParameter(r.id);
  }

  const hasSelection = selectedIds.size > 0;
  const canDeleteOpenRow =
    !!idParam &&
    !isNewParam &&
    rows.some((r) => r.id === idParam);
  const deleteDisabled = !hasSelection && !canDeleteOpenRow;

  const errMsg =
    queryError === "is_code_id"
      ? "IS Code is required."
      : queryError === "test_name"
        ? "Name of the Test is required."
        : queryError === "db"
          ? "Could not save. Check your connection and try again."
          : (fetchError ?? null);

  return (
    <div className="w-full space-y-0">
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
        <TestParameterMasterHeaderBar
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

        <TestParameterMasterTable
          rows={paginatedRows}
          idParam={idParam}
          onEditRow={selectRow}
          onViewIsCode={viewIsCodeFromRow}
          matchedCount={filteredTotal}
          grandCount={grandTotal}
          searchActive={searchActive}
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
            aria-labelledby="test-parameter-master-form-title"
            className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <TestParameterMasterForm
              visible
              overlay
              formValues={form}
              isNewParam={isNewParam}
              idParam={idParam}
              isCodeOptions={isCodeOptions}
              unitOptions={isCodeFormDropdowns.unitOptions}
              onClose={closeForm}
              onAddNew={addNew}
              onUpdateField={updateField}
              onRequestQuickAddIsCode={() => {
                setEmbedIsCodeForm(isCodeEmptyForm());
                setEmbedIsCodeOpen(true);
              }}
            />
          </div>
        </div>
      ) : null}

      {embedIsCodeOpen ? (
        <div
          className="fixed inset-0 z-[127] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmbedIsCodeOpen(false);
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
              formValues={embedIsCodeForm}
              isNewParam
              idParam={null}
              existingFiles={[]}
              onClose={() => setEmbedIsCodeOpen(false)}
              onAddNew={() => setEmbedIsCodeForm(isCodeEmptyForm())}
              onUpdateField={(key, value) =>
                setEmbedIsCodeForm((f) => ({ ...f, [key]: value }))
              }
              aspectOptions={isCodeFormDropdowns.aspectOptions}
              unitOptions={isCodeFormDropdowns.unitOptions}
              embeddedInBis
              onEmbeddedSaveSuccess={(id) => {
                updateField("is_code_id", id);
                const savedLabel =
                  isCodeOptions.find((o) => o.id === id)?.label ??
                  formatIsCodeRevisionLabel(
                    embedIsCodeForm.is_number,
                    embedIsCodeForm.revision_year
                      ? Number(embedIsCodeForm.revision_year)
                      : undefined,
                  );
                updateField("test_method", savedLabel);
                setEmbedIsCodeOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      ) : null}

      {isCodeView ? (
        <IsCodeViewModal
          isCodeId={isCodeView.id}
          isNumber={isCodeView.is_number}
          revisionYear={isCodeView.revision_year}
          onClose={() => setIsCodeView(null)}
          overlayZIndexClass="z-[120]"
        />
      ) : null}
    </div>
  );
}
