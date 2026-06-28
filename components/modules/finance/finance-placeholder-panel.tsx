"use client";

import { useRef } from "react";
import { formatDisplayDate } from "@/lib/format-date";
import { FinanceModuleShell } from "./finance-module-shell";

const COLUMN_SETS: Record<
  string,
  { headers: string[]; rows: string[][] }
> = {
  "chart-of-accounts": {
    headers: ["Account Code", "Account Name", "Type", "Group", "Balance (₹)", "Status"],
    rows: [
      ["1001", "Cash in Hand", "Asset", "Current Assets", "—", "Active"],
      ["1002", "Bank Account – HDFC", "Asset", "Current Assets", "—", "Active"],
      ["2001", "Creditors", "Liability", "Current Liabilities", "—", "Active"],
      ["3001", "Capital Account", "Equity", "Owner's Equity", "—", "Active"],
      ["4001", "Sales Revenue", "Income", "Revenue", "—", "Active"],
      ["5001", "Purchase Expenses", "Expense", "Direct Costs", "—", "Active"],
    ],
  },
  "journal-entries": {
    headers: ["Journal No.", "Date", "Particulars", "Debit (₹)", "Credit (₹)", "Narration"],
    rows: [
      ["JV-001", "—", "—", "—", "—", "—"],
      ["JV-002", "—", "—", "—", "—", "—"],
    ],
  },
  "general-ledger": {
    headers: ["Date", "Voucher No.", "Particulars", "Debit (₹)", "Credit (₹)", "Balance (₹)"],
    rows: [
      ["—", "—", "Opening Balance", "—", "—", "0.00"],
    ],
  },
  "bank-reconciliation": {
    headers: ["Date", "Description", "Cheque/Ref No.", "Bank Amount (₹)", "Book Amount (₹)", "Status"],
    rows: [
      ["—", "—", "—", "—", "—", "Unmatched"],
    ],
  },
  "trial-balance": {
    headers: ["Account Code", "Account Name", "Opening Dr", "Opening Cr", "Closing Dr (₹)", "Closing Cr (₹)"],
    rows: [
      ["1001", "Cash in Hand", "0.00", "—", "0.00", "—"],
      ["1002", "Bank Account", "0.00", "—", "0.00", "—"],
      ["2001", "Creditors", "—", "0.00", "—", "0.00"],
      ["4001", "Sales Revenue", "—", "0.00", "—", "0.00"],
      ["5001", "Purchase Expenses", "0.00", "—", "0.00", "—"],
    ],
  },
  "profit-and-loss": {
    headers: ["Particulars", "Current Period (₹)", "Previous Period (₹)", "Variance (₹)", "Variance %"],
    rows: [
      ["INCOME", "", "", "", ""],
      ["Sales Revenue", "0.00", "0.00", "0.00", "0%"],
      ["Other Income", "0.00", "0.00", "0.00", "0%"],
      ["Total Income", "0.00", "0.00", "0.00", "0%"],
      ["EXPENSES", "", "", "", ""],
      ["Direct Costs", "0.00", "0.00", "0.00", "0%"],
      ["Operating Expenses", "0.00", "0.00", "0.00", "0%"],
      ["Total Expenses", "0.00", "0.00", "0.00", "0%"],
      ["NET PROFIT / (LOSS)", "0.00", "0.00", "0.00", "0%"],
    ],
  },
  "balance-sheet": {
    headers: ["Particulars", "Note", "Current Year (₹)", "Previous Year (₹)"],
    rows: [
      ["ASSETS", "", "", ""],
      ["Non-Current Assets", "", "0.00", "0.00"],
      ["Current Assets", "", "0.00", "0.00"],
      ["Total Assets", "", "0.00", "0.00"],
      ["LIABILITIES & EQUITY", "", "", ""],
      ["Equity / Capital", "", "0.00", "0.00"],
      ["Non-Current Liabilities", "", "0.00", "0.00"],
      ["Current Liabilities", "", "0.00", "0.00"],
      ["Total Liabilities & Equity", "", "0.00", "0.00"],
    ],
  },
  "accounts-receivable": {
    headers: ["Client", "Invoice No.", "Invoice Date", "Due Date", "Amount (₹)", "0–30 Days", "31–60 Days", "60+ Days", "Status"],
    rows: [
      ["—", "—", "—", "—", "—", "—", "—", "—", "Current"],
    ],
  },
  "accounts-payable": {
    headers: ["Vendor", "Bill No.", "Bill Date", "Due Date", "Amount (₹)", "0–30 Days", "31–60 Days", "60+ Days", "Status"],
    rows: [
      ["—", "—", "—", "—", "—", "—", "—", "—", "Current"],
    ],
  },
  "cash-flow-statement": {
    headers: ["Particulars", "Current Period (₹)", "Previous Period (₹)"],
    rows: [
      ["A. Operating Activities", "", ""],
      ["Net Profit / (Loss)", "0.00", "0.00"],
      ["Adjustments for non-cash items", "0.00", "0.00"],
      ["Net Cash from Operations", "0.00", "0.00"],
      ["B. Investing Activities", "", ""],
      ["Purchase of Assets", "0.00", "0.00"],
      ["Net Cash from Investing", "0.00", "0.00"],
      ["C. Financing Activities", "", ""],
      ["Capital Introduced", "0.00", "0.00"],
      ["Net Cash from Financing", "0.00", "0.00"],
      ["Net Change in Cash", "0.00", "0.00"],
    ],
  },
  "gst-vat-reports": {
    headers: ["GSTIN", "Party Name", "Invoice No.", "Invoice Date", "Taxable Value (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Total Tax (₹)"],
    rows: [
      ["—", "—", "—", "—", "0.00", "0.00", "0.00", "0.00", "0.00"],
    ],
  },
  "tds-tcs-management": {
    headers: ["Deductee / Collectee", "PAN", "Section", "Payment Date", "Gross Amount (₹)", "TDS/TCS Rate", "TDS/TCS Amount (₹)", "Certificate No."],
    rows: [
      ["—", "—", "194C", "—", "0.00", "1%", "0.00", "—"],
    ],
  },
  "audit-logs": {
    headers: ["Timestamp", "User", "Module", "Action", "Record ID", "Field Changed", "Old Value", "New Value"],
    rows: [
      ["—", "—", "Finance", "—", "—", "—", "—", "—"],
    ],
  },
};

