import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { PlantLayoutLetterData } from "@backend/modules/print/plant-layout";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: PlantLayoutLetterData): string {
  return safeFilePart(`Plant_Layout_${data.companyName || "Applicant"}`);
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

async function buildPlantLayoutDocx(data: PlantLayoutLetterData): Promise<Document> {
  const sigName = data.firmRepName || data.contactPerson || "—";
  const sigDesig = data.firmRepDesignation || "—";
  const bisBranch = [data.bisBranchName, data.bisBranchState].filter((p) => p.trim()).join(", ");

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Plant Layout", true)],
    }),
    plainParagraph(`Date: ${formatMetaDate(data.dateOfApplication)}`),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(
      `To\nThe Director & Head\nBureau of Indian Standards\n${bisBranch || "—"}, INDIA`,
    ),
    plainParagraph("Respected / Sir,"),
    plainParagraph(
      "We hereby submit the plant layout drawing of our manufacturing unit for your kind reference in connection with our BIS licence application.",
    ),
    plainParagraph(
      data.document.drawing_data_url
        ? "Plant layout drawing is attached in the application print preview."
        : "Plant layout drawing is not yet added.",
    ),
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
      children: [bodyRun(`Name: ${sigName}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Designation: ${sigDesig}`)],
    }),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadPlantLayoutWord(
  data: PlantLayoutLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const docx = await buildPlantLayoutDocx(data);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}
