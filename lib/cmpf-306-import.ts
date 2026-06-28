import ExcelJS from "exceljs";
import {
  CMPF306_SEPARATE_SHEET_LABEL,
  createCmpf306EquipmentRow,
  defaultCmpf306EquipmentEntry,
  equipmentRowHasContent,
  type Cmpf306EquipmentStored,
} from "@/lib/cmpf-306";
import { loadWorkbookFromArrayBuffer } from "@/lib/spreadsheet/excel";

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

type EquipmentField = keyof Cmpf306EquipmentStored;

const HEADER_ALIASES: Record<string, EquipmentField> = {
  "test equipments / chemicals name": "equipment_name",
  "test equipments / chemicals": "equipment_name",
  "test equipment / chemicals name": "equipment_name",
  "test equipment / chemicals": "equipment_name",
  "test equipments name": "equipment_name",
  "test equipment name": "equipment_name",
  "equipment name": "equipment_name",
  equipment: "equipment_name",
  "test equipments": "equipment_name",
  "test equipment": "equipment_name",
  chemicals: "equipment_name",
  "chemical name": "equipment_name",
  make: "make",
  manufacturer: "make",
  brand: "make",
  qty: "quantity",
  quantity: "quantity",
  "least count": "least_count",
  leastcount: "least_count",
  resolution: "least_count",
  range: "range",
  "calibration details": "calibration_details",
  "calibration status": "calibration_details",
  "calibration required": "calibration_details",
  calibration: "calibration_details",
  "calibration date": "calibration_details",
  "clause number": "clause_number",
  "clause no.": "clause_number",
  "clause no": "clause_number",
  clause: "clause_number",
  "test method": "test_method",
  method: "test_method",
  "test parameter": "remarks",
  "test name": "remarks",
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

function resolveField(header: string): EquipmentField | null {
  const key = normalizeHeader(header);
  if (!key || key === "sr no." || key === "sr no" || key === "sr") return null;
  return HEADER_ALIASES[key] ?? null;
}

function findHeaderRowIndex(matrix: string[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const row = matrix[i] ?? [];
    const mapped = row.map((cell) => resolveField(cell)).filter(Boolean);
    if (mapped.includes("equipment_name")) return i;
  }
  return -1;
}

function buildColumnMap(headerRow: string[]): Map<number, EquipmentField> {
  const map = new Map<number, EquipmentField>();
  headerRow.forEach((cell, index) => {
    const field = resolveField(cell);
    if (field) map.set(index, field);
  });
  return map;
}

function isSeparateSheetRow(line: string[]): boolean {
  return line.some((cell) =>
    normalizeHeader(cell).includes(normalizeHeader(CMPF306_SEPARATE_SHEET_LABEL)),
  );
}

function parseDataRows(
  matrix: string[][],
  headerRowIndex: number,
): Cmpf306EquipmentStored[] {
  const columnMap = buildColumnMap(matrix[headerRowIndex] ?? []);
  if (!columnMap.size) return [];

  const rows: Cmpf306EquipmentStored[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    if (isSeparateSheetRow(line)) continue;

    const entry: Cmpf306EquipmentStored = { ...defaultCmpf306EquipmentEntry() };

    columnMap.forEach((field, colIndex) => {
      entry[field] = String(line[colIndex] ?? "").trim();
    });

    if (equipmentRowHasContent(entry)) {
      rows.push(entry);
    }
  }

  return rows;
}

export function parseCmpf306EquipmentMatrix(
  matrix: string[][],
): { ok: true; rows: Cmpf306EquipmentStored[] } | { ok: false; error: string } {
  if (matrix.length === 0) {
    return { ok: false, error: "The Excel file is empty." };
  }

  const headerRowIndex = findHeaderRowIndex(matrix);
  if (headerRowIndex < 0) {
    return {
      ok: false,
      error:
        'Could not find a header row with "Test Equipment Name". Use the import template.',
    };
  }

  const rows = parseDataRows(matrix, headerRowIndex);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No test equipment rows found below the header row.",
    };
  }

  return { ok: true, rows };
}

export async function importCmpf306EquipmentFromXlsx(
  file: File,
): Promise<
  { ok: true; rows: Cmpf306EquipmentStored[]; importedCount: number } | { ok: false; error: string }
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

    const parsed = parseCmpf306EquipmentMatrix(sheetToMatrix(sheet));
    if (!parsed.ok) return parsed;

    return { ok: true, rows: parsed.rows, importedCount: parsed.rows.length };
  } catch {
    return { ok: false, error: "Unable to read the Excel file. Check the format and try again." };
  }
}

export function editorRowsFromImported(stored: Cmpf306EquipmentStored[]) {
  const filled = stored.filter(equipmentRowHasContent);
  return filled.map((row) => ({
    ...createCmpf306EquipmentRow(),
    ...row,
  }));
}
