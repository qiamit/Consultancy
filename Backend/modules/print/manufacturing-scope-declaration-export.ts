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
import { buildWorkbookBuffer, triggerBlobDownload } from "@backend/shared/spreadsheet/excel";
import {
  buildManufacturingScopeCompany,
  manufacturingScopeLetterheadSettings,
  type ManufacturingScopeDeclarationData,
  type ManufacturingScopePrintAssets,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  loadImageFromUrl,
  pageMarginsFromSettings,
} from "@backend/modules/print/docx-letterhead";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 24; // half-points → 12pt
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
  return formatDisplayDate(dateStr, "");
}

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function bisBranchLine(data: ManufacturingScopeDeclarationData): string {
  return [
    data.bisBranchName.trim() || "________________",
    data.bisBranchState.trim() || "________________",
    data.bisBranchCountry.trim() || "India",
  ].join(", ");
}

function isStandardRef(data: ManufacturingScopeDeclarationData): string {
  const num = (data.isNumber ?? "").trim();
  const title = (data.isTitle ?? "").trim();
  if (num && title) return `${num} — ${title}`;
  if (num) return num;
  if (title) return title;
  return "";
}

function exportFilenameBase(data: ManufacturingScopeDeclarationData): string {
  const coPart = safeFilePart(data.companyName || "Company");
  const isPart = safeFilePart(data.isNumber || "IS");
  return `Manufacturing_Scope_${coPart}_${isPart}`;
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
  opts?: { before?: number; after?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] },
): Paragraph {
  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.JUSTIFIED,
    spacing: { before: opts?.before ?? 0, after: opts?.after ?? 200, line: 360 },
    children: [bodyRun(text, bold)],
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

function multilineParagraphs(text: string): Paragraph[] {
  const lines = (text ?? "").split(/\r?\n/);
  if (lines.length === 0 || (lines.length === 1 && !lines[0]?.trim())) {
    return [plainParagraph("—", false, { after: 0 })];
  }
  return lines.map((line, i) =>
    plainParagraph(line.trim() === "" ? " " : line, false, {
      after: i === lines.length - 1 ? 0 : 80,
    }),
  );
}

/** Matches Print Preview: Sr No | Component | Value with slate borders. */
function buildLicenseScopeInnerTable(
  rows: { component: string; value: string }[],
  widthTwip: number,
): Table {
  const srW = Math.round(widthTwip * 0.12);
  const rem = widthTwip - srW;
  const compW = Math.round(rem / 2);
  const valW = rem - compW;
  const widths = [srW, compW, valW];

  const header = new TableRow({
    tableHeader: true,
    children: ["Sr No", "Component", "Value"].map(
      (label, i) =>
        new TableCell({
          width: { size: widths[i]!, type: WidthType.DXA },
          borders: CELL_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          shading: { type: ShadingType.CLEAR, fill: "E2E8F0" },
          children: [
            tableCellParagraph(label, {
              bold: true,
              center: i === 0,
              size: DOCX_TABLE_SIZE,
            }),
          ],
        }),
    ),
  });

  const filled = rows.filter((r) => r.component.trim() || r.value.trim());
  const bodyRows =
    filled.length === 0
      ? [
          new TableRow({
            children: widths.map(
              (w, i) =>
                new TableCell({
                  width: { size: w, type: WidthType.DXA },
                  borders: CELL_BORDERS,
                  children: [
                    tableCellParagraph("—", { center: i === 0 }),
                  ],
                }),
            ),
          }),
        ]
      : filled.map(
          (r, idx) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: srW, type: WidthType.DXA },
                  borders: CELL_BORDERS,
                  verticalAlign: VerticalAlign.CENTER,
                  children: [tableCellParagraph(String(idx + 1), { center: true })],
                }),
                new TableCell({
                  width: { size: compW, type: WidthType.DXA },
                  borders: CELL_BORDERS,
                  children: [tableCellParagraph(r.component.trim() || "—")],
                }),
                new TableCell({
                  width: { size: valW, type: WidthType.DXA },
                  borders: CELL_BORDERS,
                  children: [tableCellParagraph(r.value.trim() || "—")],
                }),
              ],
            }),
        );

  return new Table({
    width: { size: widthTwip, type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...bodyRows],
  });
}

