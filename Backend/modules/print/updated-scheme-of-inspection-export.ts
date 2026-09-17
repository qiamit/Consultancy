import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import {
  buildUpdatedSchemeOfInspectionCompany,
  updatedSchemeOfInspectionLetterheadSettings,
  type UpdatedSchemeOfInspectionLetterData,
  type UpdatedSchemeOfInspectionPrintAssets,
} from "@backend/modules/print/updated-scheme-of-inspection";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  loadImageFromUrl,
  pageMarginsFromSettings,
  pageSizeTwipFromSettings,
} from "@backend/modules/print/docx-letterhead";
import type { SitTestRow } from "@backend/modules/bis/updated-scheme-of-inspection";
import {
  USIT_ANNEX_SECTIONS,
  USIT_NOTE_SECTIONS,
} from "@backend/modules/bis/updated-scheme-of-inspection";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";

const DOCX_FONT = "Times New Roman";

/** docx uses half-points (11pt → 22). */
function fontHalfPoints(settings: PrintSettings): number {
  const px = settings.font_size || 11;
  return Math.max(16, Math.round(px * 2));
}

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: UpdatedSchemeOfInspectionLetterData): string {
  return safeFilePart(
    `Updated_SIT_${data.isNumber || data.companyName || "Scheme"}`,
  );
}

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function formatBisBranchLine(
  branchName: string,
  state: string,
  country: string,
): string {
  return [
    branchName.trim() || "________________",
    state.trim() || "________________",
    country.trim() || "India",
  ].join(", ");
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function makeBodyRun(size: number) {
  return (text: string, bold = false): TextRun =>
    new TextRun({ text, font: DOCX_FONT, size, bold });
}

function makePlainParagraph(size: number) {
  const bodyRun = makeBodyRun(size);
  return (
    text: string,
    bold = false,
    alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH,
  ): Paragraph =>
    new Paragraph({
      alignment,
      spacing: { after: 100 },
      children: [bodyRun(text, bold)],
    });
}

function normalizeHeaderLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripLeadingSectionHeader(text: string, header: string): string {
  const raw = text.trim();
  if (!raw || !header.trim()) return raw;
  const m = raw.match(/^(.{1,80}?)\s*[-–—:]\s+/);
  if (m && normalizeHeaderLabel(m[1]) === normalizeHeaderLabel(header)) {
    return raw.slice(m[0].length).trim();
  }
  const noteLike = raw.match(/^(note[\s-]*\d+)\s*[-–—:]\s+/i);
  if (
    noteLike &&
    normalizeHeaderLabel(noteLike[1]) === normalizeHeaderLabel(header)
  ) {
    return raw.slice(noteLike[0].length).trim();
  }
  return raw;
}

function noBorder() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
}

function metaHeaderTable(
  data: UpdatedSchemeOfInspectionLetterData,
  size: number,
): Table {
  const bodyRun = makeBodyRun(size);
  const doc = data.document;
  const branchName = (data.bisBranchName ?? "").trim() || "Raipur Branch Office";
  const bisBranchLine = formatBisBranchLine(
    branchName,
    data.bisBranchState ?? "",
    data.bisBranchCountry ?? "India",
  );
  const dateApp =
    formatDisplayDate(data.dateOfApplication, "") || "________________";
  const appNo = formatApplicationNo(data.applicationNumber);
  const pmNo = doc.pm_reference.trim() || "PM/ IS __________/1/__________";

  const leftLines = [
    "To",
    "The Director & Head",
    "Bureau of Indian Standards",
    bisBranchLine,
  ];
  const rightLines = [
    `Date of Application: ${dateApp}`,
    `Application Number: ${appNo}`,
    `PM Number: ${pmNo}`,
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: noBorder(),
            children: leftLines.map(
              (line, i) =>
                new Paragraph({
                  spacing: { after: i === leftLines.length - 1 ? 120 : 40 },
                  children: [bodyRun(line)],
                }),
            ),
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: noBorder(),
            children: rightLines.map(
              (line, i) =>
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: i === rightLines.length - 1 ? 120 : 40 },
                  children: [bodyRun(line, true)],
                }),
            ),
          }),
        ],
      }),
    ],
  });
}

function annexSectionParagraphs(
  header: string,
  text: string,
  size: number,
  index?: number,
): Paragraph[] {
  const bodyRun = makeBodyRun(size);
  const plainParagraph = makePlainParagraph(size);
  const body = stripLeadingSectionHeader(text, header);
  if (!header.trim() && !body.trim()) return [];
  const blocks: Paragraph[] = [];
  if (header.trim()) {
    const label =
      index != null
        ? `${index}. ${header.trim().toUpperCase()}`
        : header.trim().toUpperCase();
    blocks.push(
      new Paragraph({
        spacing: { before: 140, after: 40 },
        children: [bodyRun(label, true)],
      }),
    );
  }
  if (body.trim()) {
    blocks.push(plainParagraph(body));
  }
  return blocks;
}

