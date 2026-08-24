import { splitProformaInvoiceNumberForForm as splitProformaInvoiceNumberForFormLib } from "@backend/modules/finance/finance-tax-invoice-number";
import type { FinanceTaxInvoiceRow } from "@backend/shared/types/finance-tax-invoice";

export const TAX_INVOICE_LIST_PATH =
  "/dashboard/finance/sales/tax-invoice";

export { splitProformaInvoiceNumberForFormLib as splitTaxInvoiceNumberForForm };
export { joinProformaInvoiceNumberParts as joinTaxInvoiceNumberParts } from "@backend/modules/finance/finance-tax-invoice-number";

export type TaxInvoiceLineForm = {
  product_master_item_id: string;
  item_description: string;
  unit_of_item: string;
  qty: string;
  unit_rate: string;
  line_discount: string;
  gst_rate: string;
};

export type TaxInvoiceFormState = {
  id: string;
  quotation_id: string;
  sales_order_id: string;
  proforma_invoice_id: string;
  tax_invoice_number_prefix: string;
  tax_invoice_number_value: string;
  tax_date: string;
  valid_until_date: string;
  client_id: string;
  invoice_type: "service" | "supply";
  notes: string;
  terms_and_conditions: string;
  scope_of_work: string;
  bank_details: string;
  seal_and_sign: string;
  lines: TaxInvoiceLineForm[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addOneMonthISO(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function emptyLine(): TaxInvoiceLineForm {
  return {
    product_master_item_id: "",
    item_description: "",
    unit_of_item: "",
    qty: "1",
    unit_rate: "0",
    line_discount: "0%",
    gst_rate: "18%",
  };
}

export function emptyForm(defaultBankDetails?: string): TaxInvoiceFormState {
  const qd = todayISO();
  return {
    id: "",
    quotation_id: "",
    sales_order_id: "",
    proforma_invoice_id: "",
    tax_invoice_number_prefix: "",
    tax_invoice_number_value: "",
    tax_date: qd,
    valid_until_date: addOneMonthISO(qd),
    client_id: "",
    invoice_type: "service",
    notes: "",
    terms_and_conditions: "",
    scope_of_work: "",
    bank_details: defaultBankDetails ?? "",
    seal_and_sign: "",
    lines: [emptyLine()],
  };
}

export function rowToForm(
  row: FinanceTaxInvoiceRow,
  defaultBankDetails?: string,
): TaxInvoiceFormState {
  const linesRaw = row.finance_tax_invoice_lines ?? [];
  const sorted = [...linesRaw].sort((a, b) => a.sort_order - b.sort_order);
  const lines: TaxInvoiceLineForm[] =
    sorted.length > 0
      ? sorted.map((L) => ({
          product_master_item_id: L.product_master_item_id ?? "",
          item_description: L.item_description ?? "",
          unit_of_item: L.unit_of_item ?? "",
          qty: String(L.qty),
          unit_rate: String(L.unit_rate),
          line_discount: (L.line_discount ?? "").trim() || "0%",
          gst_rate: L.gst_rate ?? "0%",
        }))
      : [emptyLine()];

  const qParts = splitProformaInvoiceNumberForFormLib(
    row.tax_invoice_number ?? "",
  );
  const bankDetails =
    (row.bank_details ?? "").trim() || (defaultBankDetails ?? "");
  return {
    id: row.id,
    quotation_id: row.quotation_id ?? "",
    sales_order_id: row.sales_order_id ?? "",
    proforma_invoice_id: row.proforma_invoice_id ?? "",
    tax_invoice_number_prefix: qParts.tax_invoice_number_prefix,
    tax_invoice_number_value: qParts.tax_invoice_number_value,
    tax_date: row.tax_date,
    valid_until_date: row.valid_until_date,
    client_id: row.client_id ?? "",
    invoice_type: row.invoice_type,
    notes: row.notes ?? "",
    terms_and_conditions: row.terms_and_conditions ?? "",
    scope_of_work: row.scope_of_work ?? "",
    bank_details: bankDetails,
    seal_and_sign: row.seal_and_sign ?? "",
    lines,
  };
}
