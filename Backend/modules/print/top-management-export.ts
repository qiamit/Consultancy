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
  convertMillimetersToTwip,
} from "docx";
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import {
  buildTopManagementCompany,
  topManagementLetterheadSettings,
  type TopManagementLetterData,
  type TopManagementPrintAssets,
} from "@backend/modules/print/top-management";
import {
  normalizeTopManagementTableColumns,
  TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS,
  topManagementColumnWidthPct,
  type TopManagementTableColumnKey,
} from "@backend/modules/print/top-management-table-columns";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { rowHasContent } from "@backend/modules/bis/top-management";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 24; // 12pt — matches preview body
const DOCX_TABLE_SIZE = 20; // 10pt — matches preview th
const DOCX_TABLE_BODY_SIZE = 22; // 11pt — matches preview td
const PAGE_WIDTH_TWIP = 11906; // A4 width ≈ 210mm
const PAGE_HEIGHT_TWIP = 16838; // A4 height ≈ 297mm

function pageMarginsFromSettings(settings: PrintSettings) {
  return {
    top: convertMillimetersToTwip(settings.margin_top),
    left: convertMillimetersToTwip(settings.margin_left),
    bottom: convertMillimetersToTwip(settings.margin_bottom),
    right: convertMillimetersToTwip(settings.margin_right),
  };
}

function contentWidthTwip(settings: PrintSettings): number {
  const m = pageMarginsFromSettings(settings);
  return PAGE_WIDTH_TWIP - m.left - m.right;
}

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

function bisBranchLine(data: TopManagementLetterData): string {
  return [
    data.bisBranchName.trim() || "________________",
    data.bisBranchState.trim() || "________________",
    data.bisBranchCountry.trim() || "India",
  ].join(", ");
}

function isStandardRef(data: TopManagementLetterData): string {
  const num = (data.isNumber ?? "").trim();
  const title = (data.isTitle ?? "").trim();
  if (num && title) return `${num} — ${title}`;
  if (num) return num;
  if (title) return title;
  return "";
}

function visibleRows(rows: TopManagementStored[]): TopManagementStored[] {
  return rows.filter(rowHasContent);
}

function cellPlainText(
  key: TopManagementTableColumnKey,
  row: TopManagementStored,
  rowIndex: number,
): string {
  switch (key) {
    case "sr_no":
      return String(rowIndex + 1).padStart(2, "0");
    case "person_name":
      return row.person_name.trim() || "—";
    case "designation":
      return row.designation.trim() || "—";
    case "email":
      return row.email.trim() || "—";
    case "mobile":
      return row.mobile.trim() || "—";
    default:
      return "—";
  }
}

function exportFilenameBase(data: TopManagementLetterData): string {
  const coPart = safeFilePart(data.companyName || "Company");
  const isPart = safeFilePart(data.isNumber || "IS");
  return `Top_Management_${coPart}_${isPart}`;
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

function parseDataUrlImage(
  dataUrl: string,
): { type: "png" | "jpg"; data: Uint8Array } | null {
  const trimmed = dataUrl.trim();
  const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/i.exec(trimmed);
  if (!match) return null;
  const rawType = match[1]!.toLowerCase();
  const type = rawType === "png" ? "png" : "jpg";
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { type, data: bytes };
}

function twipToPx(twip: number): number {
  return Math.max(1, Math.round(twip / 15));
}

function primaryColorHex(settings: PrintSettings): string {
  const raw = (settings.primary_color || "#1e3a8a").replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(raw) ? raw.toUpperCase() : "1E3A8A";
}

async function loadImageFromUrl(
  url: string | null | undefined,
): Promise<{ type: "png" | "jpg"; data: Uint8Array } | null> {
  const src = (url ?? "").trim();
  if (!src) return null;
  const asData = parseDataUrlImage(src);
  if (asData) return asData;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const lower = src.toLowerCase();
    const type: "png" | "jpg" =
      ct.includes("png") || lower.includes(".png") ? "png" : "jpg";
    return { type, data: bytes };
  } catch {
    return null;
  }
}

function letterheadBottomRule(color: string): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 18, color },
    },
    children: [],
  });
}

