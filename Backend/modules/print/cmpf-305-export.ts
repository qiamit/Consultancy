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
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import { rowHasContent, type Cmpf305MachineryStored } from "@backend/modules/bis/cmpf-305";
import {
  buildCmpf305Company,
  cmpf305LetterheadSettings,
  formatCmpf305ApplicantAddress,
  type Cmpf305LetterData,
  type Cmpf305PrintAssets,
} from "@backend/modules/print/cmpf-305";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  loadImageFromUrl,
  pageMarginsFromSettings,
  pageSizeTwipFromSettings,
} from "@backend/modules/print/docx-letterhead";
import { formatDisplayDate } from "@backend/shared/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 20;
const DOCX_FOOTER_SIZE = 16; // 8pt — matches Print Preview declaration box

const THIN_BORDER = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: "111111",
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

function exportFilenameBase(data: Cmpf305LetterData): string {
  return safeFilePart(`CMPF305_${data.companyName || "Machinery"}`);
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

function bodyRun(text: string, bold = false, size = DOCX_BODY_SIZE): TextRun {
  return new TextRun({ text, font: DOCX_FONT, size, bold });
}

function plainParagraph(
  text: string,
  opts?: { before?: number; after?: number; bold?: boolean },
): Paragraph {
  return new Paragraph({
    spacing: { before: opts?.before ?? 0, after: opts?.after ?? 120 },
    children: [bodyRun(text, opts?.bold ?? false)],
  });
}

function footerRun(text: string, opts?: { bold?: boolean; italics?: boolean }): TextRun {
  return new TextRun({
    text,
    font: DOCX_FONT,
    size: DOCX_FOOTER_SIZE,
    bold: opts?.bold ?? false,
    italics: opts?.italics ?? false,
  });
}

function footerParagraph(
  text: string,
  opts?: {
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    before?: number;
    after?: number;
    bold?: boolean;
    italics?: boolean;
  },
): Paragraph {
  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.LEFT,
    spacing: { before: opts?.before ?? 0, after: opts?.after ?? 60, line: 240 },
    children: [footerRun(text, { bold: opts?.bold, italics: opts?.italics })],
  });
}

function visibleRows(rows: Cmpf305MachineryStored[]): Cmpf305MachineryStored[] {
  return rows.filter(rowHasContent);
}

/** Matches Print Preview: two-column bordered declaration + shaded signature bands. */
async function buildDeclarationSignatureBox(
  data: Cmpf305LetterData,
  widthTwip: number,
): Promise<(Paragraph | Table)[]> {
  const colW = Math.floor(widthTwip / 2);
  const firmName = data.firmRepName?.trim() || data.contactPerson?.trim() || "—";
  const firmDesig = data.firmRepDesignation?.trim() || "—";
  const bisName = data.inspectionOfficerName?.trim() || "----";
  const bisDesig = data.inspectionOfficerDesignation?.trim() || "----";
  const dateInsp = formatMetaDate(data.dateOfInspection);

  const sigImg = await loadImageFromUrl(data.signatureImageUrl?.trim() || null);

  const leftDecl: Paragraph[] = [
    footerParagraph(
      "I hereby declare that the machinery of which details are given overleaf is owned by me and are actually installed in the premises.*",
      { align: AlignmentType.BOTH, after: 80 },
    ),
    footerParagraph(
      "I also declare that in case of grant of licence, I will send prior intimation to BIS whenever any machinery is takenout of the premises of the firm due to any reason.",
      { align: AlignmentType.BOTH, after: 40 },
    ),
  ];

  const leftSig: Paragraph[] = [
    new Paragraph({ spacing: { before: 120, after: 40 }, children: [] }),
  ];
  if (sigImg) {
    leftSig.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 20 },
        children: [
          new ImageRun({
            type: sigImg.type,
            data: sigImg.data,
            transformation: { width: 100, height: 36 },
            altText: {
              title: "Signature",
              description: "Firm representative signature",
              name: "signature",
            },
          }),
        ],
      }),
    );
  }
  leftSig.push(
    footerParagraph("Sig. of Firm's Representative :-", { after: 40 }),
    footerParagraph(`Name :- ${firmName}`, { after: 20 }),
    footerParagraph(`Designation :- ${firmDesig}`, { after: 20 }),
    footerParagraph(`Date :- ${dateInsp}`, { after: 20 }),
  );

  const rightDecl: Paragraph[] = [
    footerParagraph(
      "I have checked and found that Machinery of which details are given overleaf was available during my Inspection",
      { align: AlignmentType.RIGHT, after: 40 },
    ),
  ];

  const rightSig: Paragraph[] = [
    new Paragraph({ spacing: { before: 120, after: 40 }, children: [] }),
    footerParagraph("Sig. of BIS Certification Officer :-", {
      align: AlignmentType.RIGHT,
      after: 40,
    }),
    footerParagraph(`Name :- ${bisName}`, { align: AlignmentType.RIGHT, after: 20 }),
    footerParagraph(`Designation :- ${bisDesig}`, {
      align: AlignmentType.RIGHT,
      after: 20,
    }),
    footerParagraph(`Date :- ${dateInsp}`, { align: AlignmentType.RIGHT, after: 20 }),
  ];

  function sideColumn(
    decl: Paragraph[],
    sig: Paragraph[],
    width: number,
  ): Table {
    return new Table({
      width: { size: width, type: WidthType.DXA },
      columnWidths: [width],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: width, type: WidthType.DXA },
              borders: NO_BORDERS,
              margins: { top: 60, bottom: 40, left: 80, right: 80 },
              children: decl,
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: width, type: WidthType.DXA },
              borders: NO_BORDERS,
              shading: { type: ShadingType.CLEAR, fill: "EEF2F7" },
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: sig,
            }),
          ],
        }),
      ],
    });
  }

  const leftInner = sideColumn(leftDecl, leftSig, colW);
  const rightInner = sideColumn(rightDecl, rightSig, widthTwip - colW);

  return [
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({
          text: "Note: Attach Extra Sheet, If Required",
          font: DOCX_FONT,
          size: 18,
          italics: true,
        }),
      ],
    }),
    new Table({
      width: { size: widthTwip, type: WidthType.DXA },
      columnWidths: [colW, widthTwip - colW],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: colW, type: WidthType.DXA },
              borders: CELL_BORDERS,
              verticalAlign: VerticalAlign.TOP,
              children: [leftInner],
            }),
            new TableCell({
              width: { size: widthTwip - colW, type: WidthType.DXA },
              borders: CELL_BORDERS,
              verticalAlign: VerticalAlign.TOP,
              children: [rightInner],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({
          text: "* If Any Part of the Manufacturing Activity is Out Sourced, Details of Machinery used for Out Sourced Activity shall be Indicated in a Separate form Along with Complete Address of the Out Sourced Premises",
          font: DOCX_FONT,
          size: 14,
          bold: true,
        }),
      ],
    }),
  ];
}