/** Outer slate box around License Scope — same look as Print Preview. */
function buildLicenseScopeBox(
  data: ManufacturingScopeDeclarationData,
  widthTwip: number,
): Table {
  const boxPad = 100;
  const innerWidth = Math.max(1200, widthTwip - boxPad * 2);
  const useTable =
    data.licenseScopeFormat === "table" && (data.licenseScopeRows?.length ?? 0) > 0;

  const innerChildren: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 80 },
      children: [smallLabelRun("License Scope")],
    }),
    ...(useTable
      ? [buildLicenseScopeInnerTable(data.licenseScopeRows ?? [], innerWidth)]
      : multilineParagraphs(data.licenseScope.trim() || "—")),
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
  data: ManufacturingScopeDeclarationData,
  settings: PrintSettings,
): Promise<(Paragraph | Table)[]> {
  const sigName = data.signatoryName?.trim() || data.contactPerson.trim() || "—";
  const sigDesig = data.signatoryDesignation?.trim() || "—";
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
        new TextRun({
          text: "Name: ",
          bold: true,
          font: DOCX_FONT,
          size: 22,
        }),
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

async function buildManufacturingScopeDocx(
  data: ManufacturingScopeDeclarationData,
  settings: PrintSettings,
  assets?: ManufacturingScopePrintAssets,
): Promise<Document> {
  const letterheadSettings = manufacturingScopeLetterheadSettings(settings);
  const company = buildManufacturingScopeCompany(data, assets);
  const widthTwip = contentWidthTwip(letterheadSettings);
  const isRef = isStandardRef(data);
  const bisBranch = bisBranchLine(data);
  const inspectionDate = formatInspectionDate(data.inspectionDate);
  const dateLabel = inspectionDate || "_______________________";
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
          text: "DECLARATION REGARDING MANUFACTURING SCOPE",
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
                  children: [
                    bodyRun("Date: ", true),
                    bodyRun(dateLabel),
                  ],
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
      bodyRun("Declaration regarding manufacturing scope"),
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
      bodyRun(" hereby declare that our manufacturing scope for BIS certification"),
      ...(isRef ? [bodyRun(" under "), bodyRun(isRef, true)] : []),
      bodyRun(" is as follows:"),
    ]),
    new Paragraph({ spacing: { before: 80, after: 0 }, children: [] }),
    buildLicenseScopeBox(data, widthTwip),
    plainParagraph(
      "We further declare that the above information is true and correct to the best of our knowledge and belief. We undertake to inform BIS of any change in the manufacturing scope covered under the licence.",
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

/** Modern Office Open XML Word document (.docx). */
export async function downloadManufacturingScopeDeclarationWord(
  data: ManufacturingScopeDeclarationData,
  settings: PrintSettings,
  assets?: ManufacturingScopePrintAssets,
): Promise<void> {
  const doc = await buildManufacturingScopeDocx(data, settings, assets);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

/** Modern Office Open XML Excel workbook (.xlsx). */
export async function downloadManufacturingScopeDeclarationExcel(
  data: ManufacturingScopeDeclarationData,
): Promise<void> {
  const rows: (string | number)[][] = [];

  rows.push(["Declaration Regarding Manufacturing Scope"]);
  rows.push([]);
  rows.push(["Company Name", data.companyName]);
  rows.push(["Address", data.address]);
  rows.push(["City", data.city]);
  rows.push(["Contact Person", data.contactPerson]);
  rows.push(["Phone", data.phone]);
  rows.push(["Email", data.email]);
  rows.push(["GST Number", data.gstNumber]);
  rows.push([]);
  rows.push(["Indian Standard", data.isNumber]);
  rows.push(["IS Title", data.isTitle]);
  rows.push(["BIS Branch", bisBranchLine(data)]);
  rows.push(["Date", formatInspectionDate(data.inspectionDate) || "—"]);
  rows.push(["Application No.", formatApplicationNo(data.applicationNumber)]);
  rows.push([]);
  rows.push(["License Scope"]);

  if (data.licenseScopeFormat === "table" && data.licenseScopeRows?.length) {
    rows.push(["Component", "Value"]);
    for (const r of data.licenseScopeRows) {
      if (!r.component.trim() && !r.value.trim()) continue;
      rows.push([r.component, r.value]);
    }
  } else {
    rows.push([data.licenseScope.trim() || "—"]);
  }

  const buffer = await buildWorkbookBuffer([
    {
      name: "Manufacturing Scope",
      rows,
      cols: [{ wch: 28 }, { wch: 56 }],
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
