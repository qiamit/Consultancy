import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import {
  buildOslSampleCompany,
  oslSampleLetterheadSettings,
  type OslSampleOfferLetterData,
  type OslSamplePrintAssets,
} from "@backend/modules/print/osl-sample-requirements";
import {
  normalizeOslSampleTableColumns,
  OSL_SAMPLE_TABLE_COLUMN_OPTIONS,
  type OslSampleTableColumnKey,
} from "@backend/modules/print/osl-sample-table-columns";
import {
  sampleOfferLetterLabels,
  type SampleOfferLetterVariant,
} from "@backend/modules/print/sample-offer-letter-variant";
import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
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
const DOCX_BODY_SIZE = 24; // 12pt — matches Print Preview body
const DOCX_TABLE_SIZE = 20; // 10pt
const DOCX_TABLE_BODY_SIZE = 22; // 11pt

const BOX_BORDER = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: "CBD5E1",
} as const;

const BOX_BORDERS = {
  top: BOX_BORDER,
  bottom: BOX_BORDER,
  left: BOX_BORDER,
  right: BOX_BORDER,
};

const THIN_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "CBD5E1",
} as const;

const CELL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

const ROW_BORDERS = {
  top: { ...THIN_BORDER, color: "E2E8F0" },
  bottom: { ...THIN_BORDER, color: "E2E8F0" },
  left: { ...THIN_BORDER, color: "E2E8F0" },
  right: { ...THIN_BORDER, color: "E2E8F0" },
};

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
} as const;

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function formatInspectionDate(dateStr: string | Date | null | undefined): string {
  return formatDisplayDate(dateStr, "N/A");
}

