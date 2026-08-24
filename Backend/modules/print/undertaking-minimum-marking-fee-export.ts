import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { UndertakingMinimumMarkingFeeLetterData } from "@backend/modules/print/undertaking-minimum-marking-fee";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: UndertakingMinimumMarkingFeeLetterData): string {
  return safeFilePart(`Undertaking_Minimum_Marking_Fee_${data.companyName || "Applicant"}`);
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

async function buildUndertakingMinimumMarkingFeeDocx(
  data: UndertakingMinimumMarkingFeeLetterData,
): Promise<Document> {
  const doc = data.document;
  const sigName = data.firmRepName || data.contactPerson || "—";
  const sigDesig = data.firmRepDesignation || "—";

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Undertaking for Minimum Marking Fee", true)],
    }),
    plainParagraph(`Date: ${formatMetaDate(data.dateOfApplication)}`),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph("Respected / Sir,"),
    plainParagraph(
      "I/We hereby undertake to pay the minimum marking fee as per Scheme-I of Schedule-II in BIS (Conformity Assessment) Regulations, 2018. The details of production and cost are furnished below:",
    ),
    plainParagraph(`Unit of Sale: ${doc.unit_of_sale || "—"}`),
    plainParagraph(`Annual Production Capacity: ${doc.annual_production_capacity || "—"}`),
    plainParagraph(`Value of Production (Per Unit): ${doc.value_of_production_per_unit || "—"}`),
    plainParagraph(`Cost of Production (Per Unit): ${doc.cost_of_production_per_unit || "—"}`),
    plainParagraph(
      `Cost (Market Cost) of Most Common Variety: ${doc.market_cost_most_common_variety || "—"}`,
    ),
    plainParagraph(
      "I/We further undertake that the above information is true and correct to the best of our knowledge and belief.",
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

export async function downloadUndertakingMinimumMarkingFeeWord(
  data: UndertakingMinimumMarkingFeeLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const docx = await buildUndertakingMinimumMarkingFeeDocx(data);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}
