import ExcelJS from "exceljs";
import { loadWorkbookFromArrayBuffer } from "@backend/shared/spreadsheet/excel";
import { normalizeCmlDigits } from "@backend/modules/bis/manak-online-portal";

function cellPlainValue(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value && value.result != null) {
      return cellPlainValue(value.result as ExcelJS.CellValue);
    }
    if ("text" in value && value.text != null) return String(value.text).trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("").trim();
    }
  }
  return String(value).trim();
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CML_HEADER_ALIASES = new Set([
  "cml no",
  "cml number",
  "cml",
  "cm l no",
  "cm l number",
  "cm l",
  "licence no",
  "license no",
  "licence number",
  "license number",
]);

function sheetToMatrix(sheet: ExcelJS.Worksheet): string[][] {
  const matrix: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (cells.length < colNumber - 1) cells.push("");
      cells[colNumber - 1] = cellPlainValue(cell.value);
    });
    matrix.push(cells);
  });
  return matrix;
}

function findCmlColumnIndex(headerRow: string[]): number {
  for (let i = 0; i < headerRow.length; i += 1) {
    const key = normalizeHeader(headerRow[i] ?? "");
    if (CML_HEADER_ALIASES.has(key)) return i;
  }
  return -1;
}

/**
 * Extract unique CML numbers from a Manak “Under Stop Marking / Suspension” Excel export.
 * Expected header includes “CML No” (ReportExcel.xlsx).
 */
export async function extractCmlNumbersFromManakExcel(
  buffer: ArrayBuffer,
): Promise<string[]> {
  const workbook = await loadWorkbookFromArrayBuffer(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const matrix = sheetToMatrix(sheet);
  if (matrix.length === 0) return [];

  let headerRowIndex = 0;
  let cmlCol = findCmlColumnIndex(matrix[0] ?? []);
  if (cmlCol < 0) {
    for (let r = 0; r < Math.min(10, matrix.length); r += 1) {
      const idx = findCmlColumnIndex(matrix[r] ?? []);
      if (idx >= 0) {
        headerRowIndex = r;
        cmlCol = idx;
        break;
      }
    }
  }
  if (cmlCol < 0) {
    throw new Error(
      'Could not find a “CML No” column in the Excel file. Export “ReportExcel.xlsx” from Manak again.',
    );
  }

  const found = new Set<string>();
  for (let r = headerRowIndex + 1; r < matrix.length; r += 1) {
    const raw = matrix[r]?.[cmlCol] ?? "";
    const n = normalizeCmlDigits(raw);
    if (n.length >= 5 && n.length <= 12) found.add(n);
  }
  return [...found];
}
