"use client";

const btn =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

export function FinancePaymentOutsFooterBar({
  matchedCount,
  totalAmount,
}: {
  matchedCount: number;
  totalAmount: number;
}) {
  return (
    <tfoot className="border-t border-zinc-200 bg-zinc-100 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200">
      <tr>
        <td colSpan={4} className="px-3 py-2 align-middle">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2">Total Entries: {matchedCount}</span>
            <button
              type="button"
              className={`${btn} border-violet-400 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40`}
              title="Open QE Assistant — AI-powered finance helper"
              onClick={() => window.dispatchEvent(new CustomEvent("qe-assistant:open", { detail: { module: "finance-payment-out" } }))}
            >
              ✦ QE Assistant
            </button>
          </div>
        </td>
        <td className="px-3 py-2 text-right">Total Amount</td>
        <td className="px-3 py-2 text-right tabular-nums">
          {totalAmount.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </td>
      </tr>
    </tfoot>
  );
}
