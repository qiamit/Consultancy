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
  buildTechnicalStaffCompany,
  technicalStaffLetterheadSettings,
  type TechnicalStaffLetterData,
  type TechnicalStaffPrintAssets,
} from "@backend/modules/print/technical-staff";
import {
  DEFAULT_TECHNICAL_STAFF_TABLE_COLUMNS,
  TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS,
  technicalStaffColumnWidthPct,
  type TechnicalStaffTableColumnKey,
} from "@backend/modules/print/technical-staff-table-columns";
import type { TechnicalStaffStored } from "@backend/modules/bis/technical-staff";
import { rowHasContent } from "@backend/modules/bis/technical-staff";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  DOCX_LETTERHEAD_FONT,
  loadImageFromUrl,
  PAGE_HEIGHT_TWIP,
  PAGE_WIDTH_TWIP,
  pageMarginsFromSettings,
} from "@backend/modules/print/docx-letterhead";

const DOCX_FONT = DOCX_LETTERHEAD_FONT;
const DOCX_BODY_SIZE = 24;
const DOCX_TABLE_SIZE = 20;
const DOCX_TABLE_BODY_SIZE = 22;

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

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function bisBranchLine(data: TechnicalStaffLetterData): string {
  return [
    data.bisBranchName.trim() || "________________",
    data.bisBranchState.trim() || "________________",
    data.bisBranchCountry.trim() || "India",
  ].join(", ");
}

function isStandardRef(data: TechnicalStaffLetterData): string {
  const num = (data.isNumber ?? "").trim();
  const title = (data.isTitle ?? "").trim();
  if (num && title) return `${num} — ${title}`;
  if (num) return num;
  if (title) return title;
  return "";
}

function visibleRows(rows: TechnicalStaffStored[]): TechnicalStaffStored[] {
  return rows.filter(rowHasContent);
}

function cellPlainText(
  key: TechnicalStaffTableColumnKey,
  row: TechnicalStaffStored,
  rowIndex: number,
): string {
  switch (key) {
    case "sr_no":
      return String(rowIndex + 1).padStart(2, "0");
    case "person_name":
      return row.person_name.trim() || "—";
    case "designation":
      return row.designation.trim() || "—";
    case "educational_qualification":
      return row.educational_qualification.trim() || "—";
    case "experience_years":
      return row.experience_years.trim() || "—";
    case "appointment_letter":
      return row.appointment_letter.trim() ? "Attached" : "—";
    case "educational_certificate":
      return row.educational_certificate.trim() ? "Attached" : "—";
    case "photo":
      return row.photo.trim() ? "Attached" : "—";
    case "seal_sign":
      return row.seal_sign.trim() ? "Attached" : "—";
    default:
      return "—";
  }
}

