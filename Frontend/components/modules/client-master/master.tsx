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
  deleteClientMaster,
  deleteClientsMaster,
  importClientsMaster,
} from "@backend/actions/clients";
import { buildClientExportCsv, parseClientImportCsv } from "@backend/modules/clients/client-master-csv";
import type { ClientMasterRow } from "@backend/shared/types/client-master";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { emptyForm, rowToForm } from "./constants";
import { ClientMasterForm } from "./form";
import { ClientMasterHeaderBar } from "./header-bar";
import { filterClientsBySearch, PAGE_SIZE_OPTIONS } from "./search-utils";
import { printClientMasterList } from "./print-client-row";
import { ClientMasterTable } from "./table";

const ENUM_FIELD_ERROR_MESSAGES: Record<string, string> = {
  enum: "Invalid option selected.",
  enum_company_type:
    "Company type is not recognized. Choose from the dropdown or add it with +.",
  enum_company_scale:
    "Company scale is not recognized. Choose from the dropdown or add it with +.",
  enum_company_status:
    "Company status is not recognized. Choose Active or Inactive (or add statuses in the database).",
  enum_balance_type: "Balance type must be Dr or Cr.",
  enum_payment_term:
    "Payment term is not recognized. Choose from the dropdown or add it with +.",
  enum_city:
    "City is not in the allowed list. Select from the dropdown or add it with +.",
  enum_state:
    "State is not in the allowed list. Select from the dropdown or add it with +.",
  enum_country:
    "Country is not in the allowed list. Select from the dropdown or add it with +.",
  enum_pin_code:
    "PIN code is not in the allowed list. Select from the dropdown or add it with +.",
  enum_phone_country_code:
    "Phone country code is not recognized. Select from the dropdown or add it with +.",
};

