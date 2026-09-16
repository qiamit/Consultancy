import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  PageBreak,
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
import {
  CMPF306_SEPARATE_SHEET_LABEL,
  equipmentRowHasContent,
  type Cmpf306EquipmentStored,
} from "@backend/modules/bis/cmpf-306";
import {
  buildCmpf306Company,
  cmpf306LetterheadSettings,
  type Cmpf306LetterData,
  type Cmpf306PrintAssets,
} from "@backend/modules/print/cmpf-306";
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
const DOCX_FOOTER_SIZE = 19; // ~9.5pt — matches Print Preview declaration box

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

function exportFilenameBase(data: Cmpf306LetterData): string {
  return safeFilePart(`CMPF306_${data.companyName || "Testing_Equipments"}`);
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

function formatApplicantAddress(data: Cmpf306LetterData): string {
  const parts = [data.address.trim(), data.city.trim(), data.bisBranchState.trim()].filter(
    Boolean,
  );
  const line = parts.length > 0 ? parts.join(", ") : "______________________________";
  return `${line}, INDIA`;
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

function metaCell(text: string, opts: { bold?: boolean; width: number; fill?: string }): TableCell {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    borders: CELL_BORDERS,
    shading: opts.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill }
      : undefined,
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [bodyRun(text, opts.bold ?? false, 18)],
      }),
    ],
  });
}

function buildApplicantHeaderGrid(data: Cmpf306LetterData, widthTwip: number): Table {
  const c1 = Math.round(widthTwip * 0.18);
  const c2 = Math.round(widthTwip * 0.32);
  const c3 = Math.round(widthTwip * 0.18);
  const c4 = widthTwip - c1 - c2 - c3;
  const addressLine = formatApplicantAddress(data);

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
    ],
  });
}

function buildApplicationMetaGrid(data: Cmpf306LetterData, widthTwip: number): Table {
  const c1 = Math.round(widthTwip * 0.18);
  const c2 = Math.round(widthTwip * 0.32);
  const c3 = Math.round(widthTwip * 0.18);
  const c4 = widthTwip - c1 - c2 - c3;

  return new Table({
    width: { size: widthTwip, type: WidthType.DXA },
    columnWidths: [c1, c2, c3, c4],
    rows: [
      new TableRow({
        children: [
          metaCell("Application No.", { bold: true, width: c1, fill: "EEF2F7" }),
          metaCell(formatApplicationNo(data.applicationNumber), { bold: true, width: c2 }),
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

function equipmentColumnWidths(widthTwip: number): number[] {
  const weights = [0.7, 2.4, 1, 1, 1, 1.3, 0.9, 0.9];
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.max(350, Math.round((w / sum) * widthTwip)));
  const diff = widthTwip - widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] = Math.max(350, (widths[widths.length - 1] ?? 350) + diff);
  return widths;
}

function equipmentHeaderCells(widths: number[]): TableCell[] {
  const headers: { label: string; lines?: string[] }[] = [
    { label: "Sr No.", lines: ["Sr", "No"] },
    { label: "Test Equipments / Chemicals" },
    { label: "Make" },
    { label: "Least Count" },
    { label: "Range" },
    { label: "Calibration Status" },
    { label: "Clause No." },
    { label: "Quantity" },
  ];

  return headers.map(
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
              children: [bodyRun(line, true, 14)],
            }),
        ),
      }),
  );
}

function dummyTestingEquipmentTable(widthTwip: number): Table {
  const widths = equipmentColumnWidths(widthTwip);

  function emptyDataRow(sr: number): TableRow {
    return new TableRow({
      children: [String(sr), "", "", "", "", "", "", ""].map(
        (text, colIndex) =>
          new TableCell({
            width: { size: widths[colIndex]!, type: WidthType.DXA },
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [bodyRun(text || " ", false, 16)],
              }),
            ],
          }),
      ),
    });
  }

  const mergedRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 8,
        width: { size: widthTwip, type: WidthType.DXA },
        borders: CELL_BORDERS,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [bodyRun("(List of Testing Equipments is Attached)", true, 18)],
          }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: widthTwip, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: equipmentHeaderCells(widths) }),
      emptyDataRow(1),
      emptyDataRow(2),
      mergedRow,
      emptyDataRow(4),
      emptyDataRow(5),
    ],
  });
}