function mutedRun(text: string, size = 18, italic = false): TextRun {
  return new TextRun({
    text,
    font: DOCX_FONT,
    size,
    italics: italic,
    color: "555555",
  });
}

function buildLetterheadContactLine(
  company: PrintCompanyInfo,
  settings: PrintSettings,
): string {
  const parts: string[] = [];
  if (settings.letterhead_show_gst && company.gst_number.trim()) {
    parts.push(`GST: ${company.gst_number.trim()}`);
  }
  if (settings.letterhead_show_contact && company.email.trim()) {
    parts.push(`Email: ${company.email.trim()}`);
  }
  if (settings.letterhead_show_contact && company.phone.trim()) {
    parts.push(`Tel: ${company.phone.trim()}`);
  }
  return parts.join("  |  ");
}

function companyAddressLine(company: PrintCompanyInfo): string {
  return [company.address, company.city, company.state, company.pin_code, company.country]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

async function buildLetterheadBlocks(
  data: TopManagementLetterData,
  settings: PrintSettings,
  assets?: TopManagementPrintAssets,
): Promise<(Paragraph | Table)[]> {
  const letterheadSettings = topManagementLetterheadSettings(settings);
  if (!letterheadSettings.show_letterhead) return [];

  const company = buildTopManagementCompany(data, assets);
  const color = primaryColorHex(letterheadSettings);
  const width = contentWidthTwip(letterheadSettings);
  const addressLine =
    letterheadSettings.letterhead_show_address ? companyAddressLine(company) : "";
  const contactLine = buildLetterheadContactLine(company, letterheadSettings);
  const tagline = letterheadSettings.letterhead_tagline.trim();

  // Full uploaded letterhead banner (not a logo tile).
  const upperImg = await loadImageFromUrl(company.letterhead_upper_url);
  if (upperImg) {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new ImageRun({
            type: upperImg.type,
            data: upperImg.data,
            transformation: {
              width: twipToPx(width),
              height: 110,
            },
            altText: {
              title: "Letterhead",
              description: "Company letterhead",
              name: "letterhead_upper",
            },
          }),
        ],
      }),
      letterheadBottomRule(color),
    ];
  }

  // Text-only letterhead (no logo) — matches Top Management preview.
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: company.name || "Company",
          bold: true,
          font: DOCX_FONT,
          size: 40,
          color,
        }),
      ],
    }),
  ];
  if (addressLine) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [mutedRun(addressLine, 18)],
      }),
    );
  }
  if (tagline) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [mutedRun(tagline, 18, true)],
      }),
    );
  }
  if (contactLine) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [mutedRun(contactLine, 18)],
      }),
    );
  }
  out.push(letterheadBottomRule(color));
  return out;
}

async function buildLetterheadLower(
  settings: PrintSettings,
  assets: TopManagementPrintAssets | undefined,
): Promise<Paragraph[]> {
  const img = await loadImageFromUrl(assets?.letterhead_lower_url ?? null);
  if (!img) return [];
  const width = contentWidthTwip(settings);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 0 },
      children: [
        new ImageRun({
          type: img.type,
          data: img.data,
          transformation: {
            width: twipToPx(width),
            height: 80,
          },
          altText: {
            title: "Footer letterhead",
            description: "Company footer letterhead",
            name: "letterhead_lower",
          },
        }),
      ],
    }),
  ];
}

