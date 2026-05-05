import { csvEscapeField, parseCsvLine } from "@/lib/client-master-csv";
import type {
  FinanceQuotationLineRow,
  FinanceQuotationRow,
} from "@/lib/types/finance-quotation";

/** Column order for export and import (header row). `lines_json` matches save form payload. */
export const QUOTATION_CSV_HEADERS = [
  "quotation_number",
  "quotation_date",
  "expiry_date",
  "client_id",
  "quotation_type",
  "notes",
  "terms_and_conditions",
  "scope_of_work",
  "bank_details",
  "seal_and_sign",
  "lines_json",
] as const;

export type QuotationCsvHeader = (typeof QUOTATION_CSV_HEADERS)[number];

function linesToJson(lines: FinanceQuotationLineRow[] | undefined): string {
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

export function quotationRowToCsvRecord(r: FinanceQuotationRow): Record<string, string> {
  return {
    quotation_number: r.quotation_number ?? "",
    quotation_date: r.quotation_date ?? "",
    expiry_date: r.expiry_date ?? "",
    client_id: r.client_id ?? "",
    quotation_type: r.quotation_type ?? "service",
    notes: r.notes ?? "",
    terms_and_conditions: r.terms_and_conditions ?? "",
    scope_of_work: r.scope_of_work ?? "",
    bank_details: r.bank_details ?? "",
    seal_and_sign: r.seal_and_sign ?? "",
    lines_json: linesToJson(r.finance_quotation_lines),
  };
}

export function buildFinanceQuotationsExportCsv(rows: FinanceQuotationRow[]): string {
  const headerLine = QUOTATION_CSV_HEADERS.join(",");
  const dataLines = rows.map((r) => {
    const rec = quotationRowToCsvRecord(r);
    return QUOTATION_CSV_HEADERS.map((h) =>
      csvEscapeField(rec[h] ?? ""),
    ).join(",");
  });
  return [headerLine, ...dataLines].join("\r\n");
}

export function parseFinanceQuotationsImportCsv(text: string):
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
  const headerSet = new Set<string>([...QUOTATION_CSV_HEADERS]);
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < headerCells.length; i++) {
    const key = headerCells[i];
    if (headerSet.has(key)) indexByKey.set(key, i);
  }
  if (!indexByKey.has("quotation_date") || !indexByKey.has("expiry_date")) {
    return {
      ok: false,
      error:
        "CSV must include quotation_date and expiry_date columns (use Export as a template).",
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
    for (const h of QUOTATION_CSV_HEADERS) {
      const idx = indexByKey.get(h);
      row[h] =
        idx !== undefined && idx < cells.length ? cells[idx].trim() : "";
    }
    const empty = QUOTATION_CSV_HEADERS.every((h) => !row[h]);
    if (empty) continue;
    rows.push(row);
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows found after the header." };
  }
  return { ok: true, rows };
}
