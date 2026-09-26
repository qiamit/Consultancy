import ExcelJS from "exceljs";
import { DEFAULT_AMENDMENT_NUMBER } from "@backend/shared/constants/is-code-master";
import type { IsCodeMasterRow } from "@backend/shared/types/is-code-master";
import {
  isFilePathHeader,
  normalizeImportHeader,
  splitImportFilePaths,
} from "./import-file-match";

export const IS_CODE_CSV_HEADERS = [
  "is_number",
  "revision_year",
  "reaffirmation_year",
  "amendment_number",
  "aspect_of_is",
  "product_manual_number",
  "is_code_title",
  "testing_charges",
  "unit_of_is",
  "mmf_large_scale",
  "mmf_medium_scale",
  "mmf_small_scale",
  "mmf_micro_scale",
  "slab_1_quantity",
  "slab_1_rate",
  "slab_2_quantity",
  "slab_2_rate",
  "slab_3_quantity",
  "slab_3_rate",
] as const;

export const IS_CODE_FILE_CSV_HEADERS = ["file_names", "file_path"] as const;

export const IS_CODE_EXPORT_HEADERS = [
  ...IS_CODE_CSV_HEADERS,
  ...IS_CODE_FILE_CSV_HEADERS,
] as const;

export type IsCodeCsvHeader = (typeof IS_CODE_CSV_HEADERS)[number];

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

function numStr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return String(n);
}

export function isCodeRowToCsvRecord(c: IsCodeMasterRow): Record<string, string> {
  return {
    is_number: c.is_number ?? "",
    revision_year: numStr(c.revision_year),
    reaffirmation_year:
      c.reaffirmation_year != null ? String(c.reaffirmation_year) : "",
    amendment_number:
      (c.amendment_number ?? "").trim() || DEFAULT_AMENDMENT_NUMBER,
    aspect_of_is: c.aspect_of_is ?? "",
    product_manual_number: c.product_manual_number ?? "",
    is_code_title: c.is_code_title ?? "",
    testing_charges: numStr(c.testing_charges),
    unit_of_is: c.unit_of_is ?? "",
    mmf_large_scale: numStr(c.mmf_large_scale),
    mmf_medium_scale: numStr(c.mmf_medium_scale),
    mmf_small_scale: numStr(c.mmf_small_scale),
    mmf_micro_scale: numStr(c.mmf_micro_scale),
    slab_1_quantity: c.slab_1_quantity ?? "",
    slab_1_rate: numStr(c.slab_1_rate),
    slab_2_quantity: c.slab_2_quantity ?? "",
    slab_2_rate: numStr(c.slab_2_rate),
    slab_3_quantity: c.slab_3_quantity ?? "",
    slab_3_rate: numStr(c.slab_3_rate),
    file_names: (c.files ?? [])
      .map((f) => f.file_name || f.storage_path.split("/").pop() || "")
      .filter(Boolean)
      .join("; "),
    file_path: "",
  };
}

export function buildIsCodeExportCsv(rows: IsCodeMasterRow[]): string {
  const header = IS_CODE_EXPORT_HEADERS.join(",");
  const lines = rows.map((c) => {
    const rec = isCodeRowToCsvRecord(c);
    return IS_CODE_EXPORT_HEADERS.map((h) =>
      csvEscapeField(rec[h] ?? ""),
    ).join(",");
  });
  return [header, ...lines].join("\r\n");
}

export async function buildIsCodeExportXlsx(rows: IsCodeMasterRow[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("IS Code Master");
  sheet.addRow([...IS_CODE_EXPORT_HEADERS]);
  for (const row of rows) {
    const rec = isCodeRowToCsvRecord(row);
    sheet.addRow(IS_CODE_EXPORT_HEADERS.map((h) => rec[h] ?? ""));
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 18;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function parseIsCodeImportTable(headerCells: string[], dataRows: string[][]): {
  ok: true;
  rows: Record<string, string>[];
} | { ok: false; error: string } {
  const headers = headerCells.map((h) => h.trim());
  const idx: Record<string, number> = {};
  const pathIndexes: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    const raw = headers[i];
    const key = normalizeImportHeader(raw);
    idx[key] = i;
    idx[raw.toLowerCase()] = i;
    if (isFilePathHeader(raw) || isFilePathHeader(key)) pathIndexes.push(i);
  }
  if (idx.is_number === undefined) {
    return { ok: false, error: "Missing required column: is_number" };
  }
  const rows: Record<string, string>[] = [];
  for (const cells of dataRows) {
    const row: Record<string, string> = {};
    for (const h of IS_CODE_CSV_HEADERS) {
      const i = idx[h] ?? idx[h.toLowerCase()];
      row[h] = i !== undefined ? String(cells[i] ?? "").trim() : "";
    }
    const paths: string[] = [];
    for (const i of pathIndexes) {
      paths.push(...splitImportFilePaths(String(cells[i] ?? "")));
    }
    row.file_path = [...new Set(paths)].join("; ");
    if (!row.is_number) continue;
    rows.push(row);
  }
  if (rows.length === 0) {
    return { ok: false, error: "No IS number rows found in the spreadsheet." };
  }
  return { ok: true, rows };
}

export function parseIsCodeImportCsv(text: string): {
  ok: true;
  rows: Record<string, string>[];
} | { ok: false; error: string } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "CSV must include a header row and at least one data row." };
  }
  const headerCells = parseCsvLine(lines[0]);
  const dataRows = lines.slice(1).map((line) => parseCsvLine(line));
  return parseIsCodeImportTable(headerCells, dataRows);
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value && value.result != null) return cellText(value.result as ExcelJS.CellValue);
    if ("text" in value && value.text != null) return String(value.text);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
  }
  return String(value);
}

export async function parseIsCodeImportXlsx(buffer: ArrayBuffer): Promise<{
  ok: true;
  rows: Record<string, string>[];
} | { ok: false; error: string }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { ok: false, error: "Excel file has no sheet." };
  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cells[col - 1] = cellText(cell.value).trim();
    });
    table.push(cells);
  });
  if (table.length < 2) {
    return { ok: false, error: "Excel must include a header row and at least one data row." };
  }
  return parseIsCodeImportTable(table[0], table.slice(1));
}

export async function parseIsCodeImportSpreadsheet(file: File): Promise<{
  ok: true;
  rows: Record<string, string>[];
} | { ok: false; error: string }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
    return parseIsCodeImportXlsx(await file.arrayBuffer());
  }
  if (name.endsWith(".xls")) {
    return {
      ok: false,
      error: "Legacy .xls is not supported. Save the file as .xlsx or .csv and try again.",
    };
  }
  return parseIsCodeImportCsv(await file.text());
}
