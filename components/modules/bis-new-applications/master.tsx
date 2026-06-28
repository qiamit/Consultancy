"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  useCloseWhenHidden,
  useFinanceListPagination,
  usePrunedSetSelection,
  useRouteBoundFormState,
  useSyncedRowsWhen,
} from "@/components/modules/finance/use-finance-master-state";
import { emptyForm as clientMasterEmptyForm } from "@/components/modules/client-master/constants";
import { ClientMasterForm } from "@/components/modules/client-master/form";
import { emptyForm as isCodeEmptyForm } from "@/components/modules/is-code-master/constants";
import { IsCodeMasterForm } from "@/components/modules/is-code-master/form";
import {
  deleteBisNewApplication,
  deleteBisNewApplications,
  importBisNewApplicationsMaster,
} from "@/lib/actions/bis-new-applications";
import type { BisNewApplicationsFormDropdownOptions } from "@/lib/data/bis-new-applications-dropdowns";
import type { ClientMasterDropdownOptions } from "@/lib/data/client-master-dropdowns";
import type { IsCodeFormDropdownOptions } from "@/lib/data/is-code-form-dropdowns";
import {
  buildBisNewApplicationExportCsv,
  parseBisNewApplicationImportCsv,
} from "@/lib/bis-new-application-csv";
import type { BisNewApplicationMasterRow } from "@/lib/types/bis-new-application-master";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import { emptyForm, rowToForm } from "./constants";
import { BisNewApplicationsMasterForm } from "./form";
import { BisNewApplicationsMasterHeaderBar } from "./header-bar";
import { filterBisNewApplicationsBySearch, PAGE_SIZE_OPTIONS } from "./search-utils";
import { printBisNewApplicationsMasterList } from "./print-bis-new-application-list";
import { BisNewApplicationsMasterTable } from "./table";

const QUERY_ERROR_MESSAGES: Record<string, string> = {
  kind: "Choose a valid project type.",
  client: "Select a client.",
  is_code: "Select an IS code.",
  cm_digits: "CM/L number must be exactly 10 digits or left blank.",
  validity_na: "Licence validity must be blank for Application type.",
  billing_freq: "Choose a valid billing frequency.",
  billing_amount: "Enter a valid billing amount.",
  status: "Invalid record status.",
  upload: "Document upload failed. Try again.",
  db: "Could not complete the operation. Check your connection and try again.",
};

export type BisProjectClientOptionRow = {
  id: string;
  name: string;
  company_name: string | null;
};

export type BisProjectIsCodeOptionRow = {
  id: string;
  is_number: string;
  is_code_title: string;
  revision_year: number;
};

