import "server-only";

import * as XLSX from "xlsx";

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".csv",
  ".md",
  ".json",
  ".xml",
  ".html",
  ".htm",
]);

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

type PdfParseFn = (data: Buffer) => Promise<{ text: string }>;

async function loadPdfParse(): Promise<PdfParseFn> {
  const mod = (await import("pdf-parse")) as PdfParseFn | { default: PdfParseFn };
  if (typeof mod === "function") return mod;
  return mod.default;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = await loadPdfParse();
  const parsed = await pdfParse(buffer);
  return parsed.text ?? "";
}

function extractSpreadsheetText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const chunks: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    chunks.push(`--- Sheet: ${sheetName} ---`);
    chunks.push(XLSX.utils.sheet_to_csv(sheet));
  }
  return chunks.join("\n\n");
}

/** Extract plain text from an IS document upload for AI parsing. */
export async function extractDocumentText(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ext = extensionOf(fileName);

  if (ext === ".pdf") {
    return extractPdfText(buffer);
  }

  if (ext === ".xlsx" || ext === ".xls") {
    return extractSpreadsheetText(buffer);
  }

  if (TEXT_EXTENSIONS.has(ext) || ext === "") {
    return buffer.toString("utf8");
  }

  throw new Error(
    `Unsupported file type "${ext || "unknown"}". Upload PDF, Excel, CSV, or text for IS ${fileName}.`,
  );
}