async function signatoryBlocks(
  data: UpdatedSchemeOfInspectionLetterData,
  size: number,
): Promise<Paragraph[]> {
  const bodyRun = makeBodyRun(size);
  const sigName =
    data.signatoryName?.trim() || data.contactPerson?.trim() || "—";
  const sigDesig = data.signatoryDesignation?.trim() || "—";
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
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: sigImg ? 40 : 280, after: 0 },
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
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 80 },
      children: [bodyRun("Authorized Signatory", true)],
    }),
  );
  return out;
}

function tableCell(
  text: string,
  size: number,
  opts?: { bold?: boolean; center?: boolean; width?: number },
): TableCell {
  const bodyRun = makeBodyRun(size);
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    width: opts?.width
      ? { size: opts.width, type: WidthType.DXA }
      : undefined,
    children: [
      new Paragraph({
        alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [bodyRun(text, opts?.bold)],
      }),
    ],
  });
}

function sitRowToCells(row: SitTestRow, size: number, colWidths: number[]): TableRow {
  if (row.row_kind === "section") {
    return new TableRow({
      children: [
        new TableCell({
          columnSpan: 7,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [makeBodyRun(size)(row.requirement || row.clause_no, true)],
            }),
          ],
        }),
      ],
    });
  }
  if (row.row_kind === "group") {
    return new TableRow({
      children: [
        tableCell(row.clause_no, size, { center: true, width: colWidths[0] }),
        new TableCell({
          columnSpan: 6,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: [makeBodyRun(size)(row.requirement, true)],
            }),
          ],
        }),
      ],
    });
  }

  return new TableRow({
    children: [
      tableCell(row.clause_no, size, { center: true, width: colWidths[0] }),
      tableCell(row.requirement, size, { width: colWidths[1] }),
      tableCell(row.test_methods_ref, size, { center: true, width: colWidths[2] }),
      tableCell(row.equipment_req, size, { center: true, width: colWidths[3] }),
      tableCell(row.sample_count, size, { center: true, width: colWidths[4] }),
      tableCell(row.frequency, size, { center: true, width: colWidths[5] }),
      tableCell(row.remarks, size, { width: colWidths[6] }),
    ],
  });
}

function buildSitTable(
  rows: SitTestRow[],
  size: number,
  contentWidth: number,
): Table {
  // Match print colgroup: 5%, 24%, 14%, 5%, 9%, 14%, 29%
  const percents = [5, 24, 14, 5, 9, 14, 29];
  const colWidths = percents.map((p) => Math.round((contentWidth * p) / 100));
  const headerSize = Math.max(16, size - 2);
  const bodyRun = makeBodyRun(headerSize);
  const th = (text: string, opts?: { span?: number; width?: number }) =>
    new TableCell({
      columnSpan: opts?.span,
      verticalAlign: VerticalAlign.CENTER,
      width: opts?.width
        ? { size: opts.width, type: WidthType.DXA }
        : undefined,
      shading: { fill: "EEF2F7" },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [bodyRun(text, true)],
        }),
      ],
    });

  const detailsW = colWidths[0]! + colWidths[1]! + colWidths[2]!;
  const levelsW =
    colWidths[3]! + colWidths[4]! + colWidths[5]! + colWidths[6]!;

  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          th("(1) Test Details", { span: 3, width: detailsW }),
          th(
            "(2) Test equipment requirement — R: Required (or) S: Subcontracting permitted  |  (3) Levels of Control",
            { span: 4, width: levelsW },
          ),
        ],
      }),
      new TableRow({
        children: [
          th("Cl.", { width: colWidths[0] }),
          th("Requirement", { width: colWidths[1] }),
          th("Test Methods Reference", { width: colWidths[2] }),
          th("R/S", { width: colWidths[3] }),
          th("No. of Sample", { width: colWidths[4] }),
          th("Frequency", { width: colWidths[5] }),
          th("Remarks", { width: colWidths[6] }),
        ],
      }),
      ...rows.map((row) => sitRowToCells(row, size, colWidths)),
    ],
  });
}

function pageFooter(size: number): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: "Page ",
            font: DOCX_FONT,
            size: Math.max(16, size - 2),
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: DOCX_FONT,
            size: Math.max(16, size - 2),
          }),
          new TextRun({
            text: " of ",
            font: DOCX_FONT,
            size: Math.max(16, size - 2),
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: DOCX_FONT,
            size: Math.max(16, size - 2),
          }),
        ],
      }),
    ],
  });
}

