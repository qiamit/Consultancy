import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { buildWorkbookBuffer } from "@/lib/spreadsheet/excel";
import {
  buildTopManagementCompany,
  type TopManagementLetterData,
} from "@/lib/print/top-management";
import {
  normalizeTopManagementTableColumns,
  TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS,
  type TopManagementTableColumnKey,
} from "@/lib/print/top-management-table-columns";
import type { TopManagementStored } from "@/lib/top-management";
import { rowHasContent } from "@/lib/top-management";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 24;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function formatInspectionDate(dateStr: string): string {
  const raw = (dateStr ?? "").trim();
  if (!raw) return "N/A";
  return formatDisplayDate(raw, "N/A");
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

function plainParagraph(text: string, bold = false): Paragraph {
  return bodyParagraph([bodyRun(text, bold)]);
}

function centerParagraph(text: string, bold = false): Paragraph {
  return bodyParagraph([bodyRun(text, bold)], AlignmentType.CENTER);
}

function buildLetterheadParagraphs(
  data: TopManagementLetterData,
  settings: PrintSettings,
): Paragraph[] {
  if (!settings.show_letterhead) return [];

  const company = buildTopManagementCompany(data);
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: company.name,
          bold: true,
          font: DOCX_FONT,
          size: 32,
          color: settings.primary_color.replace("#", ""),
        }),
      ],
    }),
  ];

  if (settings.letterhead_show_address && company.address.trim()) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [bodyRun(company.address)],
      }),
    );
  } else {
    out.push(new Paragraph({ spacing: { after: 240 }, children: [] }));
  }

  return out;
}

function buildTopManagementTableDocx(
  rows: TopManagementStored[],
  tableColumns: TopManagementTableColumnKey[],
): Table {
  const columns = normalizeTopManagementTableColumns(tableColumns);
  const columnDefs = TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );
  const visible = visibleRows(rows);

  const header = new TableRow({
    tableHeader: true,
    children: columnDefs.map(
      (col) =>
        new TableCell({
          children: [centerParagraph(col.label, true)],
        }),
    ),
  });

  const bodyRows = visible.map((row, i) =>
    new TableRow({
      children: columnDefs.map(
        (col) =>
          new TableCell({
            children: [centerParagraph(cellPlainText(col.key, row, i))],
          }),
      ),
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...bodyRows],
  });
}

async function buildTopManagementDocx(
  data: TopManagementLetterData,
  settings: PrintSettings,
  tableColumns: TopManagementTableColumnKey[],
): Promise<Document> {
  const isRef = isStandardRef(data);
  const bisBranch = bisBranchLine(data);
  const inspectionDate = formatInspectionDate(data.inspectionDate);
  const applicationNo = formatApplicationNo(data.applicationNumber);
  const sigName = data.signatoryName.trim() || data.contactPerson.trim() || "—";
  const sigDesig = data.signatoryDesignation.trim() || "—";
  const visible = visibleRows(data.rows);
  const primaryRow = visible[0];
  const applyOnDocuments = primaryRow?.apply_signature_on_documents !== false;
  const primarySignatureUrl =
    applyOnDocuments ? primaryRow?.signature_image_url?.trim() ?? "" : "";

  const tableSection: (Paragraph | Table)[] =
    visible.length > 0
      ? [
          plainParagraph("TOP MANAGEMENT DETAILS", true),
          buildTopManagementTableDocx(data.rows, tableColumns),
        ]
      : [plainParagraph("No top management details entered yet.")];

  const children: (Paragraph | Table)[] = [
    ...buildLetterheadParagraphs(data, settings),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: "TOP MANAGEMENT DETAILS",
          bold: true,
          underline: {},
          font: DOCX_FONT,
          size: 30,
        }),
      ],
    }),
    bodyParagraph([
      bodyRun("To\nThe Director & Head\nBureau of Indian Standards\n"),
      bodyRun(bisBranch, true),
      bodyRun("\t\t\t\tDate: "),
      bodyRun(inspectionDate, true),
      bodyRun("\n\t\t\t\tApplication No.: "),
      bodyRun(applicationNo, true),
    ]),
    bodyParagraph([
      bodyRun("Sub: "),
      bodyRun("Details of Top Management for BIS licence application", true),
      ...(isRef
        ? [bodyRun(" under Indian Standard "), bodyRun(isRef, true), bodyRun(".")]
        : [bodyRun(".")]),
    ]),
    bodyParagraph([
      bodyRun("We, "),
      bodyRun(`M/s. ${data.companyName}`, true),
      ...(data.address.trim()
        ? [bodyRun(" having our factory at "), bodyRun(data.address, true), bodyRun(",")]
        : []),
      bodyRun(" hereby furnish the following details of our Top Management"),
      ...(isRef
        ? [bodyRun(" in connection with BIS certification under "), bodyRun(isRef, true)]
        : [bodyRun(" in connection with BIS certification")]),
      bodyRun(". The particulars are as under:"),
    ]),
    ...tableSection,
    plainParagraph(
      "We declare that the information furnished above is true and correct to the best of our knowledge and belief. The persons listed above are responsible for the overall management and compliance of the unit with respect to BIS certification requirements.",
    ),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 0 },
      children: [bodyRun(`For ${data.companyName}`, true)],
    }),
    ...(primarySignatureUrl
      ? [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 120, after: 0 },
            children: [bodyRun("[Signature image]")],
          }),
        ]
      : []),
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

export async function downloadTopManagementWord(
  data: TopManagementLetterData,
  settings: PrintSettings,
  tableColumns: TopManagementTableColumnKey[],
): Promise<void> {
  const doc = await buildTopManagementDocx(data, settings, tableColumns);
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
