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
import {
  buildProcessFlowChartCompany,
  processFlowChartLetterheadSettings,
  type ProcessFlowChartLetterData,
  type ProcessFlowChartPrintAssets,
} from "@backend/modules/print/process-flow-chart";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  loadImageFromUrl,
  pageMarginsFromSettings,
  parseDataUrlImage,
  twipToPx,
} from "@backend/modules/print/docx-letterhead";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: ProcessFlowChartLetterData): string {
  return safeFilePart(`Process_Flow_Chart_${data.companyName || "Applicant"}`);
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

function loadNaturalSize(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth) {
        resolve(null);
        return;
      }
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function buildDrawingParagraphs(
  data: ProcessFlowChartLetterData,
  settings: PrintSettings,
): Promise<Paragraph[]> {
  const widthTwip = contentWidthTwip(settings);
  const widthPx = twipToPx(widthTwip);
  const drawing = data.document.drawing_data_url?.trim();
  if (!drawing) {
    return [
      plainParagraph("Process flow chart has not been added yet.", { after: 120 }),
    ];
  }

  const img = parseDataUrlImage(drawing) ?? (await loadImageFromUrl(drawing));
  if (!img) {
    return [
      plainParagraph(
        "Process flow chart could not be embedded. Please use Print Preview.",
        { after: 120 },
      ),
    ];
  }

  const natural = await loadNaturalSize(drawing);
  const aspect =
    natural && natural.width > 0 ? natural.height / natural.width : 1.2;
  let heightPx = Math.round(widthPx * aspect);
  if (data.document.chart_settings?.print_chart_size === "fit_page") {
    // Cap height so the chart roughly fits one A4 content area in Word.
    heightPx = Math.min(heightPx, Math.round(widthPx * 0.95));
  }

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 120 },
      children: [
        new ImageRun({
          type: img.type,
          data: img.data,
          transformation: { width: widthPx, height: heightPx },
          altText: {
            title: "Process Flow Chart",
            description: "Process flow chart drawing",
            name: "process_flow_chart",
          },
        }),
      ],
    }),
  ];
}

async function buildSignatoryParagraphs(data: ProcessFlowChartLetterData): Promise<Paragraph[]> {
  const sigName = data.firmRepName || data.contactPerson || "—";
  const sigDesig = data.firmRepDesignation || "—";
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

async function buildProcessFlowChartDocx(
  data: ProcessFlowChartLetterData,
  settings: PrintSettings,
  assets?: ProcessFlowChartPrintAssets,
): Promise<Document> {
  const letterheadSettings = processFlowChartLetterheadSettings(settings);
  const company = buildProcessFlowChartCompany(data, assets);
  const widthTwip = contentWidthTwip(letterheadSettings);
  const bisBranch = [data.bisBranchName, data.bisBranchState].filter((p) => p.trim()).join(", ");

  const children: Array<Paragraph | Table> = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: "Process Flow Chart",
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
      "We hereby submit the process flow chart and description of our manufacturing process for your kind reference in connection with our BIS licence application.",
      { after: 120 },
    ),
    ...(await buildDrawingParagraphs(data, letterheadSettings)),
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

export async function downloadProcessFlowChartWord(
  data: ProcessFlowChartLetterData,
  settings: PrintSettings,
  assets?: ProcessFlowChartPrintAssets,
): Promise<void> {
  const docx = await buildProcessFlowChartDocx(data, settings, assets);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}