export function BisNewApplicationsMaster({
  initialRows,
  fetchError,
  queryError,
  dbErrorCode,
  dbErrorHint,
  clientRows,
  isCodeRows,
  clientMasterDropdowns,
  isCodeFormDropdowns,
  bisNewApplicationsFormDropdowns,
}: {
  initialRows: BisNewApplicationMasterRow[];
  fetchError?: string | null;
  queryError?: string;
  dbErrorCode?: string;
  dbErrorHint?: string;
  clientRows: BisProjectClientOptionRow[];
  isCodeRows: BisProjectIsCodeOptionRow[];
  clientMasterDropdowns: ClientMasterDropdownOptions;
  isCodeFormDropdowns: IsCodeFormDropdownOptions;
  bisNewApplicationsFormDropdowns: BisNewApplicationsFormDropdownOptions;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const isNewParam = searchParams.get("new") === "1";
  const editRow =
    idParam && !isNewParam
      ? initialRows.find((r) => r.id === idParam) ?? undefined
      : undefined;
  const formVisible = isNewParam || !!editRow;
  const [rows] = useSyncedRowsWhen(initialRows, !formVisible);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [embedClientOpen, setEmbedClientOpen] = useState(false);
  const [embedIsCodeOpen, setEmbedIsCodeOpen] = useState(false);
  const [embedClientForm, setEmbedClientForm] = useState(() =>
    clientMasterEmptyForm(),
  );
  const [embedIsCodeForm, setEmbedIsCodeForm] = useState(() =>
    isCodeEmptyForm(),
  );

  useCloseWhenHidden(formVisible, [setEmbedClientOpen, setEmbedIsCodeOpen]);

  const clientOptions: AppDropdownOptionRow[] = useMemo(
    () =>
      clientRows.map((c) => {
        const company = (c.company_name ?? "").trim();
        return {
          id: c.id,
          value: c.id,
          label: company || c.name,
          filterText: [c.name, c.company_name].filter(Boolean).join(" ") || null,
          canDelete: false,
        };
      }),
    [clientRows],
  );

  const isCodeOptions = useMemo(
    () =>
      isCodeRows.map((r) => ({
        id: r.id,
        label: `${r.is_number}: ${r.revision_year}`,
        filterText: `${r.is_number} ${r.revision_year} ${r.is_code_title}`,
      })),
    [isCodeRows],
  );

  const filteredRows = useMemo(
    () => filterBisNewApplicationsBySearch(rows, searchQuery),
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

  function selectRow(r: BisNewApplicationMasterRow) {
    router.replace(`/dashboard/bis-new-applications?id=${r.id}`, { scroll: false });
  }

  function addNew() {
    router.replace("/dashboard/bis-new-applications?new=1", { scroll: false });
  }

  function closeForm() {
    router.replace("/dashboard/bis-new-applications", { scroll: false });
  }

  function updateField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = parseBisNewApplicationImportCsv(text);
    if (!parsed.ok) {
      window.alert(parsed.error);
      return;
    }
    const result = await importBisNewApplicationsMaster(parsed.rows);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    window.alert(`Imported ${result.inserted} project(s).`);
    router.refresh();
  }

  function handleExport() {
    const csv = buildBisNewApplicationExportCsv(filteredRows);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bis-new-applications-export.csv";
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
          : "No rows to print. Adjust your search or add a project.",
      );
      return;
    }
    printBisNewApplicationsMasterList(toPrint);
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
            ? "Delete this BIS new application permanently? This cannot be undone."
            : `Delete ${n} BIS new applications permanently? This cannot be undone.`,
        )
      ) {
        return;
      }
      void deleteBisNewApplications(bulkIds);
      return;
    }

    if (!idParam || isNewParam) return;
    if (!rows.some((r) => r.id === idParam)) return;
    if (
      !window.confirm(
        "Delete this BIS new application permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    void deleteBisNewApplication(idParam);
  }

  function handleDeleteRow(r: BisNewApplicationMasterRow) {
    const label = r.title?.trim() || "this project";
    if (
      !window.confirm(
        `Delete "${label}" permanently? This cannot be undone.`,
      )
    ) {
      return;
    }
    void deleteBisNewApplication(r.id);
  }

  const hasSelection = selectedIds.size > 0;
  const canDeleteOpenRow =
    !!idParam &&
    !isNewParam &&
    rows.some((r) => r.id === idParam);
  const deleteDisabled = !hasSelection && !canDeleteOpenRow;

  const errMsg =
    (queryError && QUERY_ERROR_MESSAGES[queryError]) ??
    (queryError === "db"
      ? QUERY_ERROR_MESSAGES.db
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
        <BisNewApplicationsMasterHeaderBar
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

        <BisNewApplicationsMasterTable
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
            aria-labelledby="bis-new-applications-master-form-title"
            className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <BisNewApplicationsMasterForm
              visible
              overlay
              formValues={form}
              isNewParam={isNewParam}
              idParam={idParam}
              clientOptions={clientOptions}
              isCodeOptions={isCodeOptions}
              projectKindOptions={bisNewApplicationsFormDropdowns.projectKindOptions}
              billingFrequencyOptions={
                bisNewApplicationsFormDropdowns.billingFrequencyOptions
              }
              onClose={closeForm}
              onAddNew={addNew}
              onUpdateField={updateField}
              onRequestQuickAddClient={() => {
                setEmbedClientForm(clientMasterEmptyForm());
                setEmbedClientOpen(true);
              }}
              onRequestQuickAddIsCode={() => {
                setEmbedIsCodeForm(isCodeEmptyForm());
                setEmbedIsCodeOpen(true);
              }}
            />
          </div>
        </div>
      ) : null}

      {embedClientOpen ? (
        <div
          className="fixed inset-0 z-[127] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmbedClientOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-master-form-title"
            className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <ClientMasterForm
              visible
              overlay
              form={embedClientForm}
              isNewParam
              idParam={null}
              onClose={() => setEmbedClientOpen(false)}
              onAddNew={() => setEmbedClientForm(clientMasterEmptyForm())}
              onUpdateField={(key, value) =>
                setEmbedClientForm((f) => ({ ...f, [key]: value }))
              }
              {...clientMasterDropdowns}
              embeddedInBis
              onEmbeddedSaveSuccess={(id) => {
                updateField("client_id", id);
                setEmbedClientOpen(false);
                router.refresh();
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
                setEmbedIsCodeOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