async function buildUpdatedSitDocx(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
  assets?: UpdatedSchemeOfInspectionPrintAssets,
): Promise<Document> {
  const letterheadSettings = updatedSchemeOfInspectionLetterheadSettings({
    ...settings,
    orientation: "portrait",
  });
  const company = buildUpdatedSchemeOfInspectionCompany(data, assets);
  const doc = data.document;
  const letterheadBlocks = await buildNoLogoLetterheadBlocks(
    company,
    letterheadSettings,
  );
  const size = fontHalfPoints(letterheadSettings);
  const bodyRun = makeBodyRun(size);
  const contentW = contentWidthTwip(letterheadSettings);
  const titleSize = size + 4;
  const subtitleSize = size + 2;

  const page1: (Paragraph | Table)[] = [
    ...letterheadBlocks,
    metaHeaderTable(data, size),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "ANNEX C",
          font: DOCX_FONT,
          size: titleSize,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: "Scheme of Inspection and Testing",
          font: DOCX_FONT,
          size: subtitleSize,
          bold: true,
          underline: {},
        }),
      ],
    }),
    ...USIT_ANNEX_SECTIONS.flatMap((section, i) =>
      annexSectionParagraphs(section.header, doc[section.key] ?? "", size, i + 1),
    ),
    ...(doc.annex_extra_rows ?? []).flatMap((row, i) =>
      annexSectionParagraphs(
        row.header,
        row.text,
        size,
        USIT_ANNEX_SECTIONS.length + i + 1,
      ),
    ),
    ...(await signatoryBlocks(data, size)),
  ];

  const page2: (Paragraph | Table)[] = [
    ...letterheadBlocks,
    metaHeaderTable(data, size),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 80 },
      children: [bodyRun("TABLE 1", true)],
    }),
    buildSitTable(doc.test_rows, size, contentW),
    ...USIT_NOTE_SECTIONS.flatMap((section) =>
      annexSectionParagraphs(section.header, doc[section.key] ?? "", size),
    ),
    ...(doc.note_extra_rows ?? []).flatMap((row) =>
      annexSectionParagraphs(row.header, row.text, size),
    ),
    ...(await signatoryBlocks(data, size)),
    ...(await buildLetterheadLowerParagraphs(letterheadSettings, assets)),
  ];

  const footer = pageFooter(size);
  const pageProps = {
    size: pageSizeTwipFromSettings(letterheadSettings),
    margin: pageMarginsFromSettings(letterheadSettings),
  };

  return new Document({
    sections: [
      {
        properties: { page: pageProps },
        footers: { default: footer },
        children: page1,
      },
      {
        properties: { page: pageProps },
        footers: { default: footer },
        children: page2,
      },
    ],
  });
}

export async function downloadUpdatedSchemeOfInspectionWord(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
  assets?: UpdatedSchemeOfInspectionPrintAssets,
): Promise<void> {
  const docx = await buildUpdatedSitDocx(data, settings, assets);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadUpdatedSchemeOfInspectionExcel(
  data: UpdatedSchemeOfInspectionLetterData,
): Promise<void> {
  const doc = data.document;
  const rows: (string | number)[][] = [
    ["Updated Scheme of Inspection & Testing"],
    [doc.pm_reference],
    ["ANNEX C — Scheme of Inspection and Testing"],
    [],
    ["Annex Text"],
    ["Laboratory", doc.laboratory_text],
    ["Test Records", doc.test_records_text],
    ["Labelling & Marking", doc.labelling_marking_text],
    ["Control Unit", doc.control_unit_text],
    ["Levels of Control", doc.levels_of_control_text],
    ["Standard Mark", doc.standard_mark_text],
    ["Rejections", doc.rejections_text],
    ...(doc.annex_extra_rows ?? []).map((row) => [row.header || "Extra", row.text]),
    [],
    ["TABLE 1"],
    [
      "Cl.",
      "Requirement",
      "Test Methods Ref.",
      "Equip. R/S",
      "No. of Sample",
      "Frequency",
      "Remarks",
    ],
  ];

  for (const row of doc.test_rows) {
    rows.push([
      row.clause_no,
      row.requirement,
      row.test_methods_ref,
      row.equipment_req,
      row.sample_count,
      row.frequency,
      row.remarks,
    ]);
  }

  rows.push(
    [],
    [doc.note_1],
    [doc.note_2],
    [doc.note_3],
    ...(doc.note_extra_rows ?? []).map((row) => [
      row.header || "Note",
      row.text,
    ]),
  );

  const buffer = await buildWorkbookBuffer([
    { name: "Updated SIT", rows },
  ]);
  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}