const DEFAULT_COLS = {
  headers: ["Reference", "Date", "Party", "Amount (₹)", "Status", "Notes"],
  rows: [
    ["—", "—", "—", "0.00", "Draft", "—"],
  ],
};

export function FinancePlaceholderPanel({
  breadcrumb,
  title,
  description,
  slug,
}: {
  breadcrumb: string;
  title: string;
  description: string;
  slug?: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const colDef = (slug && COLUMN_SETS[slug]) ? COLUMN_SETS[slug] : DEFAULT_COLS;

  function handlePrint() {
    if (!printRef.current) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
  h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
  p.sub { font-size: 11px; color: #555; margin-bottom: 16px; }
  .meta { display: flex; gap: 24px; margin-bottom: 12px; font-size: 11px; color: #444; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f4f4f4; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; border: 1px solid #ddd; }
  td { padding: 5px 8px; border: 1px solid #e0e0e0; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<h1>${title}</h1>
<p class="sub">${description}</p>
<div class="meta">
  <span>Date: ${formatDisplayDate(new Date())}</span>
  <span>Printed: ${new Date().toLocaleString("en-IN")}</span>
</div>
${printRef.current.innerHTML}
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  function handleExportCSV() {
    const rows = [colDef.headers, ...colDef.rows];
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug ?? "report"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <FinanceModuleShell
      breadcrumb={breadcrumb}
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v8m0 0-3-3m3 3 3-3M3 12h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 6V2h8v4M4 12H2V7h12v5h-2M4 12v2h8v-2M4 12h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Print
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500"
          >
            + New Entry
          </button>
        </div>
      }
    >
      {/* Filters bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 2.5 2.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search…"
            className="w-44 rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">From</label>
          <input
            type="date"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">To</label>
          <input
            type="date"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
        </div>
        <select className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30">
          <option value="">All Status</option>
          <option>Draft</option>
          <option>Active</option>
          <option>Paid</option>
          <option>Overdue</option>
          <option>Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div
        ref={printRef}
        className="overflow-x-auto rounded-lg border border-zinc-800"
      >
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/70 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            <tr>
              {colDef.headers.map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {colDef.rows.map((row, ri) => (
              <tr
                key={ri}
                className={`transition ${
                  row[0] && !row[0].startsWith("—") && row[1] === ""
                    ? "bg-zinc-800/30 font-semibold text-zinc-300"
                    : "hover:bg-zinc-800/30"
                }`}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-4 py-2.5 text-zinc-400 whitespace-nowrap"
                  >
                    {cell || (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td
                colSpan={colDef.headers.length}
                className="px-4 py-10 text-center text-xs text-zinc-500"
              >
                No records yet.{" "}
                <span className="text-zinc-400">
                  Add your first entry using the{" "}
                  <span className="font-medium text-zinc-300">+ New Entry</span>{" "}
                  button above.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>Showing 0 records</span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled
            className="rounded border border-zinc-800 px-2.5 py-1 text-zinc-600 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled
            className="rounded border border-zinc-800 px-2.5 py-1 text-zinc-600 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </FinanceModuleShell>
  );
}
