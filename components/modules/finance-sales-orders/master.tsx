"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { PrintSettings, PrintCompanyInfo } from "@/lib/print/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";
import type {
  FinanceQuotationRow,
} from "@/lib/types/finance-quotation";
import type { ProductMasterOptionRow } from "@/lib/types/finance-quotation";
import type { FinanceSalesOrderRow } from "@/lib/types/finance-sales-order";
import {
  deleteFinanceSalesOrder,
  deleteFinanceSalesOrders,
  importFinanceSalesOrders,
  updateFinanceSalesOrderStatus,
} from "@/lib/actions/finance-sales-orders";
import {
  buildFinanceSalesOrdersExportCsv,
  parseFinanceSalesOrdersImportCsv,
} from "@/lib/finance-sales-orders-csv";
import {
  emptyForm,
  emptyLine,
  SALES_ORDER_LIST_PATH,
  rowToForm,
  splitSalesOrderNumberForForm,
  type SalesOrderFormState,
  type SalesOrderLineForm,
} from "./constants";
import { FinanceSalesOrderForm } from "./form";
import { FinanceSalesOrdersHeaderBar } from "./header-bar";
import { printFinanceSalesOrdersList } from "./print-finance-sales-order-list";
import { filterSalesOrdersBySearch, PAGE_SIZE_OPTIONS } from "./search-utils";
import { FinanceSalesOrdersTable } from "./table";

type ClientOptionRow = {
  id: string;
  name: string;
  company_name: string | null;
  gst_number: string | null;
  contact_person_name: string | null;
  email: string | null;
  phone_country_code: string | null;
  phone: string | null;
  address: string | null;
  pin_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
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

function quotationToSalesOrderDraft(
  q: FinanceQuotationRow,
  defaultBankDetails: string,
  nextNumber: {
    sales_order_number_prefix: string;
    sales_order_number_value: string;
  },
): SalesOrderFormState {
  const linesRaw = q.finance_quotation_lines ?? [];
  const sorted = [...linesRaw].sort((a, b) => a.sort_order - b.sort_order);
  const lines: SalesOrderLineForm[] =
    sorted.length > 0
      ? sorted.map((L) => ({
          product_master_item_id: L.product_master_item_id ?? "",
          item_description: L.item_description ?? "",
          unit_of_item: L.unit_of_item ?? "",
          qty: String(L.qty),
          unit_rate: String(L.unit_rate),
          line_discount: (L.line_discount ?? "").trim() || "0%",
          gst_rate: L.gst_rate ?? "0%",
        }))
      : [emptyLine()];
  const bankDetails = (q.bank_details ?? "").trim() || defaultBankDetails;
  return {
    id: "",
    quotation_id: q.id,
    sales_order_number_prefix: nextNumber.sales_order_number_prefix,
    sales_order_number_value: nextNumber.sales_order_number_value,
    order_date: q.quotation_date,
    expected_delivery_date: q.expiry_date,
    client_id: q.client_id ?? "",
    order_type: q.quotation_type,
    notes: q.notes ?? "",
    terms_and_conditions: q.terms_and_conditions ?? "",
    scope_of_work: q.scope_of_work ?? "",
    bank_details: bankDetails,
    seal_and_sign: q.seal_and_sign ?? "",
    lines,
  };
}

function getNextSalesOrderNumberParts(
  rows: FinanceSalesOrderRow[],
  preferredPrefixOverride?: string,
): {
  sales_order_number_prefix: string;
  sales_order_number_value: string;
} {
  if (rows.length === 0) {
    return {
      sales_order_number_prefix: preferredPrefixOverride ?? "",
      sales_order_number_value: "00001",
    };
  }

  const sortedByCreatedAt = [...rows].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );
  const latestParts = splitSalesOrderNumberForForm(
    sortedByCreatedAt[0]?.sales_order_number ?? "",
  );
  const preferredPrefix =
    preferredPrefixOverride ?? latestParts.sales_order_number_prefix;

  let maxValue = 0;
  let width = 5;

  for (const row of rows) {
    const parts = splitSalesOrderNumberForForm(row.sales_order_number ?? "");
    if (parts.sales_order_number_prefix !== preferredPrefix) continue;
    if (!/^\d+$/.test(parts.sales_order_number_value)) continue;

    const parsed = Number(parts.sales_order_number_value);
    if (!Number.isFinite(parsed)) continue;

    maxValue = Math.max(maxValue, parsed);
    width = Math.max(width, parts.sales_order_number_value.length);
  }

  const next = String(maxValue + 1).padStart(width, "0");
  return {
    sales_order_number_prefix: preferredPrefix,
    sales_order_number_value: next,
  };
}

