import ExcelJS from "exceljs";
import {
  createRawMaterialRow,
  defaultRawMaterialEntry,
  rowHasContent,
  type RawMaterialStored,
} from "@backend/modules/bis/raw-material-details";
import { loadWorkbookFromArrayBuffer } from "@backend/shared/spreadsheet/excel";

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
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type MaterialField = keyof RawMaterialStored;

const HEADER_ALIASES: Record<string, MaterialField> = {
  "raw material": "raw_material",
  material: "raw_material",
  "name of supplier": "supplier_name",
  supplier: "supplier_name",
  "supplier name": "supplier_name",
  "with or without bis certification mark": "bis_certification_mark",
  "bis certification mark": "bis_certification_mark",
  "with/without bis mark": "bis_certification_mark",
  "test certificate of the supplier": "test_certificate",
  "test certificate": "test_certificate",
  "how received batches / lots nature of packaging": "batches_packaging",
  "batches / lots nature of packaging": "batches_packaging",
  packaging: "batches_packaging",
  "nature of packaging": "batches_packaging",
};

function sheetToMatrix(sheet: ExcelJS.Worksheet): string[][] {
  const matrix: string[][] = [];
  let maxCol = 0;

  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      maxCol = Math.max(maxCol, colNumber);
      cells[colNumber - 1] = cellPlainValue(cell.value);
    });
    while (cells.length < maxCol) cells.push("");
    matrix.push(cells);
  });

  return matrix;
}

function resolveField(header: string): MaterialField | null {
  const key = normalizeHeader(header);
  if (!key || key === "sr no." || key === "sr no" || key === "sr") return null;
  return HEADER_ALIASES[key] ?? null;
}

function findHeaderRowIndex(matrix: string[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const row = matrix[i] ?? [];
    const mapped = row.map((cell) => resolveField(cell)).filter(Boolean);
    if (mapped.includes("raw_material")) return i;
  }
  return -1;
}

function buildColumnMap(headerRow: string[]): Map<number, MaterialField> {
  const map = new Map<number, MaterialField>();
  headerRow.forEach((cell, index) => {
    const field = resolveField(cell);
    if (field) map.set(index, field);
  });
  return map;
}

function parseDataRows(matrix: string[][], headerRowIndex: number): RawMaterialStored[] {
  const columnMap = buildColumnMap(matrix[headerRowIndex] ?? []);
  if (!columnMap.size) return [];

  const rows: RawMaterialStored[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const entry: RawMaterialStored = { ...defaultRawMaterialEntry() };

    columnMap.forEach((field, colIndex) => {
      entry[field] = String(line[colIndex] ?? "").trim();
    });

    if (rowHasContent(entry)) {
      rows.push(entry);
    }
  }

  return rows;
}

export function parseRawMaterialMatrix(
  matrix: string[][],
): { ok: true; rows: RawMaterialStored[] } | { ok: false; error: string } {
  if (matrix.length === 0) {
    return { ok: false, error: "The Excel file is empty." };
  }

  const headerRowIndex = findHeaderRowIndex(matrix);
  if (headerRowIndex < 0) {
    return {
      ok: false,
      error:
        'Could not find a header row with "Raw Material". Use the import template or matching column headers.',
    };
  }

  const rows = parseDataRows(matrix, headerRowIndex);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No raw material rows found below the header row.",
    };
  }

  return { ok: true, rows };
}

export async function importRawMaterialDetailsFromXlsx(
  file: File,
): Promise<
  { ok: true; rows: RawMaterialStored[]; importedCount: number } | { ok: false; error: string }
> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx")) {
    return {
      ok: false,
      error: "Please upload an .xlsx file. Legacy .xls format is not supported.",
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = await loadWorkbookFromArrayBuffer(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return { ok: false, error: "The Excel file has no worksheets." };
    }

    const parsed = parseRawMaterialMatrix(sheetToMatrix(sheet));
    if (!parsed.ok) return parsed;

    return { ok: true, rows: parsed.rows, importedCount: parsed.rows.length };
  } catch {
    return { ok: false, error: "Unable to read the Excel file. Check the format and try again." };
  }
}

export function editorRowsFromImported(stored: RawMaterialStored[]) {
  const filled = stored.filter(rowHasContent);
  if (filled.length === 0) {
    return [createRawMaterialRow()];
  }
  return filled.map((row) => ({
    ...createRawMaterialRow(),
    ...row,
  }));
}
