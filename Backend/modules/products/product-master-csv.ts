import { DEFAULT_CATEGORY, DEFAULT_GST_RATE, DEFAULT_UNIT } from "@backend/shared/constants/product-master";
import type { ProductMasterRow } from "@backend/shared/types/product-master";

export const PRODUCT_CSV_HEADERS = [
  "category",
  "item_code",
  "name",
  "description",
  "make",
  "unit_of_item",
  "hsn_code",
  "gst_rate",
  "mrp",
  "sale_price",
  "purchase_price",
  "opening_stock",
  "low_stock_value",
] as const;

export type ProductCsvHeader = (typeof PRODUCT_CSV_HEADERS)[number];

export function csvEscapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function moneyStr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return (Math.round(Number(n) * 100) / 100).toFixed(2);
}

export function productRowToCsvRecord(r: ProductMasterRow): Record<string, string> {
  return {
    category: r.category ?? DEFAULT_CATEGORY,
    item_code: r.item_code ?? "",
    name: r.name ?? "",
    description: r.description ?? "",
    make: r.make ?? "",
    unit_of_item: r.unit_of_item ?? "",
    hsn_code: r.hsn_code ?? "",
    gst_rate: r.gst_rate ?? "",
    mrp: moneyStr(r.mrp),
    sale_price: moneyStr(r.sale_price),
    purchase_price: moneyStr(r.purchase_price),
    opening_stock: r.opening_stock ?? "",
    low_stock_value: r.low_stock_value ?? "",
  };
}

export function buildProductExportCsv(rows: ProductMasterRow[]): string {
  const header = PRODUCT_CSV_HEADERS.join(",");
  const lines = rows.map((r) => {
    const rec = productRowToCsvRecord(r);
    return PRODUCT_CSV_HEADERS.map((h) => csvEscapeField(rec[h] ?? "")).join(
      ",",
    );
  });
  return [header, ...lines].join("\r\n");
}

export function parseProductImportCsv(text: string):
  | { ok: true; rows: Record<string, string>[] }
  | { ok: false; error: string } {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return { ok: false, error: "The CSV file is empty." };
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { ok: false, error: "Need a header row and at least one data row." };
  const headerCells = parseCsvLine(lines[0]).map((c) => c.trim().toLowerCase());
  const idx = (name: string) => headerCells.indexOf(name.toLowerCase());
  const missing = PRODUCT_CSV_HEADERS.filter((h) => idx(h) < 0);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing column(s): ${missing.join(", ")}. Expected: ${PRODUCT_CSV_HEADERS.join(", ")}.`,
    };
  }
  const colIndex = Object.fromEntries(
    PRODUCT_CSV_HEADERS.map((h) => [h, idx(h)]),
  ) as Record<ProductCsvHeader, number>;

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (const h of PRODUCT_CSV_HEADERS) {
      row[h] = (cells[colIndex[h]] ?? "").trim();
    }
    rows.push(row);
  }
  return { ok: true, rows };
}
