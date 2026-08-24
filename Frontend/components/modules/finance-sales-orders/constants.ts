import { splitSalesOrderNumberForForm as splitSalesOrderNumberForFormLib } from "@backend/modules/finance/finance-sales-order-number";
import type { FinanceSalesOrderRow } from "@backend/shared/types/finance-sales-order";

export const SALES_ORDER_LIST_PATH = "/dashboard/finance/sales/sales-order";

export { splitSalesOrderNumberForFormLib as splitSalesOrderNumberForForm };
export { joinSalesOrderNumberParts } from "@backend/modules/finance/finance-sales-order-number";

export type SalesOrderLineForm = {
  product_master_item_id: string;
  item_description: string;
  unit_of_item: string;
  qty: string;
  unit_rate: string;
  line_discount: string;
  gst_rate: string;
};

export type SalesOrderFormState = {
  id: string;
  quotation_id: string;
  sales_order_number_prefix: string;
  sales_order_number_value: string;
  order_date: string;
  expected_delivery_date: string;
  client_id: string;
  order_type: "service" | "supply";
  notes: string;
  terms_and_conditions: string;
  scope_of_work: string;
  bank_details: string;
  seal_and_sign: string;
  lines: SalesOrderLineForm[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addOneMonthISO(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function emptyLine(): SalesOrderLineForm {
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

export function emptyForm(defaultBankDetails?: string): SalesOrderFormState {
  const qd = todayISO();
  return {
    id: "",
    quotation_id: "",
    sales_order_number_prefix: "",
    sales_order_number_value: "",
    order_date: qd,
    expected_delivery_date: addOneMonthISO(qd),
    client_id: "",
    order_type: "service",
    notes: "",
    terms_and_conditions: "",
    scope_of_work: "",
    bank_details: defaultBankDetails ?? "",
    seal_and_sign: "",
    lines: [emptyLine()],
  };
}

export function rowToForm(
  row: FinanceSalesOrderRow,
  defaultBankDetails?: string,
): SalesOrderFormState {
  const linesRaw = row.finance_sales_order_lines ?? [];
  const sorted = [...linesRaw].sort((a, b) => a.sort_order - b.sort_order);
  const lines: SalesOrderLineForm[] =
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

  const qParts = splitSalesOrderNumberForFormLib(row.sales_order_number ?? "");
  const bankDetails =
    (row.bank_details ?? "").trim() || (defaultBankDetails ?? "");
  return {
    id: row.id,
    quotation_id: row.quotation_id ?? "",
    sales_order_number_prefix: qParts.sales_order_number_prefix,
    sales_order_number_value: qParts.sales_order_number_value,
    order_date: row.order_date,
    expected_delivery_date: row.expected_delivery_date,
    client_id: row.client_id ?? "",
    order_type: row.order_type,
    notes: row.notes ?? "",
    terms_and_conditions: row.terms_and_conditions ?? "",
    scope_of_work: row.scope_of_work ?? "",
    bank_details: bankDetails,
    seal_and_sign: row.seal_and_sign ?? "",
    lines,
  };
}
