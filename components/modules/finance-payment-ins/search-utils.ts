import type { FinancePaymentInRow } from "@/lib/types/finance-payment-in";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function clientLabel(r: FinancePaymentInRow): string {
  const c = r.clients;
  if (!c) return "";
  const company = (c.company_name ?? "").trim();
  const name = (c.name ?? "").trim();
  return company || name;
}

export function filterPaymentInsBySearch(rows: FinancePaymentInRow[], q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) =>
    [
      r.txn_date,
      r.status,
      r.currency,
      String(r.amount),
      r.description,
      r.notes,
      clientLabel(r),
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