function buildAddressHeaderTable(
  data: TopManagementLetterData,
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
                children: [
                  bodyRun("Date: ", true),
                  bodyRun(inspectionDate, true),
                ],
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

function buildTopManagementTableDocx(
  rows: TopManagementStored[],
  tableColumns: TopManagementTableColumnKey[],
  settings: PrintSettings,
): Table {
  const columns = normalizeTopManagementTableColumns(tableColumns);
  const columnDefs = TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );
  const visible = visibleRows(rows);
  const outerWidth = contentWidthTwip(settings);
  const boxPad = 80;
  const innerWidth = Math.max(1200, outerWidth - boxPad * 2);
  const widths = columnDefs.map((col) => {
    const pct = Number.parseFloat(topManagementColumnWidthPct(col.key, columns));
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

  // Outer box matches preview: bordered slate panel around the data table.
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
  data: TopManagementLetterData,
  settings: PrintSettings,
): Promise<(Paragraph | Table)[]> {
  const visible = visibleRows(data.rows);
  const primaryRow = visible[0];
  const applyOnDocuments = primaryRow?.apply_signature_on_documents !== false;
  const primarySignatureUrl =
    applyOnDocuments ? primaryRow?.signature_image_url?.trim() ?? "" : "";
  const sigName = data.signatoryName.trim() || data.contactPerson.trim() || "—";
  const sigDesig = data.signatoryDesignation.trim() || "—";
  const totalWidth = contentWidthTwip(settings);
  const sigWidth = Math.min(3200, Math.round(totalWidth * 0.42));
  const spacerWidth = totalWidth - sigWidth;

  const parsed = await loadImageFromUrl(primarySignatureUrl || null);

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

async function buildTopManagementDocx(
  data: TopManagementLetterData,
  settings: PrintSettings,
  tableColumns: TopManagementTableColumnKey[],
  assets?: TopManagementPrintAssets,
): Promise<Document> {
  const isRef = isStandardRef(data);
  const visible = visibleRows(data.rows);

  const tableSection: (Paragraph | Table)[] =
    visible.length > 0
      ? [
          new Paragraph({ spacing: { before: 120, after: 120 }, children: [] }),
          buildTopManagementTableDocx(data.rows, tableColumns, settings),
          new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
        ]
      : [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 160 },
            children: [
              new TextRun({
                text: "No top management details entered yet.",
                font: DOCX_FONT,
                size: DOCX_BODY_SIZE,
                color: "64748B",
              }),
            ],
          }),
        ];

  const children: (Paragraph | Table)[] = [
    ...(await buildLetterheadBlocks(data, settings, assets)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "Top Management Details",
          bold: true,
          allCaps: true,
          underline: {},
          font: DOCX_FONT,
          size: 30,
        }),
      ],
    }),
    buildAddressHeaderTable(data, settings),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
    bodyParagraph([
      bodyRun("Sub: ", true),
      bodyRun("Details of Top Management for BIS licence application", true),
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
      bodyRun(" hereby furnish the following details of our Top Management"),
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
      "We declare that the information furnished above is true and correct to the best of our knowledge and belief. The persons listed above are responsible for the overall management and compliance of the unit with respect to BIS certification requirements.",
    ),
    ...(await buildSignatureBlock(data, settings)),
    ...(await buildLetterheadLower(settings, assets)),
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
            margin: pageMarginsFromSettings(settings),
          },
        },
        children,
      },
    ],
  });
}

export async function downloadTopManagementWord(
  data: TopManagementLetterData,
  settings: PrintSettings,
  tableColumns: TopManagementTableColumnKey[],
  assets?: TopManagementPrintAssets,
): Promise<void> {
  const doc = await buildTopManagementDocx(data, settings, tableColumns, assets);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadTopManagementExcel(
  data: TopManagementLetterData,
  tableColumns: TopManagementTableColumnKey[],
  _settings?: PrintSettings,
): Promise<void> {
  const columns = normalizeTopManagementTableColumns(tableColumns);
  const columnDefs = TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );
  const visible = visibleRows(data.rows);

  const rows: (string | number)[][] = [];
  rows.push(["Top Management Details"]);
  rows.push([]);
  rows.push(["Company Name", data.companyName]);
  rows.push(["Address", data.address]);
  rows.push(["Indian Standard", data.isNumber]);
  rows.push(["IS Title", data.isTitle]);
  rows.push(["BIS Branch", bisBranchLine(data)]);
  rows.push(["Date", formatInspectionDate(data.inspectionDate)]);
  rows.push(["Application No.", formatApplicationNo(data.applicationNumber)]);
  rows.push([]);
  rows.push(["Top Management Details"]);

  if (visible.length > 0) {
    rows.push(columnDefs.map((c) => c.label));
    for (let i = 0; i < visible.length; i += 1) {
      rows.push(columnDefs.map((c) => cellPlainText(c.key, visible[i]!, i)));
    }
  } else {
    rows.push(["No top management details entered yet."]);
  }

  const colCount = Math.max(2, columnDefs.length);
  const buffer = await buildWorkbookBuffer([
    {
      name: "Top Management",
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
