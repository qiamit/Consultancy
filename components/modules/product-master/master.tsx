"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   Mirrors server `initialRows`, URL search params, and filters into local table/form/pagination state. */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteProductMaster,
  deleteProductsMaster,
  importProductsMaster,
} from "@/lib/actions/products-master";
import { buildProductExportCsv, parseProductImportCsv } from "@/lib/product-master-csv";
import type { ProductMasterRow } from "@/lib/types/product-master";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import { emptyForm, nextNumericItemSuffix, rowToForm } from "./constants";
import { ProductMasterForm } from "./form";
import { ProductMasterHeaderBar } from "./header-bar";
import { filterProductsBySearch, PAGE_SIZE_OPTIONS } from "./search-utils";
import { printProductMasterList } from "./print-product-row";
import { ProductMasterTable } from "./table";

const ENUM_FIELD_ERROR_MESSAGES: Record<string, string> = {
  enum: "Invalid option selected.",
  enum_unit:
    "Unit is not recognized. Choose from the dropdown or add it with +.",
  enum_gst:
    "GST rate is not recognized. Choose from the dropdown or add it with +.",
};

export function ProductMaster({
  initialRows,
  fetchError,
  queryError,
  dbErrorCode,
  dbErrorHint,
  unitOptions,
  gstRateOptions,
}: {
  initialRows: ProductMasterRow[];
  fetchError?: string | null;
  queryError?: string;
  dbErrorCode?: string;
  dbErrorHint?: string;
  unitOptions: AppDropdownOptionRow[];
  gstRateOptions: AppDropdownOptionRow[];
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

  const productFormRouteRef = useRef<string>("");

  useEffect(() => {
    const id = searchParams.get("id");
    const isNew = searchParams.get("new") === "1";
    const routeKey = isNew ? "new:1" : id ? `id:${id}` : "none";

    if (isNew) {
      if (productFormRouteRef.current !== routeKey) {
        productFormRouteRef.current = routeKey;
        const base = emptyForm();
        const cat: "product" | "service" =
          base.category === "service" ? "service" : "product";
        setForm({
          ...base,
          item_code_suffix: nextNumericItemSuffix(rows, cat),
        });
      }
      return;
    }

    productFormRouteRef.current = routeKey;

    if (id) {
      const row = initialRows.find((r) => r.id === id);
      if (row) {
        setForm(rowToForm(row));
        return;
      }
    }
    setForm(emptyForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `rows` is intentionally read only when the route switches into `new=1` (see branch above), not on every row list sync.
  }, [searchParams, initialRows]);

  const filteredRows = useMemo(
    () => filterProductsBySearch(rows, searchQuery),
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

  function selectRow(r: ProductMasterRow) {
    router.replace(`/dashboard/products?id=${r.id}`, { scroll: false });
  }

  function addNew() {
    router.replace("/dashboard/products?new=1", { scroll: false });
  }

  function closeForm() {
    router.replace("/dashboard/products", { scroll: false });
  }

  function updateField(key: string, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "category" && searchParams.get("new") === "1") {
        const cat: "product" | "service" =
          value === "service" ? "service" : "product";
        next.item_code_suffix = nextNumericItemSuffix(rows, cat);
      }
      return next;
    });
  }

  function handleExport() {
    const csv = buildProductExportCsv(filteredRows);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-services-master-export.csv";
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
          : "No rows to print. Adjust your search or add items.",
      );
      return;
    }
    printProductMasterList(toPrint);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = parseProductImportCsv(text);
    if (!parsed.ok) {
      window.alert(parsed.error);
      return;
    }
    const result = await importProductsMaster(parsed.rows);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    window.alert(`Imported ${result.inserted} row(s).`);
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
            ? "Delete this item permanently? This cannot be undone."
            : `Delete ${n} items permanently? This cannot be undone.`,
        )
      ) {
        return;
      }
      void deleteProductsMaster(bulkIds);
      return;
    }

    if (!idParam || isNewParam) return;
    if (!rows.some((r) => r.id === idParam)) return;
    if (
      !window.confirm(
        "Delete this item permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    void deleteProductMaster(idParam);
  }

  function handleDeleteRow(r: ProductMasterRow) {
    const label = r.item_code ?? "this record";
    if (
      !window.confirm(
        `Delete "${label}" permanently? This cannot be undone.`,
      )
    ) {
      return;
    }
    void deleteProductMaster(r.id);
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
    (queryError === "category"
      ? "Choose Product or Service."
      : queryError === "item_suffix"
        ? "Enter an item code after the prefix (letters, numbers, hyphen)."
        : queryError === "name"
          ? "Name of the item is required."
          : queryError === "hsn"
            ? "HSN code must be at most 8 digits, or leave it blank."
            : queryError === "duplicate_item_code"
              ? "This item code is already used. P- and S-series must each be unique."
              : queryError === "amount"
                ? "Enter valid amounts for currency fields."
                : queryError === "db"
                  ? "Could not save. Check your connection and try again."
                  : fetchError ?? null);

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
        <ProductMasterHeaderBar
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

        <ProductMasterTable
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
            aria-labelledby="product-master-form-title"
            className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <ProductMasterForm
              visible
              overlay
              formValues={form}
              isNewParam={isNewParam}
              idParam={idParam}
              onClose={closeForm}
              onAddNew={addNew}
              onUpdateField={updateField}
              unitOptions={unitOptions}
              gstRateOptions={gstRateOptions}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
