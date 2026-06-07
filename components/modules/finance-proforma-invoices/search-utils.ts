import type { FinanceProformaInvoiceRow } from "@/lib/types/finance-proforma-invoice";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function clientLabel(r: FinanceProformaInvoiceRow): string {
  const c = r.clients;
  if (!c) return "";
  const company = (c.company_name ?? "").trim();
  const name = (c.name ?? "").trim();
  return company ? `${name} ${company}`.trim() : name;
}

function lineHaystack(r: FinanceProformaInvoiceRow): string {
  const lines = r.finance_proforma_invoice_lines ?? [];
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

export function filterProformaInvoicesBySearch(
  rows: FinanceProformaInvoiceRow[],
  q: string,
): FinanceProformaInvoiceRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => {
    const blob = [
      r.proforma_invoice_number,
      r.proforma_date,
      r.valid_until_date,
      r.invoice_type,
      r.sales_order_id,
      r.finance_sales_orders?.sales_order_number,
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
