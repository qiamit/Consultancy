import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { UndertakingOption2LetterData } from "@backend/modules/print/undertaking-option-2";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";

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
      "2. In such case of suspension, I shall take necessary corrective actions and inform the same to BIS within one month and offer fresh lot of products manufactured after taking corrective actions, from which sample(s) will be drawn by BIS for third party testing",
    ),
    plainParagraph(
      "3. The revocation of suspension will be considered only based on complete test report(s) of the fresh sample(s) offered, from third party testing laboratory",
    ),
    plainParagraph(
      "4. The testing fee for testing of sample drawn for consideration of revocation of suspension shall be borne by me",
    ),
    plainParagraph(
      "5. In case, the fresh sample drawn by BIS for considering revocation of suspension shows non-conformity, or I fail to inform corrective actions within 30 days from the date of suspension, the licence will be processed for cancellation",
    ),
    plainParagraph(`For ${data.companyName || "—"}`),
    plainParagraph(`Name: ${doc.signatory_name || declarant}`),
    plainParagraph(`Designation: ${doc.signatory_designation || "—"}`),
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
      name: "Undertaking for Simplified Procedure",
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
