import type { FinanceQuotationRow } from "@/lib/types/finance-quotation";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function clientLabel(r: FinanceQuotationRow): string {
  const c = r.clients;
  if (!c) return "";
  const company = (c.company_name ?? "").trim();
  const name = (c.name ?? "").trim();
  return company ? `${name} ${company}`.trim() : name;
}

function lineHaystack(r: FinanceQuotationRow): string {
  const lines = r.finance_quotation_lines ?? [];
  return lines
    .map((L) =>
      [
        L.item_description,
        L.unit_of_item,
        L.gst_rate,
        L.product_master_item_id,
      ].join(" "),
    )
    .join(" ");
}

export function filterQuotationsBySearch(
  rows: FinanceQuotationRow[],
  q: string,
): FinanceQuotationRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => {
    const blob = [
      r.quotation_number,
      r.quotation_date,
      r.expiry_date,
      r.quotation_type,
      clientLabel(r),
      String(r.grand_total),
      String(r.subtotal),
      String(r.tax_total),
      r.notes,
      r.terms_and_conditions,
      r.scope_of_work,
      r.bank_details,
      r.seal_and_sign,
      lineHaystack(r),
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(needle);
  });
}
