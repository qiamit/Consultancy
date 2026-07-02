import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import {
  resolveProcessDescriptionPoints,
  type ProcessDescriptionLetterData,
} from "@/lib/print/process-description";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: ProcessDescriptionLetterData): string {
  return safeFilePart(`Process_Description_${data.companyName || "Application"}`);
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

async function buildProcessDescriptionDocx(
  data: ProcessDescriptionLetterData,
): Promise<Document> {
  const bisBranch = [data.bisBranchName, data.bisBranchState, data.bisBranchCountry]
    .filter((p) => p.trim())
    .join(", ") || "—";
  const points = resolveProcessDescriptionPoints(data);
  const isCode = data.isNumber?.trim() || "the applicable Indian Standard";

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Process Description", true)],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        bodyRun("To\nThe Director & Head\nBureau of Indian Standards\n"),
        bodyRun(bisBranch),
        bodyRun("\t\t\t\tDate: "),
        bodyRun(formatMetaDate(data.dateOfApplication), true),
        bodyRun("\n\t\t\t\tApplication No.: "),
        bodyRun(formatApplicationNo(data.applicationNumber), true),
      ],
    }),
    plainParagraph("Respected / Sir,"),
    plainParagraph(
      `We hereby submit the following description of the manufacturing process adopted at our unit for ${isCode} for your kind reference in connection with our BIS licence application.`,
    ),
    ...points.map((text, i) => plainParagraph(`${i + 1}. ${text}`)),
    plainParagraph(
      "We hereby declare that all information furnished above is true and correct to the best of our knowledge and belief.",
    ),
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
      children: [
        bodyRun(`Name: ${data.document.signatory_name || data.contactPerson || "—"}`),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Designation: ${data.document.signatory_designation || "—"}`)],
    }),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadProcessDescriptionWord(
  data: ProcessDescriptionLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildProcessDescriptionDocx(data);
  const buffer = await Packer.toBlob(doc);
  triggerBlobDownload(buffer, `${exportFilenameBase(data)}.docx`);
}
