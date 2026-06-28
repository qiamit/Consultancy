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
  buildTechnicalStaffCompany,
  type TechnicalStaffLetterData,
} from "@/lib/print/technical-staff";
import {
  DEFAULT_TECHNICAL_STAFF_TABLE_COLUMNS,
  TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS,
  type TechnicalStaffTableColumnKey,
} from "@/lib/print/technical-staff-table-columns";
import type { TechnicalStaffStored } from "@/lib/technical-staff";
import { rowHasContent } from "@/lib/technical-staff";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

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
  data: TechnicalStaffLetterData,
  settings: PrintSettings,
): Paragraph[] {
  if (!settings.show_letterhead) return [];

  const company = buildTechnicalStaffCompany(data);
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

function buildTechnicalStaffTableDocx(rows: TechnicalStaffStored[]): Table {
  const columns = DEFAULT_TECHNICAL_STAFF_TABLE_COLUMNS;
  const columnDefs = TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS.filter((col) =>
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

  const bodyRows = visible.map(
    (row, i) =>
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

async function buildTechnicalStaffDocx(
  data: TechnicalStaffLetterData,
  settings: PrintSettings,
): Promise<Document> {
  const isRef = isStandardRef(data);
  const bisBranch = bisBranchLine(data);
  const inspectionDate = formatInspectionDate(data.inspectionDate);
  const placeLabel = data.city.trim() || "_______________________";
  const visible = visibleRows(data.rows);

  const tableSection: (Paragraph | Table)[] =
    visible.length > 0
      ? [
          plainParagraph("TECHNICAL STAFF DETAILS", true),
          buildTechnicalStaffTableDocx(data.rows),
        ]
      : [plainParagraph("No technical staff details entered yet.")];

  const children: (Paragraph | Table)[] = [
    ...buildLetterheadParagraphs(data, settings),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: "TECHNICAL STAFF DETAILS",
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
    ]),
    bodyParagraph([
      bodyRun("Sub: "),
      bodyRun("Details of Technical Staff for BIS licence application", true),
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
      bodyRun(" hereby furnish the following details of our Technical Staff"),
      ...(isRef
        ? [bodyRun(" in connection with BIS certification under "), bodyRun(isRef, true)]
        : [bodyRun(" in connection with BIS certification")]),
      bodyRun(". The particulars are as under:"),
    ]),
    ...tableSection,
    plainParagraph(
      "We declare that the information furnished above is true and correct to the best of our knowledge and belief. The persons listed above are responsible for technical operations and compliance of the unit with respect to BIS certification requirements.",
    ),
    bodyParagraph([bodyRun(`Place: ${placeLabel}`)]),
    bodyParagraph([bodyRun(`Date: ${inspectionDate}`)]),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 480, after: 120 },
      children: [bodyRun(`For ${data.companyName}`, true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 720, after: 80 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
      },
      children: [bodyRun("Authorised Signatory")],
    }),
    ...(data.contactPerson.trim()
      ? [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [bodyRun(`(${data.contactPerson})`)],
          }),
        ]
      : []),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadTechnicalStaffWord(
  data: TechnicalStaffLetterData,
  settings: PrintSettings,
): Promise<void> {
  const doc = await buildTechnicalStaffDocx(data, settings);
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
