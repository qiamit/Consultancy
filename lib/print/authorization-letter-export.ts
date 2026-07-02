import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { buildWorkbookBuffer } from "@/lib/spreadsheet/excel";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { AuthorizationLetterLetterData } from "@/lib/print/authorization-letter";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import {
  AUTH_LETTER_REPRESENTATION_PARAGRAPH,
  AUTH_LETTER_RESPONSIBILITY_PARAGRAPH,
} from "@/lib/authorization-letter";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: AuthorizationLetterLetterData): string {
  return safeFilePart(`Authorization_Letter_${data.companyName || "Applicant"}`);
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

async function buildAuthorizationLetterDocx(
  data: AuthorizationLetterLetterData,
): Promise<Document> {
  const doc = data.document;
  const authorizedName =
    doc.authorized_name || data.contactPerson || data.companyName || "—";
  const authorizedDesig = doc.authorized_designation || "—";
  const sigName = doc.signatory_name || authorizedName;
  const sigDesig = doc.signatory_designation || authorizedDesig;

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Authorization Letter", true)],
    }),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(`Date: ${formatMetaDate(data.dateOfApplication)}`),
    plainParagraph("Dear Sir"),
    plainParagraph(
      `We, M/s. ${data.companyName}, hereby authorize ${authorizedName}, ${authorizedDesig} to represent our firm and to interact with BIS officials in connection with our application for grant of licence for use of BIS Standard Mark conforming to ${data.isNumber || "—"}.`,
    ),
    plainParagraph(AUTH_LETTER_REPRESENTATION_PARAGRAPH),
    plainParagraph(AUTH_LETTER_RESPONSIBILITY_PARAGRAPH),
    plainParagraph(`For M/s. ${data.companyName}`),
    plainParagraph(`Name: ${sigName}`),
    plainParagraph(`Designation: ${sigDesig}`),
  ];

  return new Document({ sections: [{ children }] });
}

export async function downloadAuthorizationLetterWord(
  data: AuthorizationLetterLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const docx = await buildAuthorizationLetterDocx(data);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadAuthorizationLetterExcel(
  data: AuthorizationLetterLetterData,
): Promise<void> {
  const doc = data.document;
  const rows: string[][] = [
    ["Authorization Letter"],
    [],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["Date", formatMetaDate(data.dateOfApplication)],
    ["IS Code", data.isNumber || "—"],
    [],
    ["Authorized Person", doc.authorized_name || "—"],
    ["Designation", doc.authorized_designation || "—"],
    [],
    ["Signatory Name", doc.signatory_name || doc.authorized_name || "—"],
    ["Signatory Designation", doc.signatory_designation || doc.authorized_designation || "—"],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Authorization Letter",
      rows,
      cols: [{ wch: 28 }, { wch: 44 }],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }],
    },
  ]);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.xlsx`);
}