export function ClientMaster({
  initialClients,
  fetchError,
  queryError,
  dbErrorCode,
  dbErrorHint,
  companyTypeOptions,
  companyScaleOptions,
  companyStatusOptions,
  pinCodeOptions,
  cityOptions,
  stateOptions,
  countryOptions,
  paymentTermOptions,
  phoneCountryCodeOptions,
  returnToAfterSave,
}: {
  initialClients: ClientMasterRow[];
  fetchError?: string | null;
  queryError?: string;
  /** Postgres / PostgREST error code when `queryError` is `db`. */
  dbErrorCode?: string;
  /** Short database error message when save fails. */
  dbErrorHint?: string;
  companyTypeOptions: AppDropdownOptionRow[];
  companyScaleOptions: AppDropdownOptionRow[];
  companyStatusOptions: AppDropdownOptionRow[];
  pinCodeOptions: AppDropdownOptionRow[];
  cityOptions: AppDropdownOptionRow[];
  stateOptions: AppDropdownOptionRow[];
  countryOptions: AppDropdownOptionRow[];
  paymentTermOptions: AppDropdownOptionRow[];
  phoneCountryCodeOptions: AppDropdownOptionRow[];
  /** After saving a new client, redirect here (e.g. quotation form URL). */
  returnToAfterSave?: string | null;
}) {
  const { open: sidebarOpen } = useSidebarLayout();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients] = useSyncedRows(initialClients);
  const [searchQuery, setSearchQuery] = useState("");

  const idParam = searchParams.get("id");
  const isNewParam = searchParams.get("new") === "1";
  const editRow =
    idParam && !isNewParam
      ? clients.find((c) => c.id === idParam) ?? undefined
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
        const row = initialClients.find((c) => c.id === idParam);
        if (row) return rowToForm(row);
      }
      return emptyForm();
    },
    emptyForm(),
  );

  const filteredClients = useMemo(
    () => filterClientsBySearch(clients, searchQuery),
    [clients, searchQuery],
  );

  const filteredSum = useMemo(
    () =>
      filteredClients.reduce(
        (acc, c) => acc + (Number(c.opening_balance) || 0),
        0,
      ),
    [filteredClients],
  );

  const grandTotal = clients.length;
  const filteredTotal = filteredClients.length;
  const searchActive = searchQuery.trim().length > 0;

  const {
    pageSize,
    page,
    setPage,
    totalPages,
    paginated: paginatedClients,
    onPageSizeChange,
  } = useFinanceListPagination(filteredClients, searchQuery, PAGE_SIZE_OPTIONS[0]);

  const filteredClientIds = useMemo(
    () => filteredClients.map((c) => c.id),
    [filteredClients],
  );
  const { selectedIds, toggleRowSelection, toggleSelectPage } =
    usePrunedSetSelection(filteredClientIds);

  const toggleSelectPageRows = useCallback(() => {
    toggleSelectPage(paginatedClients.map((c) => c.id));
  }, [toggleSelectPage, paginatedClients]);

  function selectRow(c: ClientMasterRow) {
    router.replace(`/dashboard/clients?id=${c.id}`, { scroll: false });
  }

  function addNew() {
    router.replace("/dashboard/clients?new=1", { scroll: false });
  }

  function closeForm() {
    router.replace("/dashboard/clients", { scroll: false });
  }

  function updateField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleExport() {
    const csv = buildClientExportCsv(filteredClients);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client-master-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintList() {
    const selectedRows = filteredClients.filter((c) => selectedIds.has(c.id));
    const toPrint =
      selectedRows.length > 0 ? selectedRows : filteredClients;
    if (toPrint.length === 0) {
      window.alert(
        selectedIds.size > 0
          ? "No matching rows for the current search. Clear the search or adjust filters."
          : "No rows to print. Adjust your search or add clients.",
      );
      return;
    }
    printClientMasterList(toPrint);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = parseClientImportCsv(text);
    if (!parsed.ok) {
      window.alert(parsed.error);
      return;
    }
    const result = await importClientsMaster(parsed.rows);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    window.alert(`Imported ${result.inserted} client(s).`);
    router.refresh();
  }

  function handleDelete() {
    const bulkIds = filteredClients
      .filter((c) => selectedIds.has(c.id))
      .map((c) => c.id);

    if (bulkIds.length > 0) {
      const n = bulkIds.length;
      if (
        !window.confirm(
          n === 1
            ? "Delete this client permanently? This cannot be undone."
            : `Delete ${n} clients permanently? This cannot be undone.`,
        )
      ) {
        return;
      }
      void deleteClientsMaster(bulkIds);
      return;
    }

    if (!idParam || isNewParam) return;
    if (!clients.some((c) => c.id === idParam)) return;
    if (
      !window.confirm(
        "Delete this client permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    void deleteClientMaster(idParam);
  }

  function handleDeleteRow(c: ClientMasterRow) {
    const label = c.company_name ?? c.name ?? "this client";
    if (
      !window.confirm(
        `Delete "${label}" permanently? This cannot be undone.`,
      )
    ) {
      return;
    }
    void deleteClientMaster(c.id);
  }

  const hasSelection = selectedIds.size > 0;
  const canDeleteOpenRow =
    !!idParam &&
    !isNewParam &&
    clients.some((c) => c.id === idParam);
  const deleteDisabled = !hasSelection && !canDeleteOpenRow;

  const enumMsg =
    queryError &&
    (ENUM_FIELD_ERROR_MESSAGES[queryError] ??
      (queryError.startsWith("enum_")
        ? ENUM_FIELD_ERROR_MESSAGES.enum
        : undefined));

  const errMsg =
    enumMsg ??
    (queryError === "company"
        ? "Company name is required."
        : queryError === "contact"
          ? "Contact person name is required."
          : queryError === "duplicate"
            ? "This company name is already used by another client. Company names must be unique."
            : queryError === "gst"
              ? "GST number must be a valid 15-character GSTIN (2-digit state code + 10-character PAN + entity + type + check digit), or left blank."
              : queryError === "email"
                ? "Email must be a valid address (e.g. name@company.com), or left blank."
                : queryError === "amount"
                  ? "Opening balance must be a valid number."
                : queryError === "db"
                  ? "Could not save. Check your connection and try again."
                  : fetchError ?? null);

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
        <ClientMasterHeaderBar
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

        <ClientMasterTable
          clients={paginatedClients}
          idParam={idParam}
          onEditRow={selectRow}
          matchedCount={filteredTotal}
          grandCount={grandTotal}
          searchActive={searchActive}
          openingBalanceSum={filteredSum}
          onImportFile={handleImportFile}
          onExport={handleExport}
          onPrintList={handlePrintList}
          onDelete={handleDelete}
          deleteDisabled={deleteDisabled}
          onDeleteRow={handleDeleteRow}
          selectedIds={selectedIds}
          onToggleRowSelection={toggleRowSelection}
          onToggleSelectPage={toggleSelectPageRows}
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
            aria-labelledby="client-master-form-title"
            className="mb-10 w-full max-w-5xl rounded-none border-[2mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <ClientMasterForm
              visible
              overlay
              form={form}
              isNewParam={isNewParam}
              idParam={idParam}
              onClose={closeForm}
              onAddNew={addNew}
              onUpdateField={updateField}
              companyTypeOptions={companyTypeOptions}
              companyScaleOptions={companyScaleOptions}
              companyStatusOptions={companyStatusOptions}
              pinCodeOptions={pinCodeOptions}
              cityOptions={cityOptions}
              stateOptions={stateOptions}
              countryOptions={countryOptions}
              paymentTermOptions={paymentTermOptions}
              phoneCountryCodeOptions={phoneCountryCodeOptions}
              returnToAfterSave={returnToAfterSave}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
