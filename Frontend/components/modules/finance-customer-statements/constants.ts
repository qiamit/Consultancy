import { splitProformaInvoiceNumberForForm as splitProformaInvoiceNumberForFormLib } from "@backend/modules/finance/finance-customer-statement-number";
import type { FinanceCustomerStatementRow } from "@backend/shared/types/finance-customer-statement";

export const CUSTOMER_STATEMENT_LIST_PATH =
  "/dashboard/finance/sales/customer-statement";

export { splitProformaInvoiceNumberForFormLib as splitCustomerStatementNumberForForm };
export { joinProformaInvoiceNumberParts as joinCustomerStatementNumberParts } from "@backend/modules/finance/finance-customer-statement-number";

export type CustomerStatementLineForm = {
  product_master_item_id: string;
  item_description: string;
  unit_of_item: string;
  qty: string;
  unit_rate: string;
  line_discount: string;
  gst_rate: string;
};

export type CustomerStatementFormState = {
  id: string;
  quotation_id: string;
  sales_order_id: string;
  proforma_invoice_id: string;
  customer_statement_number_prefix: string;
  customer_statement_number_value: string;
  statement_date: string;
  valid_until_date: string;
  client_id: string;
  invoice_type: "service" | "supply";
  notes: string;
  terms_and_conditions: string;
  scope_of_work: string;
  bank_details: string;
  seal_and_sign: string;
  lines: CustomerStatementLineForm[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addOneMonthISO(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function emptyLine(): CustomerStatementLineForm {
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

export function emptyForm(defaultBankDetails?: string): CustomerStatementFormState {
  const qd = todayISO();
  return {
    id: "",
    quotation_id: "",
    sales_order_id: "",
    proforma_invoice_id: "",
    customer_statement_number_prefix: "",
    customer_statement_number_value: "",
    statement_date: qd,
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
  row: FinanceCustomerStatementRow,
  defaultBankDetails?: string,
): CustomerStatementFormState {
  const linesRaw = row.finance_customer_statement_lines ?? [];
  const sorted = [...linesRaw].sort((a, b) => a.sort_order - b.sort_order);
  const lines: CustomerStatementLineForm[] =
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
    row.customer_statement_number ?? "",
  );
  const bankDetails =
    (row.bank_details ?? "").trim() || (defaultBankDetails ?? "");
  return {
    id: row.id,
    quotation_id: row.quotation_id ?? "",
    sales_order_id: row.sales_order_id ?? "",
    proforma_invoice_id: row.proforma_invoice_id ?? "",
    customer_statement_number_prefix: qParts.customer_statement_number_prefix,
    customer_statement_number_value: qParts.customer_statement_number_value,
    statement_date: row.statement_date,
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
