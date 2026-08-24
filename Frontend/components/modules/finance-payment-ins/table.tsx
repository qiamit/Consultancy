"use client";

import type { FinancePaymentInRow } from "@backend/shared/types/finance-payment-in";
import { formatDateField } from "@backend/shared/format-date";
import { FinancePaymentInsFooterBar } from "./footer-bar";

function clientLabel(r: FinancePaymentInRow): string {
  const c = r.clients;
  if (!c) return "—";
  return (c.company_name ?? "").trim() || (c.name ?? "").trim() || "—";
}

export function FinancePaymentInsTable({
  rows,
  idParam,
  onEditRow,
  matchedCount,
  totalAmount,
}: {
  rows: FinancePaymentInRow[];
  idParam: string | null;
  onEditRow: (r: FinancePaymentInRow) => void;
  matchedCount: number;
  totalAmount: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[920px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-100 text-left text-xs font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">Mode</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950/40">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                No payment entries found.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.id}
                className={idParam === r.id ? "bg-sky-50 dark:bg-sky-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"}
              >
                <td className="px-3 py-2">{formatDateField(r.txn_date)}</td>
                <td className="px-3 py-2">{clientLabel(r)}</td>
                <td className="px-3 py-2 uppercase">{(r.mode_of_payment ?? "bank").replace("_", " / ")}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2">{r.description ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {Number(r.amount).toLocaleString("en-IN", {
                    style: "currency",
                    currency: r.currency || "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onEditRow(r)}
                    className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
        <FinancePaymentInsFooterBar matchedCount={matchedCount} totalAmount={totalAmount} />
      </table>
    </div>
  );
}

