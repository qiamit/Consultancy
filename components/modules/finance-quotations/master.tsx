"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";
import type { FinanceQuotationRow } from "@/lib/types/finance-quotation";
import type { ProductMasterOptionRow } from "@/lib/types/finance-quotation";
import {
  deleteFinanceQuotation,
  deleteFinanceQuotations,
  importFinanceQuotations,
} from "@/lib/actions/finance-quotations";
import {
  buildFinanceQuotationsExportCsv,
  parseFinanceQuotationsImportCsv,
} from "@/lib/finance-quotations-csv";
import {
  emptyForm,
  emptyLine,
  QUOTATION_LIST_PATH,
  rowToForm,
  type QuotationFormState,
  type QuotationLineForm,
} from "./constants";
import { FinanceQuotationForm } from "./form";
import { FinanceQuotationsHeaderBar } from "./header-bar";
import { printFinanceQuotationsList } from "./print-finance-quotation-list";
import { filterQuotationsBySearch, PAGE_SIZE_OPTIONS } from "./search-utils";
import { FinanceQuotationsTable } from "./table";

type ClientOptionRow = {
  id: string;
  name: string;
  company_name: string | null;
  gst_number: string | null;
};

/** Labels show Client Master `company_name` only; search also matches contact name & GSTIN. */
function clientsToOptions(clients: ClientOptionRow[]): AppDropdownOptionRow[] {
  return clients.map((c) => {
    const company = (c.company_name ?? "").trim();
    const contact = (c.name ?? "").trim();
    const gst = (c.gst_number ?? "").trim();
    const label = company || contact || "Unnamed client";
    return {
      id: c.id,
      value: c.id,
      label,
      canDelete: false,
      filterText: [company, contact, gst].filter(Boolean).join(" "),
    };
  });
}

function productsToOptions(products: ProductMasterOptionRow[]): AppDropdownOptionRow[] {
  return products.map((p) => ({
    id: p.id,
    value: p.id,
    label: p.name,
    canDelete: false,
    filterText: `${p.item_code} ${p.name} ${p.category} ${p.unit_of_item}`,
  }));
}

