"use client";

import { useMemo, useState } from "react";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import type { FinancePaymentInRow } from "@backend/shared/types/finance-payment-in";
import type { PrintSettings, PrintCompanyInfo } from "@backend/modules/print/types";
import { emptyForm, PAYMENT_IN_LIST_PATH, rowToForm, type PaymentInFormState } from "./constants";
import { FinancePaymentInForm } from "./form";
import { FinancePaymentInsHeaderBar } from "./header-bar";
import { filterPaymentInsBySearch } from "./search-utils";
import { FinancePaymentInsTable } from "./table";
import { FinanceFormModalShell } from "@/components/modules/finance/finance-form-modal-shell";
import { useRouteBoundFormState } from "@/components/modules/finance/use-finance-master-state";

export function FinancePaymentInsMaster({
  initialRows,
  queryId,
  isNew,
  clientRows,
  printSettings,
  printCompany,
}: {
  initialRows: FinancePaymentInRow[];
  queryId: string | null;
  isNew: boolean;
  clientRows: Array<{ id: string; name: string; company_name: string | null }>;
  printSettings?: PrintSettings;
  printCompany?: PrintCompanyInfo;
}) {
  const [rows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterPaymentInsBySearch(rows, searchQuery), [rows, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);
  const totalAmount = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);

  const editRow = queryId && !isNew ? rows.find((r) => r.id === queryId) ?? null : null;
  const formVisible = isNew || !!editRow;
  const idParam = editRow?.id ?? null;
  const formOpenKey = formVisible ? (isNew ? "new" : `edit:${editRow?.id ?? ""}`) : null;
  const [form, setForm] = useRouteBoundFormState<PaymentInFormState>(
    formOpenKey,
    (prev) => (editRow ? rowToForm(editRow) : isNew ? emptyForm() : prev),
    emptyForm(),
  );

  const clientOptions: AppDropdownOptionRow[] = clientRows.map((c) => {
    const company = (c.company_name ?? "").trim();
    const name = (c.name ?? "").trim();
    const label = company || name || "Unnamed client";
    return {
      id: c.id,
      value: c.id,
      label,
      canDelete: false,
      filterText: [company, name].filter(Boolean).join(" "),
    };
  });

  return (
    <div className="w-full max-w-none space-y-0">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <FinancePaymentInsHeaderBar
          onAddNew={() => (window.location.href = `${PAYMENT_IN_LIST_PATH}?new=1`)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pageSize={pageSize}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          grandTotal={rows.length}
          filteredTotal={filtered.length}
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        <FinancePaymentInsTable
          rows={paginated}
          idParam={idParam}
          onEditRow={(r) => (window.location.href = `${PAYMENT_IN_LIST_PATH}?id=${encodeURIComponent(r.id)}`)}
          matchedCount={filtered.length}
          totalAmount={totalAmount}
        />
      </div>

      {formVisible ? (
        <FinanceFormModalShell
          ariaLabelledBy="finance-payment-in-form-title"
          onClose={() => (window.location.href = PAYMENT_IN_LIST_PATH)}
        >
            <FinancePaymentInForm
              formValues={form}
              clientOptions={clientOptions}
              onClose={() => (window.location.href = PAYMENT_IN_LIST_PATH)}
              onAddNew={() => {
                setForm(emptyForm());
                window.history.replaceState(null, "", `${PAYMENT_IN_LIST_PATH}?new=1`);
              }}
              onUpdateField={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
              selectedClientName={
                clientRows.find((c) => c.id === form.client_id)?.company_name ||
                clientRows.find((c) => c.id === form.client_id)?.name || null
              }
              printSettings={printSettings}
              printCompany={printCompany}
            />
        </FinanceFormModalShell>
      ) : null}
    </div>
  );
}
