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
  buildOslSampleCompany,
  type OslSampleOfferLetterData,
} from "@/lib/print/osl-sample-requirements";
import {
  normalizeOslSampleTableColumns,
  OSL_SAMPLE_TABLE_COLUMN_OPTIONS,
  type OslSampleTableColumnKey,
} from "@/lib/print/osl-sample-table-columns";
import {
  sampleOfferLetterLabels,
  type SampleOfferLetterVariant,
} from "@/lib/print/sample-offer-letter-variant";
import type { OslSampleRequirementStored } from "@/lib/osl-sample-requirements";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
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

function plainParagraph(text: string, bold = false, center = false): Paragraph {
  return bodyParagraph(
    [bodyRun(text, bold)],
    center ? AlignmentType.CENTER : AlignmentType.LEFT,
  );
}

function buildLetterheadParagraphs(
  data: OslSampleOfferLetterData,
  settings: PrintSettings,
): Paragraph[] {
  if (!settings.show_letterhead) return [];

  const company = buildOslSampleCompany(data);
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

function buildSampleTableDocx(
  rows: OslSampleRequirementStored[],
  tableColumns: OslSampleTableColumnKey[],
): Table {
  const columns = normalizeOslSampleTableColumns(tableColumns);
  const columnDefs = OSL_SAMPLE_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );
  const visible = visibleSampleRows(rows);

  const header = new TableRow({
    tableHeader: true,
    children: columnDefs.map(
      (col) =>
        new TableCell({
          children: [plainParagraph(col.label, true, Boolean(col.cellCenter))],
        }),
    ),
  });

  const bodyRows = visible.map((row, i) =>
    new TableRow({
      children: columnDefs.map(
        (col) =>
          new TableCell({
            children: [
              plainParagraph(cellPlainText(col.key, row, i), false, Boolean(col.cellCenter)),
            ],
          }),
      ),
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...bodyRows],
  });
}

async function buildOslSampleDocx(
  data: OslSampleOfferLetterData,
  settings: PrintSettings,
  tableColumns: OslSampleTableColumnKey[],
  variant: SampleOfferLetterVariant,
): Promise<Document> {
  const labels = sampleOfferLetterLabels(variant);
  const isRef = isStandardRef(data);
  const bisBranch = bisBranchLine(data);
  const inspectionDate = formatInspectionDate(data.inspectionDate);
  const applicationNo = formatApplicationNo(data.applicationNumber);
  const sigName = data.signatoryName.trim() || data.contactPerson.trim() || "—";
  const sigDesig = data.signatoryDesignation.trim() || "—";
  const visible = visibleSampleRows(data.rows);

  const sampleSectionLabel =
    variant === "pi" ? "SAMPLE DETAILS FOR PI" : "SAMPLE DETAILS FOR OSL";

  const sampleSection: (Paragraph | Table)[] =
    visible.length > 0
      ? [
          plainParagraph(sampleSectionLabel, true),
          buildSampleTableDocx(data.rows, tableColumns),
        ]
      : [plainParagraph("No sample details entered yet.")];

  const children: (Paragraph | Table)[] = [
    ...buildLetterheadParagraphs(data, settings),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: labels.documentHeading.toUpperCase(),
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
      bodyRun(
        "Submission of samples for testing at Outside Testing Laboratory (OSL)",
        true,
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
            bodyRun(" having our factory at "),
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
    ...sampleSection,
    plainParagraph(
      "We declare that the above samples have been prepared prior to grant of the BIS licence, are drawn from trial production, and are being manufactured for the purpose of obtaining BIS licence. The information furnished above is true and correct to the best of our knowledge and belief.",
    ),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 0 },
      children: [bodyRun(`For ${data.companyName}`, true)],
    }),
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

/** Modern Office Open XML Word document (.docx) for OSL / PI sample offer letter. */
export async function downloadOslSampleRequirementsWord(
  data: OslSampleOfferLetterData,
  settings: PrintSettings,
  tableColumns: OslSampleTableColumnKey[],
  variant: SampleOfferLetterVariant = "osl",
): Promise<void> {
  const doc = await buildOslSampleDocx(data, settings, tableColumns, variant);
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