function addOneMonthISO(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function FinanceQuotationsMaster({
  initialRows,
  fetchError,
  queryError,
  clientRows,
  productRows,
  defaultBankDetails,
  sealSignImageUrl,
  notesTemplates = [],
  termsTemplates = [],
  scopeTemplates = [],
}: {
  initialRows: FinanceQuotationRow[];
  fetchError?: string | null;
  queryError?: string;
  clientRows: ClientOptionRow[];
  productRows: ProductMasterOptionRow[];
  defaultBankDetails: string;
  sealSignImageUrl: string | null;
  notesTemplates?: CompanyTextTemplateRow[];
  termsTemplates?: CompanyTextTemplateRow[];
  scopeTemplates?: CompanyTextTemplateRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState<QuotationFormState>(() =>
    emptyForm(defaultBankDetails),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());

  const idParam = searchParams.get("id");
  const isNewParam = searchParams.get("new") === "1";
  const editRow =
    idParam && !isNewParam
      ? rows.find((r) => r.id === idParam) ?? undefined
      : undefined;
  const formVisible = isNewParam || !!editRow;

  const quotationReturnUrl = useMemo(() => {
    const q = new URLSearchParams();
    if (isNewParam) q.set("new", "1");
    else if (idParam) q.set("id", idParam);
    const s = q.toString();
    return s ? `${QUOTATION_LIST_PATH}?${s}` : QUOTATION_LIST_PATH;
  }, [isNewParam, idParam]);

  const clientOptions = useMemo(() => clientsToOptions(clientRows), [clientRows]);
  const productOptions = useMemo(() => productsToOptions(productRows), [productRows]);
  const productById = useMemo(() => {
    const m = new Map<string, ProductMasterOptionRow>();
    for (const p of productRows) m.set(p.id, p);
    return m;
  }, [productRows]);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (isNewParam) {
      setForm((prev) => {
        const base = emptyForm(defaultBankDetails);
        const fromUrl = searchParams.get("client_id")?.trim() ?? "";
        if (fromUrl) return { ...base, client_id: fromUrl };
        return { ...base, client_id: prev.client_id };
      });
      return;
    }
    if (idParam) {
      const row = initialRows.find((r) => r.id === idParam);
      if (row) {
        setForm((prev) => {
          const base = rowToForm(row, defaultBankDetails);
          const fromUrl = searchParams.get("client_id")?.trim() ?? "";
          if (fromUrl) return { ...base, client_id: fromUrl };
          if (prev.id === base.id && prev.client_id)
            return { ...base, client_id: prev.client_id };
          return base;
        });
        return;
      }
    }
    setForm(emptyForm(defaultBankDetails));
  }, [searchParams, initialRows, idParam, isNewParam, defaultBankDetails]);

  useEffect(() => {
    if (!formVisible) return;
    const cid = searchParams.get("client_id")?.trim();
    if (!cid) return;
    const q = new URLSearchParams(searchParams.toString());
    q.delete("client_id");
    const qs = q.toString();
    router.replace(`${QUOTATION_LIST_PATH}${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [formVisible, searchParams, router]);

  const filtered = useMemo(
    () => filterQuotationsBySearch(rows, searchQuery),
    [rows, searchQuery],
  );
  const filteredTotal = filtered.length;
  const grandTotal = rows.length;
  const searchActive = searchQuery.trim().length > 0;

  const filteredGrandSum = useMemo(
    () =>
      filtered.reduce((acc, r) => acc + (Number(r.grand_total) || 0), 0),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    const valid = new Set(filtered.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [filtered]);

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
      const ids = paginated.map((r) => r.id);
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
  }, [paginated]);

  const selectRow = useCallback(
    (r: FinanceQuotationRow) => {
      router.replace(`${QUOTATION_LIST_PATH}?id=${encodeURIComponent(r.id)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const addNew = useCallback(() => {
    router.replace(`${QUOTATION_LIST_PATH}?new=1`, { scroll: false });
  }, [router]);

  const closeForm = useCallback(() => {
    router.replace(QUOTATION_LIST_PATH, { scroll: false });
  }, [router]);

  const updateField = useCallback((key: keyof QuotationFormState, value: string) => {
    setForm((f) => {
      if (key === "quotation_type") {
        const t = value === "supply" ? "supply" : "service";
        return { ...f, quotation_type: t };
      }
      return { ...f, [key]: value };
    });
  }, []);

  const updateLine = useCallback((index: number, patch: Partial<QuotationLineForm>) => {
    setForm((f) => {
      const lines = f.lines.map((L, i) => (i === index ? { ...L, ...patch } : L));
      return { ...f, lines };
    });
  }, []);

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  }, []);

  const removeLine = useCallback((index: number) => {
    setForm((f) => {
      if (f.lines.length <= 1) return f;
      return { ...f, lines: f.lines.filter((_, i) => i !== index) };
    });
  }, []);

  const onQuotationDateChange = useCallback((iso: string) => {
    setForm((f) => ({
      ...f,
      quotation_date: iso,
      expiry_date: addOneMonthISO(iso),
    }));
  }, []);

  function handleExport() {
    const csv = buildFinanceQuotationsExportCsv(filtered);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-quotations-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintList() {
    const selectedRows = filtered.filter((r) => selectedIds.has(r.id));
    const toPrint =
      selectedRows.length > 0 ? selectedRows : filtered;
    if (toPrint.length === 0) {
      window.alert(
        selectedIds.size > 0
          ? "No matching rows for the current search. Clear the search or adjust filters."
          : "No rows to print. Adjust your search or add quotations.",
      );
      return;
    }
    printFinanceQuotationsList(toPrint);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = parseFinanceQuotationsImportCsv(text);
    if (!parsed.ok) {
      window.alert(parsed.error);
      return;
    }
    const result = await importFinanceQuotations(parsed.rows);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    window.alert(`Imported ${result.inserted} quotation(s).`);
    router.refresh();
  }

  function handleDelete() {
    const bulkIds = filtered
      .filter((r) => selectedIds.has(r.id))
      .map((r) => r.id);

    if (bulkIds.length > 0) {
      const n = bulkIds.length;
      if (
        !window.confirm(
          n === 1
            ? "Delete this quotation permanently? This cannot be undone."
            : `Delete ${n} quotations permanently? This cannot be undone.`,
        )
      ) {
        return;
      }
      void deleteFinanceQuotations(bulkIds);
      return;
    }

    if (!idParam || isNewParam) return;
    if (!rows.some((r) => r.id === idParam)) return;
    if (
      !window.confirm(
        "Delete this quotation permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    void deleteFinanceQuotation(idParam);
  }

  function handleDeleteRow(r: FinanceQuotationRow) {
    const label = r.quotation_number || "this quotation";
    if (
      !window.confirm(
        `Delete "${label}" permanently? This cannot be undone.`,
      )
    ) {
      return;
    }
    void deleteFinanceQuotation(r.id);
  }

  const hasSelection = selectedIds.size > 0;
  const canDeleteOpenRow =
    !!idParam &&
    !isNewParam &&
    rows.some((r) => r.id === idParam);
  const deleteDisabled = !hasSelection && !canDeleteOpenRow;

  const errMsg =
    queryError === "dates"
      ? "Quotation and expiry dates are required."
      : queryError === "type"
        ? "Invalid quotation type."
        : queryError === "lines"
          ? "Add at least one line with quantity, rate, or product."
          : queryError === "quotation_number_required"
            ? "Quotation number is required."
            : queryError === "quotation_number_duplicate"
              ? "That quotation number is already in use. Choose a different number."
              : queryError === "db"
                ? "Could not save. Check your connection and try again."
                : fetchError ?? null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-0">
      {errMsg ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errMsg}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <FinanceQuotationsHeaderBar
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

        <FinanceQuotationsTable
          rows={paginated}
          idParam={idParam}
          onEditRow={selectRow}
          matchedCount={filteredTotal}
          grandCount={grandTotal}
          searchActive={searchActive}
          grandTotalSum={filteredGrandSum}
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
            aria-labelledby="finance-quotation-form-title"
            className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <FinanceQuotationForm
              visible
              overlay
              formValues={form}
              isNewParam={isNewParam}
              idParam={idParam}
              clientOptions={clientOptions}
              productOptions={productOptions}
              productById={productById}
              onClose={closeForm}
              onAddNew={addNew}
              onUpdateField={updateField}
              onUpdateLine={updateLine}
              onAddLine={addLine}
              onRemoveLine={removeLine}
              onQuotationDateChange={onQuotationDateChange}
              quotationReturnUrl={quotationReturnUrl}
              sealSignImageUrl={sealSignImageUrl}
              notesTemplates={notesTemplates}
              termsTemplates={termsTemplates}
              scopeTemplates={scopeTemplates}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
