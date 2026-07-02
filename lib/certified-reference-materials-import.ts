import ExcelJS from "exceljs";
import {
  createCertifiedReferenceMaterialRow,
  defaultCertifiedReferenceMaterialEntry,
  rowHasContent,
  type CertifiedReferenceMaterialStored,
} from "@/lib/certified-reference-materials";
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

type CrmField = keyof CertifiedReferenceMaterialStored;

const HEADER_ALIASES: Record<string, CrmField> = {
  "certified reference material": "crm_name",
  "name of certified reference material": "crm_name",
  crm: "crm_name",
  "crm name": "crm_name",
  "name of supplier": "supplier_name",
  supplier: "supplier_name",
  "supplier name": "supplier_name",
  "name of supplier / manufacturer": "supplier_name",
  manufacturer: "supplier_name",
  "from accredited reference material producer": "accredited_rmp",
  "accredited rmp": "accredited_rmp",
  "accredited reference material producer": "accredited_rmp",
  "crm certificate / lot no.": "certificate_lot_no",
  "crm certificate / lot no": "certificate_lot_no",
  "certificate / lot no.": "certificate_lot_no",
  "certificate lot no": "certificate_lot_no",
  "lot no": "certificate_lot_no",
  "validity / expiry period": "validity_period",
  "validity period": "validity_period",
  "expiry period": "validity_period",
  validity: "validity_period",
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

function resolveField(header: string): CrmField | null {
  const key = normalizeHeader(header);
  if (!key || key === "sr no." || key === "sr no" || key === "sr") return null;
  return HEADER_ALIASES[key] ?? null;
}

function findHeaderRowIndex(matrix: string[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const row = matrix[i] ?? [];
    const mapped = row.map((cell) => resolveField(cell)).filter(Boolean);
    if (mapped.includes("crm_name")) return i;
  }
  return -1;
}

function buildColumnMap(headerRow: string[]): Map<number, CrmField> {
  const map = new Map<number, CrmField>();
  headerRow.forEach((cell, index) => {
    const field = resolveField(cell);
    if (field) map.set(index, field);
  });
  return map;
}

function parseDataRows(matrix: string[][], headerRowIndex: number): CertifiedReferenceMaterialStored[] {
  const columnMap = buildColumnMap(matrix[headerRowIndex] ?? []);
  if (!columnMap.size) return [];

  const rows: CertifiedReferenceMaterialStored[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const entry: CertifiedReferenceMaterialStored = { ...defaultCertifiedReferenceMaterialEntry() };

    columnMap.forEach((field, colIndex) => {
      entry[field] = String(line[colIndex] ?? "").trim();
    });

    if (rowHasContent(entry)) {
      rows.push(entry);
    }
  }

  return rows;
}

export function parseCertifiedReferenceMaterialMatrix(
  matrix: string[][],
): { ok: true; rows: CertifiedReferenceMaterialStored[] } | { ok: false; error: string } {
  if (matrix.length === 0) {
    return { ok: false, error: "The Excel file is empty." };
  }

  const headerRowIndex = findHeaderRowIndex(matrix);
  if (headerRowIndex < 0) {
    return {
      ok: false,
      error:
        'Could not find a header row with "Certified Reference Material". Use the import template or matching column headers.',
    };
  }

  const rows = parseDataRows(matrix, headerRowIndex);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No certified reference material rows found below the header row.",
    };
  }

  return { ok: true, rows };
}

export async function importCertifiedReferenceMaterialsFromXlsx(
  file: File,
): Promise<
  | { ok: true; rows: CertifiedReferenceMaterialStored[]; importedCount: number }
  | { ok: false; error: string }
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

    const parsed = parseCertifiedReferenceMaterialMatrix(sheetToMatrix(sheet));
    if (!parsed.ok) return parsed;

    return { ok: true, rows: parsed.rows, importedCount: parsed.rows.length };
  } catch {
    return { ok: false, error: "Unable to read the Excel file. Check the format and try again." };
  }
}

export function editorRowsFromImported(stored: CertifiedReferenceMaterialStored[]) {
  const filled = stored.filter(rowHasContent);
  if (filled.length === 0) {
    return [createCertifiedReferenceMaterialRow()];
  }
  return filled.map((row) => ({
    ...createCertifiedReferenceMaterialRow(),
    ...row,
  }));
}
