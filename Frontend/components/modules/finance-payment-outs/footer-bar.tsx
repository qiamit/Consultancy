"use client";

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
            <span>Total Entries: {matchedCount}</span>
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
