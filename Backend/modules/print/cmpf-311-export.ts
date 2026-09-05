import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import {
  buildCmpf311Company,
  cmpf311DeclarationPlainText,
  cmpf311LetterheadSettings,
  type Cmpf311LetterData,
  type Cmpf311PrintAssets,
} from "@backend/modules/print/cmpf-311";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  pageMarginsFromSettings,
  pageSizeTwipFromSettings,
} from "@backend/modules/print/docx-letterhead";
import { formatDisplayDate } from "@backend/shared/format-date";

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

async function buildCmpf311Docx(
  data: Cmpf311LetterData,
  settings: PrintSettings,
  assets?: Cmpf311PrintAssets,
): Promise<Document> {
  const letterheadSettings = cmpf311LetterheadSettings(settings);
  const company = buildCmpf311Company(data, assets);
  const doc = data.document;
  const licenceFor = doc.licence_for_standard || data.isNumber || "—";
  const productManualNo = doc.sit_document_ref || "—";
  const sigName = data.firmRepName || data.contactPerson || "—";
  const sigDesig = data.firmRepDesignation || "—";
  const bisLine = `${data.bisBranchName.trim() || "________________"}, ${data.bisBranchState.trim() || "________________"}, INDIA`;

  const children: Paragraph[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [bodyRun("CMPF - 311", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Acceptance of Scheme of Inspection & Testing", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [bodyRun(`Date: ${formatMetaDate(data.dateOfInspection)}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 120 },
      children: [bodyRun(`Application No.: ${formatApplicationNo(data.applicationNumber)}`)],
    }),
    plainParagraph("To"),
    plainParagraph("The Director & Head"),
    plainParagraph("Bureau of Indian Standards"),
    plainParagraph(bisLine),
    plainParagraph(
      `This has reference to your letter No. ${doc.reference_letter_no || "________________"} dated ${formatMetaDate(doc.reference_letter_date) || "________________"}.`,
    ),
    plainParagraph(cmpf311DeclarationPlainText(licenceFor, productManualNo)),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 0 },
      children: [bodyRun(`For ${data.companyName || "—"}`, true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 320, after: 0 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
      },
      children: [bodyRun(`Name: ${sigName}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Designation: ${sigDesig}`)],
    }),
    ...(await buildLetterheadLowerParagraphs(letterheadSettings, assets)),
  ];

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: pageSizeTwipFromSettings(letterheadSettings),
            margin: pageMarginsFromSettings(letterheadSettings),
          },
        },
        children,
      },
    ],
  });
}

export async function downloadCmpf311Word(
  data: Cmpf311LetterData,
  settings: PrintSettings,
  assets?: Cmpf311PrintAssets,
): Promise<void> {
  const docx = await buildCmpf311Docx(data, settings, assets);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}