function equipmentTableSection(
  rows: Cmpf306EquipmentStored[],
  separateSheetEnclosed: boolean,
  widthTwip: number,
): (Paragraph | Table)[] {
  const widths = equipmentColumnWidths(widthTwip);
  const visible = rows.filter(equipmentRowHasContent);

  const dataRows: TableRow[] = [];

  if (separateSheetEnclosed) {
    dataRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: widths[0]!, type: WidthType.DXA },
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [bodyRun("1", false, 16)],
              }),
            ],
          }),
          new TableCell({
            columnSpan: 7,
            width: { size: widthTwip - widths[0]!, type: WidthType.DXA },
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [bodyRun(CMPF306_SEPARATE_SHEET_LABEL, true, 16)],
              }),
            ],
          }),
        ],
      }),
    );
  }

  if (visible.length === 0 && !separateSheetEnclosed) {
    dataRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 8,
            width: { size: widthTwip, type: WidthType.DXA },
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [bodyRun("No testing equipment entered yet.")],
              }),
            ],
          }),
        ],
      }),
    );
  } else {
    const srOffset = separateSheetEnclosed ? 1 : 0;
    visible.forEach((row, i) => {
      dataRows.push(
        new TableRow({
          children: [
            String(i + 1 + srOffset),
            row.equipment_name.trim() || "—",
            row.make.trim() || "—",
            row.least_count.trim() || "—",
            row.range.trim() || "—",
            row.calibration_details.trim() || "—",
            row.clause_number.trim() || "—",
            row.quantity.trim() || "—",
          ].map(
            (text, colIndex) =>
              new TableCell({
                width: { size: widths[colIndex]!, type: WidthType.DXA },
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    alignment:
                      colIndex === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                    spacing: { after: 0 },
                    children: [bodyRun(text, false, 16)],
                  }),
                ],
              }),
          ),
        }),
      );
    });
  }

  return [
    new Table({
      width: { size: widthTwip, type: WidthType.DXA },
      columnWidths: widths,
      rows: [new TableRow({ children: equipmentHeaderCells(widths) }), ...dataRows],
    }),
  ];
}

/** Matches Print Preview: two-column bordered declaration + shaded signature bands. */
async function buildDeclarationSignatureBox(
  data: Cmpf306LetterData,
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
      "I hereby declare that the Equipments of which details are given overleaf is owned by me and are actually installed in the premises.*",
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
      "I have checked and found that Equipments of which details are given overleaf was available during my Inspection",
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

  function sideColumn(decl: Paragraph[], sig: Paragraph[], width: number): Table {
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
          text: "* If Any Part of the Testing Activity is Out Sourced, Details of Test Equipments used for Out Sourced Activity shall be Indicated in a Saparate form Along with Complete Address of the Out Sourced Premises",
          font: DOCX_FONT,
          size: 14,
          bold: true,
        }),
      ],
    }),
  ];
}