function formatApplicationNo(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function formatDateDisplay(ymd: string): string {
  const raw = (ymd ?? "").trim();
  if (!raw) return "—";
  return formatDisplayDate(raw, "—");
}

function bisBranchLine(data: OslSampleOfferLetterData): string {
  return [
    data.bisBranchName.trim() || "________________",
    data.bisBranchState.trim() || "________________",
    data.bisBranchCountry.trim() || "India",
  ].join(", ");
}

function isStandardRef(data: OslSampleOfferLetterData): string {
  const num = (data.isNumber ?? "").trim();
  const title = (data.isTitle ?? "").trim();
  if (num && title) return `${num} — ${title}`;
  if (num) return num;
  if (title) return title;
  return "";
}

function laboratoryInitials(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "—";
  const initials = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "—";
}

function visibleSampleRows(rows: OslSampleRequirementStored[]): OslSampleRequirementStored[] {
  return rows.filter(
    (r) =>
      r.sample_description.trim() ||
      r.declared_value.trim() ||
      r.batch_number.trim() ||
      r.date_of_manufacturing.trim() ||
      r.sample_quantity.trim() ||
      r.batch_quantity.trim() ||
      r.sample_code.trim() ||
      r.qr_code.trim() ||
      r.sample_type.trim() ||
      r.laboratory_name.trim(),
  );
}

function cellPlainText(
  key: OslSampleTableColumnKey,
  row: OslSampleRequirementStored,
  rowIndex: number,
): string {
  switch (key) {
    case "sr_no":
      return String(rowIndex + 1).padStart(2, "0");
    case "sample_description":
      return row.sample_description.trim() || "—";
    case "declared_value":
      return row.declared_value.trim() || "—";
    case "batch_no":
      return row.batch_number.trim() || "—";
    case "dom":
      return formatDateDisplay(row.date_of_manufacturing);
    case "sample_quantity":
      return row.sample_quantity.trim() || "—";
    case "sample_code":
      return row.sample_code.trim() || "—";
    case "qr_code":
      return row.qr_code.trim() || "—";
    case "batch_quantity":
      return row.batch_quantity.trim() || "—";
    case "sample_type":
      return row.sample_type.trim() || "—";
    case "priority":
      return row.priority.trim() || "Priority";
    case "laboratory":
      return laboratoryInitials(row.laboratory_name);
    default:
      return "—";
  }
}

function exportFilenameBase(
  data: OslSampleOfferLetterData,
  variant: SampleOfferLetterVariant,
): string {
  const prefix = variant === "pi" ? "Sample_PI" : "Sample_OSL";
  const coPart = safeFilePart(data.companyName || "Company");
  const isPart = safeFilePart(data.isNumber || "IS");
  return `${prefix}_${coPart}_${isPart}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bodyRun(text: string, bold = false): TextRun {
  return new TextRun({
    text,
    bold,
    font: DOCX_FONT,
    size: DOCX_BODY_SIZE,
  });
}

function bodyParagraph(
  runs: TextRun[],
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED,
): Paragraph {
  return new Paragraph({
    alignment,
    spacing: { after: 200, line: 360 },
    children: runs,
  });
}

function plainParagraph(
  text: string,
  bold = false,
  opts?: { after?: number; before?: number; center?: boolean },
): Paragraph {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: opts?.before ?? 0, after: opts?.after ?? 200, line: 360 },
    children: [bodyRun(text, bold)],
  });
}

function tableCellParagraph(
  text: string,
  opts?: { bold?: boolean; center?: boolean; size?: number },
): Paragraph {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 0, line: 276 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold ?? false,
        font: DOCX_FONT,
        size: opts?.size ?? DOCX_TABLE_BODY_SIZE,
      }),
    ],
  });
}

function smallLabelRun(text: string): TextRun {
  return new TextRun({
    text,
    bold: true,
    font: DOCX_FONT,
    size: DOCX_TABLE_SIZE,
    color: "64748B",
    allCaps: true,
  });
}

function columnWidthsTwip(
  columnDefs: typeof OSL_SAMPLE_TABLE_COLUMN_OPTIONS,
  totalWidth: number,
): number[] {
  const weights = columnDefs.map((col) => (col.wide ? 3 : col.key === "sr_no" ? 0.7 : 1.2));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const widths = weights.map((w) => Math.max(350, Math.round((w / sum) * totalWidth)));
  const diff = totalWidth - widths.reduce((a, b) => a + b, 0);
  if (widths.length > 0) {
    widths[widths.length - 1] = Math.max(350, (widths[widths.length - 1] ?? 350) + diff);
  }
  return widths;
}

/** Inner sample table — borders / header shading match Print Preview. */
function buildSampleInnerTable(
  rows: OslSampleRequirementStored[],
  tableColumns: OslSampleTableColumnKey[],
  widthTwip: number,
): Table {
  const columns = normalizeOslSampleTableColumns(tableColumns);
  const columnDefs = OSL_SAMPLE_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );
  const visible = visibleSampleRows(rows);
  const widths = columnWidthsTwip(columnDefs, widthTwip);

  const header = new TableRow({
    tableHeader: true,
    children: columnDefs.map(
      (col, i) =>
        new TableCell({
          width: { size: widths[i]!, type: WidthType.DXA },
          borders: CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
          children: [
            tableCellParagraph(col.label, {
              bold: true,
              center: Boolean(col.headerCenter || col.cellCenter || col.stackHeader),
              size: DOCX_TABLE_SIZE,
            }),
          ],
        }),
    ),
  });

  const bodyRows = visible.map(
    (row, rowIndex) =>
      new TableRow({
        children: columnDefs.map(
          (col, i) =>
            new TableCell({
              width: { size: widths[i]!, type: WidthType.DXA },
              borders: ROW_BORDERS,
              verticalAlign: VerticalAlign.TOP,
              children: [
                tableCellParagraph(cellPlainText(col.key, row, rowIndex), {
                  center: Boolean(col.cellCenter || col.stackHeader),
                }),
              ],
            }),
        ),
      }),
  );

  return new Table({
    width: { size: widthTwip, type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...bodyRows],
  });
}

/** Outer slate box around sample details — same as Print Preview. */
function buildSampleDetailsBox(
  data: OslSampleOfferLetterData,
  tableColumns: OslSampleTableColumnKey[],
  variant: SampleOfferLetterVariant,
  widthTwip: number,
): Table {
  const boxPad = 100;
  const innerWidth = Math.max(1200, widthTwip - boxPad * 2);
  const label =
    variant === "pi" ? "Sample Details for PI" : "Sample Details for OSL";
  const visible = visibleSampleRows(data.rows);

  const innerChildren: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 80 },
      children: [smallLabelRun(label)],
    }),
    ...(visible.length > 0
      ? [buildSampleInnerTable(data.rows, tableColumns, innerWidth)]
      : [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: "No sample details entered yet.",
                font: DOCX_FONT,
                size: DOCX_BODY_SIZE,
                color: "64748B",
              }),
            ],
          }),
        ]),
  ];

  return new Table({
    width: { size: widthTwip, type: WidthType.DXA },
    columnWidths: [widthTwip],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: widthTwip, type: WidthType.DXA },
            borders: BOX_BORDERS,
            shading: { type: ShadingType.CLEAR, fill: "F8FAFC" },
            margins: {
              top: boxPad,
              bottom: boxPad,
              left: boxPad,
              right: boxPad,
            },
            children: innerChildren,
          }),
        ],
      }),
    ],
  });
}

async function buildSignatoryBlock(
  data: OslSampleOfferLetterData,
  settings: PrintSettings,
): Promise<(Paragraph | Table)[]> {
  const sigName = data.signatoryName.trim() || data.contactPerson.trim() || "—";
  const sigDesig = data.signatoryDesignation.trim() || "—";
  const totalWidth = contentWidthTwip(settings);
  const sigWidth = Math.min(3600, Math.round(totalWidth * 0.42));
  const spacerWidth = totalWidth - sigWidth;

  const sigChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [bodyRun(`For ${data.companyName}`, true)],
    }),
  ];

  const sigImg = await loadImageFromUrl(data.signatureImageUrl?.trim() || null);
  if (sigImg) {
    sigChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 0 },
        children: [
          new ImageRun({
            type: sigImg.type,
            data: sigImg.data,
            transformation: { width: 120, height: 48 },
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
    sigChildren.push(
      new Paragraph({
        spacing: { before: 280, after: 0 },
        children: [],
      }),
    );
  }

  sigChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 80, after: 0 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
      },
      children: [
        new TextRun({ text: "Name: ", bold: true, font: DOCX_FONT, size: 22 }),
        new TextRun({ text: sigName, font: DOCX_FONT, size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [
        new TextRun({
          text: "Designation: ",
          bold: true,
          font: DOCX_FONT,
          size: 22,
        }),
        new TextRun({ text: sigDesig, font: DOCX_FONT, size: 22 }),
      ],
    }),
  );

  return [
    new Paragraph({ spacing: { before: 360, after: 0 }, children: [] }),
    new Table({
      width: { size: totalWidth, type: WidthType.DXA },
      columnWidths: [spacerWidth, sigWidth],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: spacerWidth, type: WidthType.DXA },
              borders: NO_BORDERS,
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              width: { size: sigWidth, type: WidthType.DXA },
              borders: NO_BORDERS,
              children: sigChildren,
            }),
          ],
        }),
      ],
    }),
  ];
}

async function buildOslSampleDocx(
  data: OslSampleOfferLetterData,
  settings: PrintSettings,
  tableColumns: OslSampleTableColumnKey[],
  variant: SampleOfferLetterVariant,
  assets?: OslSamplePrintAssets,
): Promise<Document> {
  const letterheadSettings = oslSampleLetterheadSettings(settings);
  const company = buildOslSampleCompany(data, assets);
  const labels = sampleOfferLetterLabels(variant);
  const widthTwip = contentWidthTwip(letterheadSettings);
  const isRef = isStandardRef(data);
  const bisBranch = bisBranchLine(data);
  const inspectionDate = formatInspectionDate(data.inspectionDate);
  const applicationNo = formatApplicationNo(data.applicationNumber);
  const leftCol = Math.round(widthTwip * 0.62);
  const rightCol = widthTwip - leftCol;

  const children: (Paragraph | Table)[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: labels.documentHeading.toUpperCase(),
          bold: true,
          underline: {},
          font: DOCX_FONT,
          size: 30,
          allCaps: true,
        }),
      ],
    }),
    new Table({
      width: { size: widthTwip, type: WidthType.DXA },
      columnWidths: [leftCol, rightCol],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: NO_BORDERS,
              width: { size: leftCol, type: WidthType.DXA },
              children: [
                plainParagraph("To", false, { after: 40 }),
                plainParagraph("The Director & Head", false, { after: 20 }),
                plainParagraph("Bureau of Indian Standards", false, { after: 20 }),
                plainParagraph(bisBranch, false, { after: 0 }),
              ],
            }),
            new TableCell({
              borders: NO_BORDERS,
              width: { size: rightCol, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 40 },
                  children: [bodyRun("Date: ", true), bodyRun(inspectionDate)],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 0 },
                  children: [
                    bodyRun("Application No.: ", true),
                    bodyRun(applicationNo),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    bodyParagraph([
      bodyRun("Sub: ", true),
      bodyRun(
        "Submission of samples for testing at Outside Testing Laboratory (OSL)",
      ),
      ...(isRef
        ? [bodyRun(" under Indian Standard "), bodyRun(isRef, true), bodyRun(".")]
        : [bodyRun(".")]),
    ]),
    bodyParagraph([
      bodyRun("We, "),
      bodyRun(`M/s. ${data.companyName}`, true),
      ...(data.address.trim()
        ? [
            bodyRun(", having our factory at "),
            bodyRun(data.address, true),
            bodyRun(","),
          ]
        : []),
      bodyRun(
        " hereby sending the following samples for testing at the designated Outside Testing Laboratory (OSL)",
      ),
      ...(isRef
        ? [
            bodyRun(" in connection with BIS certification under "),
            bodyRun(isRef, true),
          ]
        : [bodyRun(" in connection with BIS certification")]),
      bodyRun(". The details of the samples sent are as under:"),
    ]),
    new Paragraph({ spacing: { before: 80, after: 0 }, children: [] }),
    buildSampleDetailsBox(data, tableColumns, variant, widthTwip),
    plainParagraph(
      "We declare that the above samples have been prepared prior to grant of the BIS licence, are drawn from trial production, and are being manufactured for the purpose of obtaining BIS licence. The information furnished above is true and correct to the best of our knowledge and belief.",
      false,
      { before: 200, after: 120 },
    ),
    ...(await buildSignatoryBlock(data, letterheadSettings)),
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

/** Modern Office Open XML Word document (.docx) for OSL / PI sample offer letter. */
export async function downloadOslSampleRequirementsWord(
  data: OslSampleOfferLetterData,
  settings: PrintSettings,
  tableColumns: OslSampleTableColumnKey[],
  variant: SampleOfferLetterVariant = "osl",
  assets?: OslSamplePrintAssets,
): Promise<void> {
  const doc = await buildOslSampleDocx(data, settings, tableColumns, variant, assets);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data, variant)}.docx`);
}

