import type { FinanceCustomerStatementRow } from "@backend/shared/types/finance-customer-statement";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function clientLabel(r: FinanceCustomerStatementRow): string {
  const c = r.clients;
  if (!c) return "";
  const company = (c.company_name ?? "").trim();
  const name = (c.name ?? "").trim();
  return company ? `${name} ${company}`.trim() : name;
}

function lineHaystack(r: FinanceCustomerStatementRow): string {
  const lines = r.finance_customer_statement_lines ?? [];
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

export function filterTaxInvoicesBySearch(
  rows: FinanceCustomerStatementRow[],
  q: string,
): FinanceCustomerStatementRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => {
    const blob = [
      r.customer_statement_number,
      r.statement_date,
      r.valid_until_date,
      r.invoice_type,
      r.quotation_id,
      r.sales_order_id,
      r.proforma_invoice_id,
      r.finance_quotations?.quotation_number,
      r.finance_sales_orders?.sales_order_number,
      r.finance_proforma_invoices?.proforma_invoice_number,
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
