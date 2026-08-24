import ExcelJS from "exceljs";
import {
  createCmpf305MachineryRow,
  defaultCmpf305MachineryEntry,
  rowHasContent,
  type Cmpf305MachineryStored,
} from "@backend/modules/bis/cmpf-305";
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

type MachineryField = keyof Cmpf305MachineryStored;

const HEADER_ALIASES: Record<string, MachineryField> = {
  "machinery name": "machinery_name",
  machinery: "machinery_name",
  "name of machinery": "machinery_name",
  equipment: "machinery_name",
  "plant machinery": "machinery_name",
  make: "make",
  manufacturer: "make",
  brand: "make",
  "production capacity / day": "production_capacity_per_day",
  "production capacity/day": "production_capacity_per_day",
  "production capacity per day": "production_capacity_per_day",
  "production capacity": "production_capacity_per_day",
  capacity: "production_capacity_per_day",
  "capacity / day": "production_capacity_per_day",
  "capacity per day": "production_capacity_per_day",
  number: "number",
  "no.": "number",
  no: "number",
  qty: "number",
  quantity: "number",
  nos: "number",
  remarks: "remarks",
  remark: "remarks",
  notes: "remarks",
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

function resolveField(header: string): MachineryField | null {
  const key = normalizeHeader(header);
  if (!key || key === "sr no." || key === "sr no" || key === "sr") return null;
  return HEADER_ALIASES[key] ?? null;
}

function findHeaderRowIndex(matrix: string[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const row = matrix[i] ?? [];
    const mapped = row.map((cell) => resolveField(cell)).filter(Boolean);
    if (mapped.includes("machinery_name")) return i;
  }
  return -1;
}

function buildColumnMap(headerRow: string[]): Map<number, MachineryField> {
  const map = new Map<number, MachineryField>();
  headerRow.forEach((cell, index) => {
    const field = resolveField(cell);
    if (field) map.set(index, field);
  });
  return map;
}

function parseDataRows(
  matrix: string[][],
  headerRowIndex: number,
): Cmpf305MachineryStored[] {
  const columnMap = buildColumnMap(matrix[headerRowIndex] ?? []);
  if (!columnMap.size) return [];

  const rows: Cmpf305MachineryStored[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const entry: Cmpf305MachineryStored = { ...defaultCmpf305MachineryEntry() };

    columnMap.forEach((field, colIndex) => {
      entry[field] = String(line[colIndex] ?? "").trim();
    });

    if (rowHasContent(entry)) {
      rows.push(entry);
    }
  }

  return rows;
}

export function parseCmpf305MachineryMatrix(
  matrix: string[][],
): { ok: true; rows: Cmpf305MachineryStored[] } | { ok: false; error: string } {
  if (matrix.length === 0) {
    return { ok: false, error: "The Excel file is empty." };
  }

  const headerRowIndex = findHeaderRowIndex(matrix);
  if (headerRowIndex < 0) {
    return {
      ok: false,
      error:
        'Could not find a header row with "Machinery Name". Use the import template or export columns: Machinery Name, Make, Production Capacity / Day, Number, Remarks.',
    };
  }

  const rows = parseDataRows(matrix, headerRowIndex);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No machinery rows found below the header row.",
    };
  }

  return { ok: true, rows };
}

export async function importCmpf305MachineryFromXlsx(
  file: File,
): Promise<
  { ok: true; rows: Cmpf305MachineryStored[]; importedCount: number } | { ok: false; error: string }
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

    const parsed = parseCmpf305MachineryMatrix(sheetToMatrix(sheet));
    if (!parsed.ok) return parsed;

    return { ok: true, rows: parsed.rows, importedCount: parsed.rows.length };
  } catch {
    return { ok: false, error: "Unable to read the Excel file. Check the format and try again." };
  }
}

export function editorRowsFromImported(stored: Cmpf305MachineryStored[]) {
  const filled = stored.filter(rowHasContent);
  if (filled.length === 0) {
    return [createCmpf305MachineryRow()];
  }
  return filled.map((row) => ({
    ...createCmpf305MachineryRow(),
    ...row,
  }));
}
