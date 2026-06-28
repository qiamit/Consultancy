import ExcelJS from "exceljs";

export type ColWidth = { wch: number };
export type MergeRange = {
  s: { r: number; c: number };
  e: { r: number; c: number };
};

export type SheetFromAoaOptions = {
  cols?: ColWidth[];
  merges?: MergeRange[];
};

function cellPlainValue(value: ExcelJS.CellValue): string | number {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value && value.result != null) {
      return cellPlainValue(value.result as ExcelJS.CellValue);
    }
    if ("text" in value && value.text != null) return String(value.text);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
  }
  return String(value);
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function addSheetFromAoa(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  rows: (string | number)[][],
  options?: SheetFromAoaOptions,
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));

  rows.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(rowIndex + 1);
    row.forEach((cell, colIndex) => {
      if (cell !== undefined && cell !== "") {
        excelRow.getCell(colIndex + 1).value = cell;
      }
    });
    excelRow.commit();
  });

  options?.cols?.forEach((col, index) => {
    worksheet.getColumn(index + 1).width = col.wch;
  });

  options?.merges?.forEach((merge) => {
    worksheet.mergeCells(
      merge.s.r + 1,
      merge.s.c + 1,
      merge.e.r + 1,
      merge.e.c + 1,
    );
  });

  return worksheet;
}

export function setCellAddress(
  worksheet: ExcelJS.Worksheet,
  address: string,
  value: string | number,
): void {
  worksheet.getCell(address).value = value;
}

function cloneStyle(source: Partial<ExcelJS.Style>): Partial<ExcelJS.Style> {
  return JSON.parse(JSON.stringify(source)) as Partial<ExcelJS.Style>;
}

/** Copy row height and per-cell styles (not values). */
export function copyRowFormat(
  worksheet: ExcelJS.Worksheet,
  sourceRowNum: number,
  targetRowNum: number,
  colCount = 36,
): void {
  const sourceRow = worksheet.getRow(sourceRowNum);
  const targetRow = worksheet.getRow(targetRowNum);
  if (sourceRow.height) targetRow.height = sourceRow.height;
  for (let col = 1; col <= colCount; col++) {
    const src = sourceRow.getCell(col);
    const dest = targetRow.getCell(col);
    if (src.style && Object.keys(src.style).length > 0) {
      dest.style = cloneStyle(src.style);
    }
  }
}

export function cloneWorksheet(
  workbook: ExcelJS.Workbook,
  source: ExcelJS.Worksheet,
  newName: string,
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(newName.slice(0, 31));

  source.columns?.forEach((col, index) => {
    const destCol = worksheet.getColumn(index + 1);
    if (col.width) destCol.width = col.width;
    if (col.hidden) destCol.hidden = col.hidden;
    if (col.style && Object.keys(col.style).length > 0) {
      destCol.style = cloneStyle(col.style);
    }
  });

  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const destRow = worksheet.getRow(rowNumber);
    if (row.height) destRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const destCell = destRow.getCell(colNumber);
      destCell.value = cell.value;
      if (cell.style && Object.keys(cell.style).length > 0) {
        destCell.style = cloneStyle(cell.style);
      }
    });
  });

  const merges = (source as ExcelJS.Worksheet & { model?: { merges?: string[] } }).model
    ?.merges;
  merges?.forEach((range) => {
    try {
      worksheet.mergeCells(range);
    } catch {
      // Ignore duplicate merge attempts.
    }
  });

  if (source.pageSetup) worksheet.pageSetup = { ...source.pageSetup };
  if (source.headerFooter) worksheet.headerFooter = { ...source.headerFooter };
  if (source.views) worksheet.views = source.views.map((view) => ({ ...view }));

  return worksheet;
}

export async function buildWorkbookBuffer(
  sheets: Array<{
    name: string;
    rows: (string | number)[][];
    cols?: ColWidth[];
    merges?: MergeRange[];
  }>,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    addSheetFromAoa(workbook, sheet.name, sheet.rows, {
      cols: sheet.cols,
      merges: sheet.merges,
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export async function downloadWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function loadWorkbookFromArrayBuffer(
  buffer: ArrayBuffer,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

/** Extract plain text from an uploaded .xlsx workbook for AI parsing. */
export async function extractSpreadsheetText(input: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(input) as unknown as ExcelJS.Buffer);
  const chunks: string[] = [];

  workbook.eachSheet((sheet) => {
    chunks.push(`--- Sheet: ${sheet.name} ---`);
    const lines: string[] = [];
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cells[colNumber - 1] = escapeCsvField(String(cellPlainValue(cell.value)));
      });
      lines.push(cells.join(","));
    });
    chunks.push(lines.join("\n"));
  });

  return chunks.join("\n\n");
}
