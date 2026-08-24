import { splitQuotationNumberForForm as splitQuotationNumberForFormLib } from "@backend/modules/finance/finance-quotation-number";
import type { FinanceQuotationRow } from "@backend/shared/types/finance-quotation";

export const QUOTATION_LIST_PATH = "/dashboard/finance/sales/quotation-estimate";

export { splitQuotationNumberForFormLib as splitQuotationNumberForForm };
export { joinQuotationNumberParts } from "@backend/modules/finance/finance-quotation-number";

export type QuotationLineForm = {
  product_master_item_id: string;
  item_description: string;
  unit_of_item: string;
  qty: string;
  unit_rate: string;
  /** Percent of gross (qty × rate), e.g. 0% or 10%; applied before GST. */
  line_discount: string;
  gst_rate: string;
};

export type QuotationFormState = {
  id: string;
  quotation_number_prefix: string;
  quotation_number_value: string;
  quotation_date: string;
  expiry_date: string;
  client_id: string;
  quotation_type: "service" | "supply";
  notes: string;
  terms_and_conditions: string;
  scope_of_work: string;
  bank_details: string;
  seal_and_sign: string;
  lines: QuotationLineForm[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addOneMonthISO(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function emptyLine(): QuotationLineForm {
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

export function emptyForm(defaultBankDetails?: string): QuotationFormState {
  const qd = todayISO();
  return {
    id: "",
    quotation_number_prefix: "",
    quotation_number_value: "",
    quotation_date: qd,
    expiry_date: addOneMonthISO(qd),
    client_id: "",
    quotation_type: "service",
    notes: "",
    terms_and_conditions: "",
    scope_of_work: "",
    bank_details: defaultBankDetails ?? "",
    seal_and_sign: "",
    lines: [emptyLine()],
  };
}

export function rowToForm(
  row: FinanceQuotationRow,
  defaultBankDetails?: string,
): QuotationFormState {
  const linesRaw = row.finance_quotation_lines ?? [];
  const sorted = [...linesRaw].sort((a, b) => a.sort_order - b.sort_order);
  const lines: QuotationLineForm[] =
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

  const qParts = splitQuotationNumberForFormLib(row.quotation_number ?? "");
  const bankDetails =
    (row.bank_details ?? "").trim() || (defaultBankDetails ?? "");
  return {
    id: row.id,
    quotation_number_prefix: qParts.quotation_number_prefix,
    quotation_number_value: qParts.quotation_number_value,
    quotation_date: row.quotation_date,
    expiry_date: row.expiry_date,
    client_id: row.client_id ?? "",
    quotation_type: row.quotation_type,
    notes: row.notes ?? "",
    terms_and_conditions: row.terms_and_conditions ?? "",
    scope_of_work: row.scope_of_work ?? "",
    bank_details: bankDetails,
    seal_and_sign: row.seal_and_sign ?? "",
    lines,
  };
}