function metaCell(text: string, opts?: { bold?: boolean; width: number; fill?: string }): TableCell {
  return new TableCell({
    width: { size: opts!.width, type: WidthType.DXA },
    borders: CELL_BORDERS,
    shading: opts?.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill }
      : undefined,
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [bodyRun(text, opts?.bold ?? false, 18)],
      }),
    ],
  });
}

function buildHeaderGrid(data: Cmpf305LetterData, widthTwip: number): Table {
  const c1 = Math.round(widthTwip * 0.18);
  const c2 = Math.round(widthTwip * 0.32);
  const c3 = Math.round(widthTwip * 0.18);
  const c4 = widthTwip - c1 - c2 - c3;
  const addressLine = formatCmpf305ApplicantAddress(data.address);

  return new Table({
    width: { size: widthTwip, type: WidthType.DXA },
    columnWidths: [c1, c2, c3, c4],
    rows: [
      new TableRow({
        children: [
          metaCell("Applicant Name", { bold: true, width: c1, fill: "EEF2F7" }),
          new TableCell({
            columnSpan: 3,
            width: { size: c2 + c3 + c4, type: WidthType.DXA },
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [bodyRun(data.companyName || "—", true, 18)],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          metaCell("Applicant Address", { bold: true, width: c1, fill: "EEF2F7" }),
          new TableCell({
            columnSpan: 3,
            width: { size: c2 + c3 + c4, type: WidthType.DXA },
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [bodyRun(addressLine, true, 18)],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          metaCell("Application No.", { bold: true, width: c1, fill: "EEF2F7" }),
          metaCell(formatApplicationNo(data.applicationNumber), {
            bold: true,
            width: c2,
          }),
          metaCell("Date of Application", { bold: true, width: c3, fill: "EEF2F7" }),
          metaCell(formatMetaDate(data.dateOfApplication), { bold: true, width: c4 }),
        ],
      }),
      new TableRow({
        children: [
          metaCell("IS Code", { bold: true, width: c1, fill: "EEF2F7" }),
          metaCell(data.isNumber || "—", { bold: true, width: c2 }),
          metaCell("Date of Inspection", { bold: true, width: c3, fill: "EEF2F7" }),
          metaCell(formatMetaDate(data.dateOfInspection), { bold: true, width: c4 }),
        ],
      }),
    ],
  });
}

function machineryTableSection(
  rows: Cmpf305MachineryStored[],
  widthTwip: number,
): (Paragraph | Table)[] {
  const visible = visibleRows(rows);
  if (visible.length === 0) {
    return [plainParagraph("No plant & machinery details entered yet.")];
  }

  const widths = [
    Math.round(widthTwip * 0.08),
    Math.round(widthTwip * 0.28),
    Math.round(widthTwip * 0.16),
    Math.round(widthTwip * 0.2),
    Math.round(widthTwip * 0.1),
  ];
  widths.push(widthTwip - widths.reduce((a, b) => a + b, 0));

  const headers: { label: string; lines?: string[] }[] = [
    { label: "Sr No.", lines: ["Sr", "No"] },
    { label: "Machinery Name" },
    { label: "Make" },
    { label: "Production Capacity / Day" },
    { label: "Number" },
    { label: "Remarks" },
  ];

  const headerCells = headers.map(
    (col, i) =>
      new TableCell({
        width: { size: widths[i]!, type: WidthType.DXA },
        borders: CELL_BORDERS,
        shading: { type: ShadingType.CLEAR, fill: "EEF2F7" },
        children: (col.lines ?? [col.label]).map(
          (line) =>
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
              children: [bodyRun(line, true, 16)],
            }),
        ),
      }),
  );

  const dataRows = visible.map(
    (row, i) =>
      new TableRow({
        children: [
          String(i + 1),
          row.machinery_name.trim() || "—",
          row.make.trim() || "—",
          row.production_capacity_per_day.trim() || "—",
          row.number.trim() || "—",
          row.remarks.trim() || "—",
        ].map(
          (text, colIndex) =>
            new TableCell({
              width: { size: widths[colIndex]!, type: WidthType.DXA },
              borders: CELL_BORDERS,
              children: [
                new Paragraph({
                  alignment: colIndex === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [bodyRun(text, false, 18)],
                }),
              ],
            }),
        ),
      }),
  );

  return [
    new Table({
      width: { size: widthTwip, type: WidthType.DXA },
      columnWidths: widths,
      rows: [new TableRow({ children: headerCells }), ...dataRows],
    }),
  ];
}

async function buildCmpf305Docx(
  data: Cmpf305LetterData,
  settings: PrintSettings,
  assets?: Cmpf305PrintAssets,
): Promise<Document> {
  const letterheadSettings = cmpf305LetterheadSettings(settings);
  const company = buildCmpf305Company(data, assets);
  const widthTwip = contentWidthTwip(letterheadSettings);
  const bisLine = `${data.bisBranchName.trim() || "________________"}, ${data.bisBranchState.trim() || "________________"}, INDIA`;

  const children: (Paragraph | Table)[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [bodyRun("Form - I", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "111111", space: 1 },
      },
      children: [bodyRun("Declaration Regarding Manufacturing Machinery", true, 28)],
    }),
    buildHeaderGrid(data, widthTwip),
    plainParagraph("To", { before: 160, after: 40 }),
    plainParagraph("The Director & Head", { after: 20 }),
    plainParagraph("Bureau of Indian Standard", { after: 20 }),
    plainParagraph(bisLine, { after: 160 }),
    ...machineryTableSection(data.rows, widthTwip),
    ...(await buildDeclarationSignatureBox(data, widthTwip)),
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

export async function downloadCmpf305Word(
  data: Cmpf305LetterData,
  settings: PrintSettings,
  assets?: Cmpf305PrintAssets,
): Promise<void> {
  const doc = await buildCmpf305Docx(data, settings, assets);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadCmpf305Excel(data: Cmpf305LetterData): Promise<void> {
  const visible = visibleRows(data.rows);
  const rows: (string | number)[][] = [
    ["Declaration Regarding Manufacturing Machinery (Form - I / CMPF 305)"],
    [],
    ["Applicant Name", data.companyName],
    ["Applicant Address", formatCmpf305ApplicantAddress(data.address)],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["Date of Application", formatMetaDate(data.dateOfApplication)],
    ["IS Code", data.isNumber || "—"],
    ["Date of Inspection", formatMetaDate(data.dateOfInspection)],
    [],
    ["Sr No.", "Machinery Name", "Make", "Production Capacity / Day", "Number", "Remarks"],
  ];

  if (visible.length === 0) {
    rows.push(["No plant & machinery details entered yet."]);
  } else {
    visible.forEach((row, i) => {
      rows.push([
        i + 1,
        row.machinery_name,
        row.make,
        row.production_capacity_per_day,
        row.number,
        row.remarks,
      ]);
    });
  }

  const buffer = await buildWorkbookBuffer([
    {
      name: "CMPF 305",
      rows,
      cols: [
        { wch: 8 },
        { wch: 28 },
        { wch: 16 },
        { wch: 24 },
        { wch: 10 },
        { wch: 20 },
      ],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}

export async function downloadCmpf305ImportTemplate(): Promise<void> {
  const rows: (string | number)[][] = [
    ["Machinery Name", "Make", "Production Capacity / Day", "Number", "Remarks"],
    ["Example Mixer", "ABC Make", "100 MT", "2 Nos", "Working condition"],
    ["Weighing Scale", "FIE", "—", "1 Nos", ""],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Plant Machinery",
      rows,
      cols: [
        { wch: 32 },
        { wch: 14 },
        { wch: 24 },
        { wch: 10 },
        { wch: 20 },
      ],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "CMPF305_Import_Template.xlsx",
  );
}