export function FinanceSalesOrdersMaster({
  initialRows,
  fetchError,
  queryError,
  clientRows,
  productRows,
  defaultBankDetails,
  sealSignImageUrl,
  letterheadUpperImageUrl,
  letterheadLowerImageUrl,
  notesTemplates = [],
  termsTemplates = [],
  scopeTemplates = [],
  prefillFromQuotation = null,
  printSettings,
  printCompany,
}: {
  initialRows: FinanceSalesOrderRow[];
  fetchError?: string | null;
  queryError?: string;
  clientRows: ClientOptionRow[];
  productRows: ProductMasterOptionRow[];
  defaultBankDetails: string;
  sealSignImageUrl: string | null;
  letterheadUpperImageUrl: string | null;
  letterheadLowerImageUrl: string | null;
  notesTemplates?: CompanyTextTemplateRow[];
  termsTemplates?: CompanyTextTemplateRow[];
  scopeTemplates?: CompanyTextTemplateRow[];
  prefillFromQuotation?: FinanceQuotationRow | null;
  printSettings?: PrintSettings;
  printCompany?: PrintCompanyInfo;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState<SalesOrderFormState>(() =>
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

  const salesOrderReturnUrl = useMemo(() => {
    const q = new URLSearchParams();
    if (isNewParam) q.set("new", "1");
    else if (idParam) q.set("id", idParam);
    const s = q.toString();
    return s ? `${SALES_ORDER_LIST_PATH}?${s}` : SALES_ORDER_LIST_PATH;
  }, [isNewParam, idParam]);

  const clientOptions = useMemo(() => clientsToOptions(clientRows), [clientRows]);
  const productOptions = useMemo(() => productsToOptions(productRows), [productRows]);
  const productById = useMemo(() => {
    const m = new Map<string, ProductMasterOptionRow>();
    for (const p of productRows) m.set(p.id, p);
    return m;
  }, [productRows]);
  const clientById = useMemo(() => {
    const m = new Map<string, ClientOptionRow>();
    for (const c of clientRows) m.set(c.id, c);
    return m;
  }, [clientRows]);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (isNewParam) {
      setForm((prev) => {
        const prevPrefix = prev.sales_order_number_prefix.trim();
        const nextNumber = getNextSalesOrderNumberParts(
          initialRows,
          prevPrefix || undefined,
        );
        if (prefillFromQuotation) {
          return quotationToSalesOrderDraft(
            prefillFromQuotation,
            defaultBankDetails,
            nextNumber,
          );
        }
        const base = emptyForm(defaultBankDetails);
        const fromUrl = searchParams.get("client_id")?.trim() ?? "";
        if (fromUrl) return { ...base, ...nextNumber, client_id: fromUrl };
        return { ...base, ...nextNumber, client_id: prev.client_id };
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
  }, [
    searchParams,
    initialRows,
    idParam,
    isNewParam,
    defaultBankDetails,
    prefillFromQuotation,
  ]);

  useEffect(() => {
    if (!formVisible) return;
    const cid = searchParams.get("client_id")?.trim();
    if (!cid) return;
    const q = new URLSearchParams(searchParams.toString());
    q.delete("client_id");
    const qs = q.toString();
    router.replace(`${SALES_ORDER_LIST_PATH}${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [formVisible, searchParams, router]);

  useEffect(() => {
    if (!formVisible) return;
    const qid = searchParams.get("quotation_id")?.trim();
    if (!qid) return;
    const q = new URLSearchParams(searchParams.toString());
    q.delete("quotation_id");
    const qs = q.toString();
    router.replace(`${SALES_ORDER_LIST_PATH}${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [formVisible, searchParams, router]);

  const filtered = useMemo(
    () => filterSalesOrdersBySearch(rows, searchQuery),
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
    (r: FinanceSalesOrderRow) => {
      router.replace(`${SALES_ORDER_LIST_PATH}?id=${encodeURIComponent(r.id)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const downloadRow = useCallback((r: FinanceSalesOrderRow) => {
    const blob = new Blob([JSON.stringify(r, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(r.sales_order_number || "sales-order").trim()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const shareRow = useCallback(
    async (r: FinanceSalesOrderRow) => {
      const url = `${window.location.origin}${SALES_ORDER_LIST_PATH}?id=${encodeURIComponent(r.id)}`;
      const text = `Sales order ${r.sales_order_number || r.id}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: "Sales order", text, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        window.alert("Sales order link copied to clipboard.");
      } catch {
        window.alert("Unable to share right now.");
      }
    },
    [],
  );
  const updateRowStatus = useCallback(
    async (
      r: FinanceSalesOrderRow,
      status: "pending" | "accepted" | "cancelled",
    ) => {
      setRows((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, order_status: status } : x)),
      );
      const result = await updateFinanceSalesOrderStatus({ id: r.id, status });
      if (!result.ok) {
        setRows((prev) =>
          prev.map((x) =>
            x.id === r.id
              ? { ...x, order_status: r.order_status ?? "pending" }
              : x,
          ),
        );
        window.alert(result.error);
        return;
      }
      router.refresh();
    },
    [router],
  );

  const addNew = useCallback(() => {
    router.replace(`${SALES_ORDER_LIST_PATH}?new=1`, { scroll: false });
  }, [router]);

  const closeForm = useCallback(() => {
    router.replace(SALES_ORDER_LIST_PATH, { scroll: false });
  }, [router]);

  const updateField = useCallback((key: keyof SalesOrderFormState, value: string) => {
    setForm((f) => {
      if (key === "order_type") {
        const t = value === "supply" ? "supply" : "service";
        return { ...f, order_type: t };
      }
      return { ...f, [key]: value };
    });
  }, []);

  const updateLine = useCallback((index: number, patch: Partial<SalesOrderLineForm>) => {
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

  const onOrderDateChange = useCallback((iso: string) => {
    setForm((f) => ({
      ...f,
      order_date: iso,
      expected_delivery_date: addOneMonthISO(iso),
    }));
  }, []);

  function handleExport() {
    const csv = buildFinanceSalesOrdersExportCsv(filtered);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-sales-orders-export.csv";
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
          : "No rows to print. Adjust your search or add sales orders.",
      );
      return;
    }
    printFinanceSalesOrdersList(toPrint);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = parseFinanceSalesOrdersImportCsv(text);
    if (!parsed.ok) {
      window.alert(parsed.error);
      return;
    }
    const result = await importFinanceSalesOrders(parsed.rows);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    window.alert(`Imported ${result.inserted} sales order(s).`);
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
            ? "Delete this sales order permanently? This cannot be undone."
            : `Delete ${n} sales orders permanently? This cannot be undone.`,
        )
      ) {
        return;
      }
      void deleteFinanceSalesOrders(bulkIds);
      return;
    }

    if (!idParam || isNewParam) return;
    if (!rows.some((r) => r.id === idParam)) return;
    if (
      !window.confirm(
        "Delete this sales order permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    void deleteFinanceSalesOrder(idParam);
  }

  const hasSelection = selectedIds.size > 0;
  const canDeleteOpenRow =
    !!idParam &&
    !isNewParam &&
    rows.some((r) => r.id === idParam);
  const deleteDisabled = !hasSelection && !canDeleteOpenRow;
  const selectedClient = clientById.get(form.client_id) ?? null;

  const errMsg =
    queryError === "dates"
      ? "Order date and expected delivery date are required."
      : queryError === "type"
        ? "Invalid order type."
        : queryError === "lines"
          ? "Add at least one line with quantity, rate, or product."
          : queryError === "sales_order_number_required"
            ? "Sales order number is required."
            : queryError === "sales_order_number_duplicate"
              ? "That sales order number is already in use. Choose a different number."
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
      {formVisible ? (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
          {selectedClient ? (
            <div className="space-y-1.5">
              <p>
                <span className="font-semibold">Firm:</span>{" "}
                {selectedClient.company_name?.trim() ||
                  selectedClient.name?.trim() ||
                  "—"}
              </p>
              <p>
                <span className="font-semibold">Address:</span>{" "}
                {[
                  selectedClient.address,
                  selectedClient.city,
                  selectedClient.state,
                  selectedClient.pin_code,
                  selectedClient.country,
                ]
                  .map((v) => String(v ?? "").trim())
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
              <p>
                <span className="font-semibold">GST:</span>{" "}
                {selectedClient.gst_number?.trim() || "—"}
              </p>
              <p>
                <span className="font-semibold">Contact:</span>{" "}
                {selectedClient.contact_person_name?.trim() ||
                  selectedClient.name?.trim() ||
                  "—"}
              </p>
              <p>
                <span className="font-semibold">Email:</span>{" "}
                {selectedClient.email?.trim() || "—"}
              </p>
              <p>
                <span className="font-semibold">Mobile:</span>{" "}
                {[
                  String(selectedClient.phone_country_code ?? "").trim(),
                  String(selectedClient.phone ?? "").trim(),
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </p>
            </div>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">
              Select a client to see details here.
            </p>
          )}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <FinanceSalesOrdersHeaderBar
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

        <FinanceSalesOrdersTable
          rows={paginated}
          idParam={idParam}
          onEditRow={selectRow}
          onDownloadRow={downloadRow}
          onShareRow={shareRow}
          onStatusChange={updateRowStatus}
          matchedCount={filteredTotal}
          grandCount={grandTotal}
          searchActive={searchActive}
          grandTotalSum={filteredGrandSum}
          onImportFile={handleImportFile}
          onExport={handleExport}
          onPrintList={handlePrintList}
          onDelete={handleDelete}
          deleteDisabled={deleteDisabled}
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
            aria-labelledby="finance-sales-order-form-title"
            className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <FinanceSalesOrderForm
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
              onOrderDateChange={onOrderDateChange}
              salesOrderReturnUrl={salesOrderReturnUrl}
              sealSignImageUrl={sealSignImageUrl}
              letterheadUpperImageUrl={letterheadUpperImageUrl}
              letterheadLowerImageUrl={letterheadLowerImageUrl}
              selectedClientDetails={selectedClient}
              notesTemplates={notesTemplates}
              termsTemplates={termsTemplates}
              scopeTemplates={scopeTemplates}
              printSettings={printSettings}
              printCompany={printCompany}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