async function buildTmStyleSignatoryParagraphs(
  data: Cmpf306LetterData,
): Promise<Paragraph[]> {
  const sigName = data.firmRepName?.trim() || data.contactPerson?.trim() || "—";
  const sigDesig = data.firmRepDesignation?.trim() || "—";
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 280, after: 0 },
      children: [bodyRun(`For ${data.companyName || "—"}`, true)],
    }),
  ];

  const sigImg = await loadImageFromUrl(data.signatureImageUrl?.trim() || null);
  if (sigImg) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 40 },
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
    out.push(new Paragraph({ spacing: { before: 280, after: 0 }, children: [] }));
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8", space: 1 },
      },
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Name: ${sigName}`, false, 18)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [bodyRun(`Designation: ${sigDesig}`, false, 18)],
    }),
  );

  return out;
}

async function buildCmpf306Docx(
  data: Cmpf306LetterData,
  settings: PrintSettings,
  assets?: Cmpf306PrintAssets,
): Promise<Document> {
  const letterheadSettings = cmpf306LetterheadSettings(settings);
  const company = buildCmpf306Company(data, assets);
  const widthTwip = contentWidthTwip(letterheadSettings);
  const bisLine = `${data.bisBranchName.trim() || "________________"}, ${data.bisBranchState.trim() || "________________"}, INDIA`;

  const children: (Paragraph | Table)[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [bodyRun("Form - II", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "111111", space: 1 },
      },
      children: [bodyRun("Declaration Regarding Testing Equipments", true, 28)],
    }),
    buildApplicantHeaderGrid(data, widthTwip),
    buildApplicationMetaGrid(data, widthTwip),
    plainParagraph("To", { before: 160, after: 40 }),
    plainParagraph("The Director & Head", { after: 20 }),
    plainParagraph("Bureau of Indian Standard", { after: 20 }),
    plainParagraph(bisLine, { after: 80 }),
    dummyTestingEquipmentTable(widthTwip),
    ...(await buildDeclarationSignatureBox(data, widthTwip)),
    // Page 2+ — letterhead + Application No/IS Code + equipment table.
    new Paragraph({ spacing: { after: 0 }, children: [new PageBreak()] }),
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    buildApplicationMetaGrid(data, widthTwip),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    ...equipmentTableSection(
      data.document.equipment,
      data.document.separate_sheet_enclosed,
      widthTwip,
    ),
    ...(await buildTmStyleSignatoryParagraphs(data)),
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

export async function downloadCmpf306Word(
  data: Cmpf306LetterData,
  settings: PrintSettings,
  assets?: Cmpf306PrintAssets,
): Promise<void> {
  const doc = await buildCmpf306Docx(data, settings, assets);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadCmpf306Excel(data: Cmpf306LetterData): Promise<void> {
  const visible = data.document.equipment.filter(equipmentRowHasContent);
  const rows: (string | number)[][] = [
    ["Declaration Regarding Testing Equipments (Form - II / CMPF 306)"],
    [],
    ["Applicant Name", data.companyName],
    ["Applicant Address", formatApplicantAddress(data)],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["Date of Application", formatMetaDate(data.dateOfApplication)],
    ["IS Code", data.isNumber || "—"],
    ["Date of Inspection", formatMetaDate(data.dateOfInspection)],
    [],
    [
      "Sr No.",
      "Test Equipments / Chemicals",
      "Make",
      "Least Count",
      "Range",
      "Calibration Status",
      "Clause No.",
      "Quantity",
    ],
  ];

  if (data.document.separate_sheet_enclosed) {
    rows.push(["", CMPF306_SEPARATE_SHEET_LABEL]);
  }

  if (visible.length === 0) {
    rows.push(["No testing equipment entered yet."]);
  } else {
    visible.forEach((row, i) => {
      rows.push([
        i + 1,
        row.equipment_name,
        row.make,
        row.least_count,
        row.range,
        row.calibration_details,
        row.clause_number,
        row.quantity,
      ]);
    });
  }

  const buffer = await buildWorkbookBuffer([
    {
      name: "CMPF 306",
      rows,
      cols: [
        { wch: 8 },
        { wch: 32 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
      ],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}

export async function downloadCmpf306ImportTemplate(): Promise<void> {
  const rows: (string | number)[][] = [
    [
      "Test Equipment Name",
      "Make",
      "Least Count",
      "Range",
      "Calibration",
      "Clause No.",
      "Quantity",
    ],
    [
      "Universal Testing Machine with Bending Attachment",
      "ABC Make",
      "0.01 kN",
      "0–100 kN",
      "Yes",
      "9.3",
      "1 Nos",
    ],
    [
      "Vernier Caliper",
      "Mitutoyo",
      "0.01 mm",
      "0–150 mm",
      "Yes",
      "9.3",
      "1 Nos",
    ],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Test Equipment",
      rows,
      cols: [
        { wch: 36 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
      ],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "CMPF306_Import_Template.xlsx",
  );
}
