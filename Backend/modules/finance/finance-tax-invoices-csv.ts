import { csvEscapeField, parseCsvLine } from "@backend/modules/clients/client-master-csv";
import type {
  FinanceTaxInvoiceLineRow,
  FinanceTaxInvoiceRow,
} from "@backend/shared/types/finance-tax-invoice";

export const TAX_INVOICE_CSV_HEADERS = [
  "tax_invoice_number",
  "tax_date",
  "valid_until_date",
  "client_id",
  "sales_order_id",
  "invoice_type",
  "tax_status",
  "notes",
  "terms_and_conditions",
  "scope_of_work",
  "bank_details",
  "seal_and_sign",
  "lines_json",
] as const;

export type ProformaInvoiceCsvHeader = (typeof TAX_INVOICE_CSV_HEADERS)[number];

function linesToJson(lines: FinanceTaxInvoiceLineRow[] | undefined): string {
  const sorted = [...(lines ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return JSON.stringify(
    sorted.map((L) => ({
      product_master_item_id: L.product_master_item_id,
      item_description: L.item_description ?? "",
      unit_of_item: L.unit_of_item ?? "",
      qty: L.qty,
      unit_rate: L.unit_rate,
      line_discount: L.line_discount ?? "0%",
      gst_rate: L.gst_rate ?? "",
    })),
  );
}

export function taxInvoiceRowToCsvRecord(
  r: FinanceTaxInvoiceRow,
): Record<string, string> {
  return {
    tax_invoice_number: r.tax_invoice_number ?? "",
    tax_date: r.tax_date ?? "",
    valid_until_date: r.valid_until_date ?? "",
    client_id: r.client_id ?? "",
    sales_order_id: r.sales_order_id ?? "",
    invoice_type: r.invoice_type ?? "service",
    tax_status: r.tax_status ?? "pending",
    notes: r.notes ?? "",
    terms_and_conditions: r.terms_and_conditions ?? "",
    scope_of_work: r.scope_of_work ?? "",
    bank_details: r.bank_details ?? "",
    seal_and_sign: r.seal_and_sign ?? "",
    lines_json: linesToJson(r.finance_tax_invoice_lines),
  };
}

export function buildFinanceTaxInvoicesExportCsv(
  rows: FinanceTaxInvoiceRow[],
): string {
  const headerLine = TAX_INVOICE_CSV_HEADERS.join(",");
  const dataLines = rows.map((r) => {
    const rec = taxInvoiceRowToCsvRecord(r);
    return TAX_INVOICE_CSV_HEADERS.map((h) =>
      csvEscapeField(rec[h] ?? ""),
    ).join(",");
  });
  return [headerLine, ...dataLines].join("\r\n");
}

export function parseFinanceTaxInvoicesImportCsv(text: string):
  | { ok: true; rows: Record<string, string>[] }
  | { ok: false; error: string } {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (rawLines.length < 2) {
    return {
      ok: false,
      error: "CSV must include a header row and at least one data row.",
    };
  }

  const headerCells = parseCsvLine(rawLines[0]).map((c) => c.trim());
  const headerSet = new Set<string>([...TAX_INVOICE_CSV_HEADERS]);
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < headerCells.length; i++) {
    const key = headerCells[i];
    if (headerSet.has(key)) indexByKey.set(key, i);
  }
  if (!indexByKey.has("tax_date") || !indexByKey.has("valid_until_date")) {
    return {
      ok: false,
      error:
        "CSV must include tax_date and valid_until_date columns (use Export as a template).",
    };
  }
  if (!indexByKey.has("lines_json")) {
    return {
      ok: false,
      error:
        "CSV must include a lines_json column (use Export as a template).",
    };
  }

  const rows: Record<string, string>[] = [];
  for (let li = 1; li < rawLines.length; li++) {
    const cells = parseCsvLine(rawLines[li]);
    const row: Record<string, string> = {};
    for (const h of TAX_INVOICE_CSV_HEADERS) {
      const idx = indexByKey.get(h);
      row[h] =
        idx !== undefined && idx < cells.length ? cells[idx].trim() : "";
    }
    const empty = TAX_INVOICE_CSV_HEADERS.every((h) => !row[h]);
    if (empty) continue;
    rows.push(row);
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows found after the header." };
  }
  return { ok: true, rows };
}