/** Modern Office Open XML Excel workbook (.xlsx) for OSL / PI sample offer letter. */
export async function downloadOslSampleRequirementsExcel(
  data: OslSampleOfferLetterData,
  tableColumns: OslSampleTableColumnKey[],
  variant: SampleOfferLetterVariant = "osl",
): Promise<void> {
  const labels = sampleOfferLetterLabels(variant);
  const columns = normalizeOslSampleTableColumns(tableColumns);
  const columnDefs = OSL_SAMPLE_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );
  const visible = visibleSampleRows(data.rows);

  const rows: (string | number)[][] = [];
  rows.push([labels.documentHeading]);
  rows.push([]);
  rows.push(["Company Name", data.companyName]);
  rows.push(["Address", data.address]);
  rows.push(["Indian Standard", data.isNumber]);
  rows.push(["IS Title", data.isTitle]);
  rows.push(["BIS Branch", bisBranchLine(data)]);
  rows.push(["Date", formatInspectionDate(data.inspectionDate)]);
  rows.push(["Application No.", formatApplicationNo(data.applicationNumber)]);
  rows.push([]);
  rows.push([
    variant === "pi" ? "Sample Details for PI" : "Sample Details for OSL",
  ]);

  if (visible.length > 0) {
    rows.push(columnDefs.map((c) => c.label));
    for (let i = 0; i < visible.length; i += 1) {
      rows.push(columnDefs.map((c) => cellPlainText(c.key, visible[i]!, i)));
    }
  } else {
    rows.push(["No sample details entered yet."]);
  }

  const colCount = Math.max(2, columnDefs.length);
  const buffer = await buildWorkbookBuffer([
    {
      name: variant === "pi" ? "Sample PI" : "Sample OSL",
      rows,
      cols: Array.from({ length: colCount }, (_, i) =>
        i === 0 ? { wch: 22 } : { wch: 28 },
      ),
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(1, colCount - 1) } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data, variant)}.xlsx`,
  );
}
