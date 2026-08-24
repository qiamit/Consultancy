"use client";

import { FinanceFormOverlayHeader } from "@/components/modules/finance/finance-form-overlay-header";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { DROPDOWN_KEY_FINANCE_PAYMENT_OUT_CLIENT } from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import {
  saveFinancePaymentOut,
  deleteFinancePaymentOutForm,
} from "@backend/actions/finance-payment-outs";
import type { PrintSettings, PrintCompanyInfo } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { DEFAULT_PRINT_SETTINGS } from "@backend/modules/print/types";
import type { PaymentInFormState } from "./constants";

function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function esc(s: string): string {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function FinancePaymentOutForm({
  formValues,
  clientOptions,
  onClose,
  onAddNew,
  onUpdateField,
  selectedClientName,
  printSettings,
  printCompany,
}: {
  formValues: PaymentInFormState;
  clientOptions: AppDropdownOptionRow[];
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (k: keyof PaymentInFormState, v: string) => void;
  selectedClientName?: string | null;
  printSettings?: PrintSettings;
  printCompany?: PrintCompanyInfo;
}) {
  const buildDocBody = () => {
    const amt = parseFloat(formValues.amount) || 0;
    const client = selectedClientName || formValues.client_id || "—";
    const mode = formValues.mode_of_payment.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const status = formValues.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0 14px;border-bottom:2px solid currentColor;margin-bottom:14px;">
  <div style="font-size:26px;font-weight:700;letter-spacing:.5px;">PAYMENT VOUCHER</div>
  <div style="text-align:right;font-size:12px;">
    <div style="font-size:16px;font-weight:700;font-family:monospace;">${esc(formValues.id || "DRAFT")}</div>
    <div>Date: ${esc(formatDisplayDate(formValues.txn_date, "—"))}</div>
  </div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
  <tbody>
    <tr><td style="padding:6px 10px;font-size:11px;font-weight:700;width:35%;border:1px solid #e5e7eb;">Paid To</td><td style="padding:6px 10px;font-size:11px;border:1px solid #e5e7eb;">${esc(client)}</td></tr>
    <tr><td style="padding:6px 10px;font-size:11px;font-weight:700;border:1px solid #e5e7eb;">Amount Paid</td><td style="padding:6px 10px;font-size:11px;font-weight:700;border:1px solid #e5e7eb;">${formatInr(amt)}</td></tr>
    <tr><td style="padding:6px 10px;font-size:11px;font-weight:700;border:1px solid #e5e7eb;">Mode of Payment</td><td style="padding:6px 10px;font-size:11px;border:1px solid #e5e7eb;">${esc(mode)}</td></tr>
    <tr><td style="padding:6px 10px;font-size:11px;font-weight:700;border:1px solid #e5e7eb;">Status</td><td style="padding:6px 10px;font-size:11px;border:1px solid #e5e7eb;">${esc(status)}</td></tr>
    ${formValues.description ? `<tr><td style="padding:6px 10px;font-size:11px;font-weight:700;border:1px solid #e5e7eb;">Description</td><td style="padding:6px 10px;font-size:11px;border:1px solid #e5e7eb;">${esc(formValues.description)}</td></tr>` : ""}
    ${formValues.notes ? `<tr><td style="padding:6px 10px;font-size:11px;font-weight:700;border:1px solid #e5e7eb;">Notes</td><td style="padding:6px 10px;font-size:11px;border:1px solid #e5e7eb;">${esc(formValues.notes)}</td></tr>` : ""}
  </tbody>
</table>
<div style="margin-top:32px;display:flex;justify-content:flex-end;">
  <div style="text-align:center;border-top:1px solid #374151;padding-top:6px;min-width:160px;font-size:10px;color:#6b7280;">Authorised Signature</div>
</div>`;
  };

  const printDoc = async () => {
    const { openPrintPreview } = await import("@backend/modules/print/preview");
    const { buildPrintDocument } = await import("@backend/modules/print/engine");
    const settings = printSettings ?? DEFAULT_PRINT_SETTINGS;
    const company = printCompany ?? ({} as PrintCompanyInfo);
    openPrintPreview({
      buildDoc: (s, c) =>
        buildPrintDocument({
          title: `Payment OUT ${formValues.id || ""}`,
          bodyHtml: buildDocBody(),
          settings: s,
          company: c,
        }),
      initialSettings: settings,
      company,
    });
  };

  const createPdfBlob = async (): Promise<Blob> => {
    const html2pdf = (await import("html2pdf.js")).default;
    const { buildPrintDocument } = await import("@backend/modules/print/engine");
    const settings = printSettings ?? DEFAULT_PRINT_SETTINGS;
    const company = printCompany ?? ({} as PrintCompanyInfo);
    const html = buildPrintDocument({
      title: `Payment OUT ${formValues.id || ""}`,
      bodyHtml: buildDocBody(),
      settings,
      company,
    });
    const mount = document.createElement("div");
    mount.style.cssText = "position:fixed;left:0;top:0;width:210mm;opacity:0;pointer-events:none;z-index:-1;";
    mount.innerHTML = html;
    document.body.appendChild(mount);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      return (await html2pdf().from(mount).set({
        margin: [6, 6, 6, 6],
        filename: `payment-out-${formValues.id || "draft"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).outputPdf("blob")) as Blob;
    } finally {
      mount.remove();
    }
  };

  const downloadPdf = async () => {
    const blob = await createPdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-out-${formValues.id || "draft"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sharePdf = async () => {
    try {
      const blob = await createPdfBlob();
      const file = new File([blob], `payment-out-${formValues.id || "draft"}.pdf`, { type: "application/pdf" });
      if (navigator.share && (navigator as Navigator & { canShare?: (d: ShareData) => boolean }).canShare?.({ files: [file] })) {
        await navigator.share({ title: "Payment OUT", files: [file] });
        return;
      }
      await navigator.clipboard.writeText(typeof window !== "undefined" ? window.location.href : "");
      window.alert("Link copied to clipboard.");
    } catch {
      window.alert("Unable to share right now.");
    }
  };

  const btnClass =
    "rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div className="px-4 pb-5 pt-0">
      <FinanceFormOverlayHeader
        titleId="finance-payment-out-form-title"
        title={formValues.id ? "Edit Payment OUT" : "New Payment OUT"}
        onClose={onClose}
        showAddNew={!!formValues.id}
        addNewLabel="Add New"
        onAddNew={onAddNew}
      />
      <form action={saveFinancePaymentOut} className="grid gap-3 md:grid-cols-2">
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
            optionKey={DROPDOWN_KEY_FINANCE_PAYMENT_OUT_CLIENT}
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

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 pt-4 md:col-span-2 dark:border-zinc-800">
          {formValues.id ? (
            <>
              <button type="button" onClick={downloadPdf} className={btnClass}>Download</button>
              <button
                type="button"
                onClick={() => void printDoc()}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/60"
              >
                🖨 Print Preview
              </button>
              <button type="button" onClick={sharePdf} className={btnClass}>Share</button>
            </>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            Save Payment OUT
          </button>
          {formValues.id ? (
            <button
              type="submit"
              formAction={deleteFinancePaymentOutForm}
              className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Delete Payment OUT
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
