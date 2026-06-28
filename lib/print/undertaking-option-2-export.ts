import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { buildWorkbookBuffer } from "@/lib/spreadsheet/excel";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { UndertakingOption2LetterData } from "@/lib/print/undertaking-option-2";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: UndertakingOption2LetterData): string {
  return safeFilePart(`Undertaking_Option2_${data.companyName || "Simplified"}`);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatMetaDate(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "N/A";
  return formatDisplayDate(v, "N/A");
}

function formatApplicationNo(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function bodyRun(text: string, bold = false): TextRun {
  return new TextRun({ text, font: DOCX_FONT, size: DOCX_BODY_SIZE, bold });
}

function plainParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [bodyRun(text)],
  });
}

async function buildUndertakingOption2Docx(data: UndertakingOption2LetterData): Promise<Document> {
  const doc = data.document;
  const declarant = doc.declarant_name || data.contactPerson || data.companyName || "—";
  const product = doc.product_for_mark || "—";
  const standard = doc.is_standard || data.isNumber || "—";
  const factoryAddrRaw = (doc.factory_address || data.address).trim();
  const factoryAddr =
    factoryAddrRaw && /\bindia\b/i.test(factoryAddrRaw)
      ? factoryAddrRaw
      : factoryAddrRaw
        ? `${factoryAddrRaw}, INDIA`
        : "—";

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Undertaking for Simplified Procedure (Option 2)", true)],
    }),
    plainParagraph(`Applicant Name: ${data.companyName}`),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(`IS Code: ${data.isNumber || "—"}`),
    plainParagraph("Dear Sir"),
    plainParagraph(
      `I, ${declarant} have applied for a license under Option 2 to you for use of BIS standard mark on ${product} according to ${standard} being manufactured at our factory at ${factoryAddr}`,
    ),
    plainParagraph("I clearly understand and agree to the conditions that-"),
    plainParagraph(
      "1. The licence, if granted against the above application shall be put under suspension by BIS, if the sample drawn during the verification visit fails to conform to the relevant Indian Standard",
    ),
    plainParagraph(
      `Place: ${data.city || "—"}\nDate: ${formatMetaDate(data.dateOfInspection)}\nName: ${doc.signatory_name || declarant}\nDesignation: ${doc.signatory_designation || "—"}`,
    ),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadUndertakingOption2Word(
  data: UndertakingOption2LetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildUndertakingOption2Docx(data);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadUndertakingOption2Excel(
  data: UndertakingOption2LetterData,
): Promise<void> {
  const doc = data.document;
  const rows: (string | number)[][] = [
    ["Undertaking for Simplified Procedure (Option 2)"],
    [],
    ["Applicant Name", data.companyName],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["IS Code", data.isNumber || "—"],
    ["Declarant Name", doc.declarant_name || data.contactPerson || "—"],
    ["Product (BIS Mark On)", doc.product_for_mark || "—"],
    ["Indian Standard", doc.is_standard || data.isNumber || "—"],
    ["Factory Address", doc.factory_address || data.address || "—"],
    ["Signatory Name", doc.signatory_name || "—"],
    ["Signatory Designation", doc.signatory_designation || "—"],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Undertaking Option 2",
      rows,
      cols: [{ wch: 28 }, { wch: 44 }],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}
