import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import {
  buildProcessDescriptionCompany,
  processDescriptionLetterheadSettings,
  resolveProcessDescriptionPoints,
  type ProcessDescriptionLetterData,
  type ProcessDescriptionPrintAssets,
} from "@backend/modules/print/process-description";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  loadImageFromUrl,
  pageMarginsFromSettings,
} from "@backend/modules/print/docx-letterhead";
import { formatDisplayDate } from "@backend/shared/format-date";

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

function plainParagraph(
  text: string,
  opts?: { before?: number; after?: number },
): Paragraph {
  return new Paragraph({
    spacing: { before: opts?.before ?? 0, after: opts?.after ?? 120 },
    children: [bodyRun(text)],
  });
}

async function buildSignatoryParagraphs(data: ProcessDescriptionLetterData): Promise<Paragraph[]> {
  const sigName = data.document.signatory_name || data.contactPerson || "—";
  const sigDesig = data.document.signatory_designation || "—";
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 0 },
      children: [bodyRun(`For ${data.companyName || "—"}`, true)],
    }),
  ];

  const sigImg = await loadImageFromUrl(data.signatureImageUrl?.trim() || null);
  if (sigImg) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 80, after: 40 },
        children: [
          new ImageRun({
            type: sigImg.type,
            data: sigImg.data,
            transformation: { width: 120, height: 50 },
            altText: {
              title: "Signature",
              description: "Signatory signature",
              name: "signature",
            },
          }),
        ],
      }),
    );
  } else {
    out.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 200, after: 0 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
        },
        children: [bodyRun("")],
      }),
    );
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Name: ${sigName}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 20, after: 0 },
      children: [bodyRun(`Designation: ${sigDesig}`)],
    }),
  );
  return out;
}

async function buildProcessDescriptionDocx(
  data: ProcessDescriptionLetterData,
  settings: PrintSettings,
  assets?: ProcessDescriptionPrintAssets,
): Promise<Document> {
  const letterheadSettings = processDescriptionLetterheadSettings(settings);
  const company = buildProcessDescriptionCompany(data, assets);
  const widthTwip = contentWidthTwip(letterheadSettings);
  const bisBranch = [data.bisBranchName, data.bisBranchState].filter((p) => p.trim()).join(", ");
  const points = resolveProcessDescriptionPoints(data);
  const isCode = data.isNumber?.trim() || "the applicable Indian Standard";

  const children: Array<Paragraph | Table> = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: "Process Description",
          bold: true,
          font: DOCX_FONT,
          size: 28,
          underline: {},
        }),
      ],
    }),
    new Table({
      width: { size: widthTwip, type: WidthType.DXA },
      columnWidths: [Math.round(widthTwip * 0.62), Math.round(widthTwip * 0.38)],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              width: { size: Math.round(widthTwip * 0.62), type: WidthType.DXA },
              children: [
                plainParagraph("To,", { after: 40 }),
                plainParagraph("The Director & Head", { after: 20 }),
                plainParagraph("Bureau of Indian Standards", { after: 20 }),
                plainParagraph(`${bisBranch || "—"}, INDIA`, { after: 0 }),
              ],
            }),
            new TableCell({
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              width: { size: Math.round(widthTwip * 0.38), type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 20 },
                  children: [bodyRun(`Date: ${formatMetaDate(data.dateOfApplication)}`)],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 0 },
                  children: [
                    bodyRun(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    plainParagraph("Respected / Sir,", { before: 140, after: 80 }),
    plainParagraph(
      `We hereby submit the following description of the manufacturing process adopted at our unit for ${isCode} for your kind reference in connection with our BIS licence application.`,
      { after: 120 },
    ),
    ...points.map((text, i) => plainParagraph(`${i + 1}. ${text}`, { after: 80 })),
    plainParagraph(
      "We hereby declare that all information furnished above is true and correct to the best of our knowledge and belief.",
      { before: 80, after: 80 },
    ),
    ...(await buildSignatoryParagraphs(data)),
    ...(await buildLetterheadLowerParagraphs(letterheadSettings, assets)),
  ];

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: pageMarginsFromSettings(letterheadSettings),
          },
        },
        children,
      },
    ],
  });
}

export async function downloadProcessDescriptionWord(
  data: ProcessDescriptionLetterData,
  settings: PrintSettings,
  assets?: ProcessDescriptionPrintAssets,
): Promise<void> {
  const doc = await buildProcessDescriptionDocx(data, settings, assets);
  const buffer = await Packer.toBlob(doc);
  triggerBlobDownload(buffer, `${exportFilenameBase(data)}.docx`);
}
