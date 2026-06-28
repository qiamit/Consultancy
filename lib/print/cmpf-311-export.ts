import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { buildWorkbookBuffer } from "@/lib/spreadsheet/excel";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { Cmpf311LetterData } from "@/lib/print/cmpf-311";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: Cmpf311LetterData): string {
  return safeFilePart(`CMPF311_${data.companyName || "SIT_Acceptance"}`);
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

function plainParagraph(text: string, centered = false): Paragraph {
  return new Paragraph({
    alignment: centered ? AlignmentType.CENTER : undefined,
    spacing: { after: 120 },
    children: [bodyRun(text)],
  });
}

async function buildCmpf311Docx(data: Cmpf311LetterData): Promise<Document> {
  const doc = data.document;
  const addressParts = [data.address, data.city, data.bisBranchState].filter((p) => p.trim());
  const addressLine = addressParts.length > 0 ? `${addressParts.join(", ")}, INDIA` : "—";
  const licenceFor = doc.licence_for_standard || data.isNumber || "—";

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [bodyRun("CMPF - 311", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Acceptance of Scheme of Inspection & Testing", true)],
    }),
    plainParagraph(`Applicant Name: ${data.companyName}`),
    plainParagraph(`Applicant Address: ${addressLine}`),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(`IS Code: ${data.isNumber || "—"}`),
    plainParagraph(
      `Reference Letter No.: ${doc.reference_letter_no || "—"}  Dated: ${formatMetaDate(doc.reference_letter_date)}`,
    ),
    plainParagraph(
      `We hereby agree that after a licence is granted to us for according to ${licenceFor} we shall follow the scheme of Testing and Inspection (Doc: ${doc.sit_document_ref || "—"}) strictly and maintain all records properly.`,
      true,
    ),
    plainParagraph(
      `Place: ${data.city || "—"}\nDate: ${formatMetaDate(data.dateOfInspection)}\nName: ${doc.signatory_name || data.contactPerson || "—"}\nDesignation: ${doc.signatory_designation || "—"}`,
    ),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadCmpf311Word(
  data: Cmpf311LetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildCmpf311Docx(data);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadCmpf311Excel(data: Cmpf311LetterData): Promise<void> {
  const doc = data.document;
  const rows: (string | number)[][] = [
    ["Acceptance of Scheme of Inspection & Testing (CMPF - 311)"],
    [],
    ["Applicant Name", data.companyName],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["IS Code", data.isNumber || "—"],
    ["Reference Letter No.", doc.reference_letter_no || "—"],
    ["Reference Letter Date", formatMetaDate(doc.reference_letter_date)],
    ["Licence For (Standard)", doc.licence_for_standard || data.isNumber || "—"],
    ["SIT Document Ref (Doc:)", doc.sit_document_ref || "—"],
    ["Signatory Name", doc.signatory_name || data.contactPerson || "—"],
    ["Signatory Designation", doc.signatory_designation || "—"],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "CMPF 311",
      rows,
      cols: [{ wch: 28 }, { wch: 40 }],
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
