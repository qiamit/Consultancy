"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useFinanceListPagination,
  usePrunedSetSelection,
  useSyncedRows,
} from "@/components/modules/finance/use-finance-master-state";
import {
  deleteTestParameterInline,
  deleteTestParametersInline,
  saveTestParameterInline,
} from "@backend/actions/test-parameters";
import type { IsCodeFormDropdownOptions } from "@backend/shared/data/is-code-form-dropdowns";
import type { TestParameterMasterRow } from "@backend/shared/types/test-parameter-master";
import type { IsCodeComboboxOption } from "@/components/modules/bis-projects/is-code-combobox";
import {
  buildEditorRowsFromMaster,
  createBlankEditorRow,
  createExtraBlankEditorRow,
  isEditorRowBlank,
  type TestParameterEditorRow,
} from "./constants";
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

function editorToMasterRow(r: TestParameterEditorRow): TestParameterMasterRow {
  return {
    id: r.id ?? r.key,
    is_code_id: r.is_code_id,
    test_name: r.test_name,
    clause_no: r.clause_no,
    test_method: r.test_method,
    unit: r.unit,
    specified_value: r.specified_value,
    created_at: "",
  };
}

function filterEditorRows(
  rows: TestParameterEditorRow[],
  query: string,
): TestParameterEditorRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  const saved = rows.filter((r) => r.id);
  const blanks = rows.filter((r) => !r.id);
  const matched = filterTestParametersBySearch(
    saved.map(editorToMasterRow),
    query,
  );
  const matchedIds = new Set(matched.map((m) => m.id));
  return [...rows.filter((r) => r.id && matchedIds.has(r.id)), ...blanks];
}

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
  const [serverRows] = useSyncedRows(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [nameFocusToken, setNameFocusToken] = useState(0);
  const editorRowsRef = useRef<TestParameterEditorRow[]>([]);
  const editingKeyRef = useRef<string | null>(null);
  const inFlightSaveKeysRef = useRef<Set<string>>(new Set());

  const isCodeIdParam = searchParams.get("is_code_id");
  const idParam = searchParams.get("id");

  const scopedIsCodeLabel = useMemo(() => {
    if (!isCodeIdParam) return null;
    return (
      isCodeOptions.find((o) => o.id === isCodeIdParam)?.label ??
      "Selected IS Code"
    );
  }, [isCodeIdParam, isCodeOptions]);

  const defaultTestMethod = useMemo(() => {
    if (!scopedIsCodeLabel) return "";
    // Test Method default is IS number only (no revision year).
    const colon = scopedIsCodeLabel.indexOf(":");
    return (colon === -1
      ? scopedIsCodeLabel
      : scopedIsCodeLabel.slice(0, colon)
    ).trim();
  }, [scopedIsCodeLabel]);

  const scopedServerRows = useMemo(() => {
    if (!isCodeIdParam) return serverRows;
    return serverRows.filter((r) => r.is_code_id === isCodeIdParam);
  }, [serverRows, isCodeIdParam]);

  const [editorRows, setEditorRows] = useState<TestParameterEditorRow[]>(() => {
    const fullLabel = isCodeIdParam
      ? (isCodeOptions.find((o) => o.id === isCodeIdParam)?.label ?? "")
      : "";
    const colon = fullLabel.indexOf(":");
    const label =
      colon === -1 ? fullLabel.trim() : fullLabel.slice(0, colon).trim();
    return isCodeIdParam
      ? buildEditorRowsFromMaster(scopedServerRows, isCodeIdParam, label)
      : [createBlankEditorRow("")];
  });

  useEffect(() => {
    editorRowsRef.current = editorRows;
  }, [editorRows]);

  useEffect(() => {
    editingKeyRef.current = editingKey;
  }, [editingKey]);

  // Keep local editor in sync with server after refresh; preserve dirty drafts.
  useEffect(() => {
    if (!isCodeIdParam) return;
    setEditorRows((prev) => {
      const dirtyById = new Map(
        prev.filter((r) => r.id && r.dirty).map((r) => [r.id!, r]),
      );
      const drafts = prev.filter((r) => !r.id);
      const emptyDrafts = drafts
        .filter((r) => isEditorRowBlank(r, defaultTestMethod))
        .map((r) => {
          const method = r.test_method.trim();
          const needsDefault =
            !method ||
            method === defaultTestMethod ||
            (scopedIsCodeLabel != null && method === scopedIsCodeLabel.trim());
          return needsDefault
            ? { ...r, test_method: defaultTestMethod }
            : r;
        });
      const nextSaved = scopedServerRows.map((r) => {
        const dirty = dirtyById.get(r.id);
        return (
          dirty ?? {
            key: r.id,
            id: r.id,
            is_code_id: r.is_code_id,
            test_name: r.test_name ?? "",
            clause_no: r.clause_no ?? "",
            test_method: r.test_method ?? "",
            unit: r.unit ?? "",
            specified_value: r.specified_value ?? "",
            dirty: false,
          }
        );
      });
      const serverFp = new Set(
        nextSaved.map(
          (r) =>
            `${r.test_name}\0${r.clause_no}\0${r.test_method}\0${r.unit}\0${r.specified_value}`,
        ),
      );
      // Drop non-empty drafts that already exist on the server (avoids duplicate rows after save+refresh).
      const nonEmptyDrafts = drafts.filter((r) => {
        if (isEditorRowBlank(r, defaultTestMethod)) return false;
        if (inFlightSaveKeysRef.current.has(r.key)) return false;
        const fp = `${r.test_name}\0${r.clause_no}\0${r.test_method}\0${r.unit}\0${r.specified_value}`;
        return !serverFp.has(fp);
      });
      return [
        ...nextSaved,
        ...nonEmptyDrafts,
        ...emptyDrafts,
        ...(nextSaved.length === 0 &&
        nonEmptyDrafts.length === 0 &&
        emptyDrafts.length === 0
          ? [createBlankEditorRow(isCodeIdParam, undefined, defaultTestMethod)]
          : []),
      ];
    });
  }, [scopedServerRows, isCodeIdParam, defaultTestMethod, scopedIsCodeLabel]);

  // Tests are per-IS only.
  useEffect(() => {
    if (isCodeIdParam) {
      // Drop legacy modal query params.
      if (
        searchParams.get("new") === "1" ||
        searchParams.get("saved") === "1" ||
        searchParams.get("id")
      ) {
        router.replace(
          `/dashboard/test-parameters?is_code_id=${encodeURIComponent(isCodeIdParam)}`,
          { scroll: false },
        );
      }
      return;
    }
    if (idParam) {
      const row = serverRows.find((r) => r.id === idParam);
      if (row?.is_code_id) {
        router.replace(
          `/dashboard/test-parameters?is_code_id=${encodeURIComponent(row.is_code_id)}`,
          { scroll: false },
        );
        return;
      }
    }
    router.replace("/dashboard/is-code-master", { scroll: false });
  }, [isCodeIdParam, idParam, serverRows, router, searchParams]);

  const filteredRows = useMemo(
    () => filterEditorRows(editorRows, searchQuery),
    [editorRows, searchQuery],
  );

  const savedFilteredRows = useMemo(
    () => filteredRows.filter((r) => r.id),
    [filteredRows],
  );
  const draftRows = useMemo(
    () => filteredRows.filter((r) => !r.id),
    [filteredRows],
  );

  const savedCount = editorRows.filter((r) => r.id).length;
  const filteredSavedCount = savedFilteredRows.length;
  const searchActive = searchQuery.trim().length > 0;
  const grandTotal = savedCount;
  const filteredTotal = searchActive ? filteredSavedCount : savedCount;

  const {
    pageSize,
    page,
    setPage,
    totalPages,
    paginated: paginatedSavedRows,
    onPageSizeChange,
  } = useFinanceListPagination(
    savedFilteredRows,
    searchQuery,
    PAGE_SIZE_OPTIONS[0],
  );

  // Blank / draft rows always stay at the bottom so + is always reachable.
  const displayRows = useMemo(
    () => [...paginatedSavedRows, ...draftRows],
    [paginatedSavedRows, draftRows],
  );

  const filteredRowKeys = useMemo(
    () => savedFilteredRows.map((r) => r.key),
    [savedFilteredRows],
  );
  const { selectedIds: selectedKeys, toggleRowSelection, toggleSelectPage } =
    usePrunedSetSelection(filteredRowKeys);

  const toggleSelectPageRows = useCallback(() => {
    toggleSelectPage(paginatedSavedRows.map((r) => r.key));
  }, [toggleSelectPage, paginatedSavedRows]);

  function updateRow(
    key: string,
    patch: Partial<
      Pick<
        TestParameterEditorRow,
        | "test_name"
        | "clause_no"
        | "test_method"
        | "unit"
        | "specified_value"
      >
    >,
  ) {
    setEditorRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, ...patch, dirty: true } : r,
      ),
    );
  }

  async function addRow() {
    if (!isCodeIdParam) return;
    // Lock upper rows; save current last row, then add a new blank.
    setEditingKey(null);
    const last = editorRowsRef.current[editorRowsRef.current.length - 1];
    if (last?.dirty) {
      if (!last.test_name.trim()) {
        setLocalError("Name of the Test is required before adding a new row.");
        return;
      }
      await saveRow(last.key);
    }
    setEditorRows((prev) => [
      ...prev,
      createExtraBlankEditorRow(isCodeIdParam, defaultTestMethod),
    ]);
    setNameFocusToken((n) => n + 1);
  }

  function editRow(row: TestParameterEditorRow) {
    setEditingKey(row.key);
  }

  async function doneEditRow(row: TestParameterEditorRow) {
    if (row.dirty) {
      if (!row.test_name.trim()) {
        setLocalError("Name of the Test is required.");
        return;
      }
      await saveRow(row.key);
    }
    setEditingKey(null);
  }

  async function persistRow(
    row: TestParameterEditorRow,
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    if (!isCodeIdParam) {
      return { ok: false, error: "IS Code is required." };
    }
    if (!row.test_name.trim()) {
      return { ok: false, error: "Name of the Test is required." };
    }
    const result = await saveTestParameterInline({
      id: row.id,
      scopeIsCodeId: isCodeIdParam,
      test_name: row.test_name,
      clause_no: row.clause_no,
      test_method: row.test_method,
      unit: row.unit,
      specified_value: row.specified_value,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, id: result.id };
  }

  /** Persist only when + or Done is clicked — never while typing. */
  async function saveRow(key: string) {
    if (inFlightSaveKeysRef.current.has(key)) return;

    const row = editorRowsRef.current.find((r) => r.key === key);
    if (!row || !row.dirty || !row.test_name.trim()) return;

    inFlightSaveKeysRef.current.add(key);
    setLocalError(null);

    const snapshot: TestParameterEditorRow = { ...row, dirty: false };
    setEditorRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, dirty: false } : r)),
    );

    try {
      const result = await persistRow(snapshot);
      if (!result.ok) {
        setLocalError(result.error);
        setEditorRows((prev) =>
          prev.map((r) => (r.key === key ? { ...r, dirty: true } : r)),
        );
        return;
      }

      const newId = result.id;
      setEditorRows((prev) =>
        prev.map((r) =>
          r.key === key
            ? {
                ...r,
                id: newId,
                key: newId,
                dirty: false,
              }
            : r,
        ),
      );

      if (editingKeyRef.current === key) {
        setEditingKey(newId);
      }
    } finally {
      inFlightSaveKeysRef.current.delete(key);
    }
  }

  async function handleDeleteRow(row: TestParameterEditorRow) {
    if (editingKey === row.key) setEditingKey(null);

    if (!row.id) {
      setEditorRows((prev) => {
        const next = prev.filter((r) => r.key !== row.key);
        if (next.length === 0 && isCodeIdParam) {
          return [createBlankEditorRow(isCodeIdParam, undefined, defaultTestMethod)];
        }
        return next;
      });
      return;
    }

    const label = row.test_name.trim() || "this record";
    if (
      !window.confirm(`Delete "${label}" permanently? This cannot be undone.`)
    ) {
      return;
    }
    setLocalError(null);
    const result = await deleteTestParameterInline(row.id, isCodeIdParam);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setEditorRows((prev) => {
      const next = prev.filter((r) => r.key !== row.key);
      if (next.length === 0 && isCodeIdParam) {
        return [createBlankEditorRow(isCodeIdParam, undefined, defaultTestMethod)];
      }
      return next;
    });
    router.refresh();
  }

  function handleExport() {
    const rows = filteredRows
      .filter((r) => r.id)
      .map(editorToMasterRow);
    const csv = buildTestParameterExportCsv(rows);
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
    const selectedRows = filteredRows.filter(
      (r) => r.id && selectedKeys.has(r.key),
    );
    const source =
      selectedRows.length > 0
        ? selectedRows
        : filteredRows.filter((r) => r.id);
    const toPrint = source.map(editorToMasterRow);
    if (toPrint.length === 0) {
      window.alert(
        selectedKeys.size > 0
          ? "No matching rows for the current search. Clear the search or adjust filters."
          : "No rows to print. Adjust your search or add tests.",
      );
      return;
    }
    printTestParameterList(toPrint);
  }

  async function handleBulkDelete() {
    const bulkIds = filteredRows
      .filter((r) => r.id && selectedKeys.has(r.key))
      .map((r) => r.id!);
    if (bulkIds.length === 0) return;
    const n = bulkIds.length;
    if (
      !window.confirm(
        n === 1
          ? "Delete this test permanently? This cannot be undone."
          : `Delete ${n} tests permanently? This cannot be undone.`,
      )
    ) {
      return;
    }
    setLocalError(null);
    const result = await deleteTestParametersInline(bulkIds, isCodeIdParam);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    const idSet = new Set(bulkIds);
    setEditorRows((prev) => {
      const next = prev.filter((r) => !r.id || !idSet.has(r.id));
      if (next.length === 0 && isCodeIdParam) {
        return [createBlankEditorRow(isCodeIdParam, undefined, defaultTestMethod)];
      }
      return next;
    });
    router.refresh();
  }

  const deleteDisabled = selectedKeys.size === 0;

  const errMsg =
    localError ??
    (queryError === "is_code_id"
      ? "IS Code is required."
      : queryError === "test_name"
        ? "Name of the Test is required."
        : queryError === "db"
          ? "Could not save. Check your connection and try again."
          : (fetchError ?? null));

  return (
    <div className="w-full max-w-none space-y-0">
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
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          grandTotal={grandTotal}
          filteredTotal={filteredTotal}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          scopedIsCodeLabel={scopedIsCodeLabel}
          isCodeMasterHref={
            isCodeIdParam
              ? `/dashboard/is-code-master?id=${encodeURIComponent(isCodeIdParam)}`
              : null
          }
        />

        <TestParameterMasterTable
          rows={displayRows}
          unitOptions={isCodeFormDropdowns.unitOptions}
          editingKey={editingKey}
          nameFocusToken={nameFocusToken}
          matchedCount={filteredTotal}
          grandCount={grandTotal}
          searchActive={searchActive}
          onExport={handleExport}
          onPrintList={handlePrintList}
          onDelete={() => void handleBulkDelete()}
          deleteDisabled={deleteDisabled}
          onAddRow={() => void addRow()}
          onDeleteRow={(row) => void handleDeleteRow(row)}
          onEditRow={editRow}
          onDoneEditRow={(row) => void doneEditRow(row)}
          onUpdateRow={updateRow}
          selectedKeys={selectedKeys}
          onToggleRowSelection={toggleRowSelection}
          onToggleSelectPage={toggleSelectPageRows}
        />
      </div>
    </div>
  );
}