function exportFilenameBase(data: TechnicalStaffLetterData): string {
  const coPart = safeFilePart(data.companyName || "Company");
  const isPart = safeFilePart(data.isNumber || "IS");
  return `Technical_Staff_${coPart}_${isPart}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bodyRun(text: string, bold = false, size = DOCX_BODY_SIZE): TextRun {
  return new TextRun({
    text,
    bold,
    font: DOCX_FONT,
    size,
  });
}

function bodyParagraph(
  runs: TextRun[],
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED,
  spacingAfter = 200,
): Paragraph {
  return new Paragraph({
    alignment,
    spacing: { after: spacingAfter, line: 360 },
    children: runs,
  });
}

function plainParagraph(text: string, bold = false): Paragraph {
  return bodyParagraph([bodyRun(text, bold)]);
}

function centerParagraph(text: string, bold = false, size = DOCX_TABLE_SIZE): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, line: 276 },
    children: [bodyRun(text, bold, size)],
  });
}

function buildAddressHeaderTable(
  data: TechnicalStaffLetterData,
  settings: PrintSettings,
): Table {
  const bisBranch = bisBranchLine(data);
  const inspectionDate = formatInspectionDate(data.inspectionDate);
  const applicationNo = formatApplicationNo(data.applicationNumber);
  const width = contentWidthTwip(settings);
  const leftW = Math.round(width * 0.58);
  const rightW = width - leftW;

  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: [leftW, rightW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: leftW, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                spacing: { after: 0, line: 360 },
                children: [bodyRun("To")],
              }),
              new Paragraph({
                spacing: { after: 0, line: 360 },
                children: [bodyRun("The Director & Head")],
              }),
              new Paragraph({
                spacing: { after: 0, line: 360 },
                children: [bodyRun("Bureau of Indian Standards")],
              }),
              new Paragraph({
                spacing: { after: 0, line: 360 },
                children: [bodyRun(bisBranch, true)],
              }),
            ],
          }),
          new TableCell({
            width: { size: rightW, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60, line: 360 },
                children: [bodyRun("Date: ", true), bodyRun(inspectionDate, true)],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0, line: 360 },
                children: [
                  bodyRun("Application No.: ", true),
                  bodyRun(applicationNo, true),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function buildTechnicalStaffTableDocx(
  rows: TechnicalStaffStored[],
  settings: PrintSettings,
): Table {
  const columns = DEFAULT_TECHNICAL_STAFF_TABLE_COLUMNS;
  const columnDefs = TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );
  const visible = visibleRows(rows);
  const outerWidth = contentWidthTwip(settings);
  const boxPad = 80;
  const innerWidth = Math.max(1200, outerWidth - boxPad * 2);
  const widths = columnDefs.map((col) => {
    const pct = Number.parseFloat(technicalStaffColumnWidthPct(col.key, columns));
    return Math.max(400, Math.round((pct / 100) * innerWidth));
  });
  const sum = widths.reduce((a, b) => a + b, 0);
  if (widths.length > 0 && sum !== innerWidth) {
    widths[widths.length - 1] = Math.max(
      400,
      (widths[widths.length - 1] ?? 400) + (innerWidth - sum),
    );
  }

  const header = new TableRow({
    tableHeader: true,
    children: columnDefs.map(
      (col, i) =>
        new TableCell({
          width: { size: widths[i]!, type: WidthType.DXA },
          borders: CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
          children: [centerParagraph(col.label, true, DOCX_TABLE_SIZE)],
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
              borders: {
                top: { ...THIN_BORDER, color: "E2E8F0" },
                bottom: { ...THIN_BORDER, color: "E2E8F0" },
                left: { ...THIN_BORDER, color: "E2E8F0" },
                right: { ...THIN_BORDER, color: "E2E8F0" },
              },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                centerParagraph(
                  cellPlainText(col.key, row, rowIndex),
                  false,
                  DOCX_TABLE_BODY_SIZE,
                ),
              ],
            }),
        ),
      }),
  );

  const innerTable = new Table({
    width: { size: innerWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...bodyRows],
  });

  return new Table({
    width: { size: outerWidth, type: WidthType.DXA },
    columnWidths: [outerWidth],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: outerWidth, type: WidthType.DXA },
            borders: BOX_BORDERS,
            shading: { type: ShadingType.CLEAR, fill: "F8FAFC" },
            margins: {
              top: boxPad,
              bottom: boxPad,
              left: boxPad,
              right: boxPad,
            },
            children: [innerTable],
          }),
        ],
      }),
    ],
  });
}

async function buildSignatureBlock(
  data: TechnicalStaffLetterData,
  settings: PrintSettings,
): Promise<(Paragraph | Table)[]> {
  const sigName = data.signatoryName.trim() || data.contactPerson.trim() || "—";
  const sigDesig = data.signatoryDesignation.trim() || "—";
  const totalWidth = contentWidthTwip(settings);
  const sigWidth = Math.min(3200, Math.round(totalWidth * 0.42));
  const spacerWidth = totalWidth - sigWidth;
  const parsed = await loadImageFromUrl(data.signatureImageUrl?.trim() || null);

  const sigChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [bodyRun(`For ${data.companyName}`, true)],
    }),
  ];

  if (parsed) {
    sigChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 0 },
        children: [
          new ImageRun({
            type: parsed.type,
            data: parsed.data,
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
      children: [bodyRun("Name: ", true), bodyRun(sigName)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun("Designation: ", true), bodyRun(sigDesig)],
    }),
  );

  return [
    new Paragraph({ spacing: { before: 280, after: 0 }, children: [] }),
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

async function buildTechnicalStaffDocx(
  data: TechnicalStaffLetterData,
  settings: PrintSettings,
  assets?: TechnicalStaffPrintAssets,
): Promise<Document> {
  const letterheadSettings = technicalStaffLetterheadSettings(settings);
  const company = buildTechnicalStaffCompany(data, assets);
  const isRef = isStandardRef(data);
  const visible = visibleRows(data.rows);

  const tableSection: (Paragraph | Table)[] =
    visible.length > 0
      ? [
          new Paragraph({ spacing: { before: 120, after: 120 }, children: [] }),
          buildTechnicalStaffTableDocx(data.rows, letterheadSettings),
          new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
        ]
      : [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 160 },
            children: [
              new TextRun({
                text: "No technical staff details entered yet.",
                font: DOCX_FONT,
                size: DOCX_BODY_SIZE,
                color: "64748B",
              }),
            ],
          }),
        ];

  const children: (Paragraph | Table)[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "Technical Staff Details",
          bold: true,
          allCaps: true,
          underline: {},
          font: DOCX_FONT,
          size: 30,
        }),
      ],
    }),
    buildAddressHeaderTable(data, letterheadSettings),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
    bodyParagraph([
      bodyRun("Sub: ", true),
      bodyRun("Details of Technical Staff for BIS licence application", true),
      ...(isRef
        ? [
            bodyRun(" under Indian Standard "),
            bodyRun(isRef, true),
            bodyRun("."),
          ]
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
        : [bodyRun(",")]),
      bodyRun(" hereby furnish the following details of our Technical Staff"),
      ...(isRef
        ? [
            bodyRun(" in connection with BIS certification under "),
            bodyRun(isRef, true),
          ]
        : [bodyRun(" in connection with BIS certification")]),
      bodyRun(". The particulars are as under:"),
    ]),
    ...tableSection,
    plainParagraph(
      "We declare that the information furnished above is true and correct to the best of our knowledge and belief. The persons listed above are responsible for technical operations and compliance of the unit with respect to BIS certification requirements.",
    ),
    ...(await buildSignatureBlock(data, letterheadSettings)),
    ...(await buildLetterheadLowerParagraphs(letterheadSettings, assets)),
  ];

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_TWIP,
              height: PAGE_HEIGHT_TWIP,
            },
            margin: pageMarginsFromSettings(letterheadSettings),
          },
        },
        children,
      },
    ],
  });
}

export async function downloadTechnicalStaffWord(
  data: TechnicalStaffLetterData,
  settings: PrintSettings,
  assets?: TechnicalStaffPrintAssets,
): Promise<void> {
  const doc = await buildTechnicalStaffDocx(data, settings, assets);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadTechnicalStaffExcel(
  data: TechnicalStaffLetterData,
): Promise<void> {
  const columns = DEFAULT_TECHNICAL_STAFF_TABLE_COLUMNS;
  const columnDefs = TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS.filter((c) =>
    columns.includes(c.key),
  );
  const visible = visibleRows(data.rows);

  const rows: (string | number)[][] = [];
  rows.push(["Technical Staff Details"]);
  rows.push([]);
  rows.push(["Company Name", data.companyName]);
  rows.push(["Address", data.address]);
  rows.push(["Indian Standard", data.isNumber]);
  rows.push(["IS Title", data.isTitle]);
  rows.push(["BIS Branch", bisBranchLine(data)]);
  rows.push(["Date", formatInspectionDate(data.inspectionDate)]);
  rows.push(["Application No.", formatApplicationNo(data.applicationNumber)]);
  rows.push([]);
  rows.push(["Technical Staff Details"]);

  if (visible.length > 0) {
    rows.push(columnDefs.map((c) => c.label));
    for (let i = 0; i < visible.length; i += 1) {
      rows.push(columnDefs.map((c) => cellPlainText(c.key, visible[i]!, i)));
    }
  } else {
    rows.push(["No technical staff details entered yet."]);
  }

  const colCount = Math.max(2, columnDefs.length);
  const buffer = await buildWorkbookBuffer([
    {
      name: "Technical Staff",
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
    `${exportFilenameBase(data)}.xlsx`,
  );
}
