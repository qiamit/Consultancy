import { splitProformaInvoiceNumberForForm as splitProformaInvoiceNumberForFormLib } from "@/lib/finance-proforma-invoice-number";
import type { FinanceProformaInvoiceRow } from "@/lib/types/finance-proforma-invoice";

export const PROFORMA_INVOICE_LIST_PATH =
  "/dashboard/finance/sales/proforma-invoice";

export { splitProformaInvoiceNumberForFormLib as splitProformaInvoiceNumberForForm };
export { joinProformaInvoiceNumberParts } from "@/lib/finance-proforma-invoice-number";

export type ProformaInvoiceLineForm = {
  product_master_item_id: string;
  item_description: string;
  unit_of_item: string;
  qty: string;
  unit_rate: string;
  line_discount: string;
  gst_rate: string;
};

export type ProformaInvoiceFormState = {
  id: string;
  sales_order_id: string;
  proforma_invoice_number_prefix: string;
  proforma_invoice_number_value: string;
  proforma_date: string;
  valid_until_date: string;
  client_id: string;
  invoice_type: "service" | "supply";
  notes: string;
  terms_and_conditions: string;
  scope_of_work: string;
  bank_details: string;
  seal_and_sign: string;
  lines: ProformaInvoiceLineForm[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addOneMonthISO(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function emptyLine(): ProformaInvoiceLineForm {
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

export function emptyForm(defaultBankDetails?: string): ProformaInvoiceFormState {
  const qd = todayISO();
  return {
    id: "",
    sales_order_id: "",
    proforma_invoice_number_prefix: "",
    proforma_invoice_number_value: "",
    proforma_date: qd,
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
  row: FinanceProformaInvoiceRow,
  defaultBankDetails?: string,
): ProformaInvoiceFormState {
  const linesRaw = row.finance_proforma_invoice_lines ?? [];
  const sorted = [...linesRaw].sort((a, b) => a.sort_order - b.sort_order);
  const lines: ProformaInvoiceLineForm[] =
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
    row.proforma_invoice_number ?? "",
  );
  const bankDetails =
    (row.bank_details ?? "").trim() || (defaultBankDetails ?? "");
  return {
    id: row.id,
    sales_order_id: row.sales_order_id ?? "",
    proforma_invoice_number_prefix: qParts.proforma_invoice_number_prefix,
    proforma_invoice_number_value: qParts.proforma_invoice_number_value,
    proforma_date: row.proforma_date,
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
