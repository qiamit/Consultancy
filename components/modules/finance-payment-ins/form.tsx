"use client";

import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { DROPDOWN_KEY_FINANCE_PAYMENT_IN_CLIENT } from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import { saveFinancePaymentIn } from "@/lib/actions/finance-payment-ins";
import type { PaymentInFormState } from "./constants";

export function FinancePaymentInForm({
  formValues,
  clientOptions,
  onClose,
  onAddNew,
  onUpdateField,
}: {
  formValues: PaymentInFormState;
  clientOptions: AppDropdownOptionRow[];
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (k: keyof PaymentInFormState, v: string) => void;
}) {
  return (
    <div className="rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payment IN</h2>
        <div className="flex gap-2">
          <button type="button" onClick={onAddNew} className="rounded bg-zinc-200 px-3 py-1 text-sm dark:bg-zinc-700">
            Add New
          </button>
          <button type="button" onClick={onClose} className="rounded bg-zinc-200 px-3 py-1 text-sm dark:bg-zinc-700">
            Close
          </button>
        </div>
      </div>
      <form action={saveFinancePaymentIn} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={formValues.id} />
        <div className="space-y-1">
          <label className="text-xs font-medium">Date</label>
          <input
            type="date"
            name="txn_date"
            value={formValues.txn_date}
            onChange={(e) => onUpdateField("txn_date", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div className="space-y-1">
          <ClientDropdownField
            optionKey={DROPDOWN_KEY_FINANCE_PAYMENT_IN_CLIENT}
            name="client_id"
            label="Client"
            dialogTitle="Clients"
            addPlaceholder="Add client value"
            manageAriaLabel="Add new client"
            value={formValues.client_id}
            onChange={(v) => onUpdateField("client_id", v)}
            options={clientOptions}
            selectedValue={formValues.client_id}
            onClearSelection={() => onUpdateField("client_id", "")}
            searchPlaceholder="Search company name…"
            emptySelectLabel="— Select client —"
            suffixButtonClassName="px-1.5 py-1 text-[10px]"
            blankInputWhenNoSelection
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Amount (INR)</label>
          <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-600 dark:bg-zinc-950">
            <span className="px-3 text-sm text-zinc-500 dark:text-zinc-400">Rs.</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              value={formValues.amount}
              onChange={(e) => onUpdateField("amount", e.target.value)}
              className="w-full border-0 px-3 py-2 text-sm outline-none focus:ring-0 dark:bg-zinc-950"
            />
          </div>
        </div>
        <input type="hidden" name="currency" value="INR" />
        <div className="space-y-1">
          <label className="text-xs font-medium">Mode of Payment</label>
          <select
            name="mode_of_payment"
            value={formValues.mode_of_payment}
            onChange={(e) => onUpdateField("mode_of_payment", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
            <option value="neft_rtgs">NEFT / RTGS</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <select
            name="status"
            value={formValues.status}
            onChange={(e) => onUpdateField("status", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="written_off">Written off</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Description</label>
          <input
            name="description"
            value={formValues.description}
            onChange={(e) => onUpdateField("description", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Notes</label>
          <textarea
            name="notes"
            value={formValues.notes}
            onChange={(e) => onUpdateField("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">
            Save Payment IN
          </button>
        </div>
      </form>
    </div>
  );
}

