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
import * as XLSX from "xlsx";
import {
  buildManufacturingScopeCompany,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import type { PrintSettings } from "@/lib/print/types";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 24; // half-points → 12pt

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function formatInspectionDate(dateStr: string): string {
  const raw = (dateStr ?? "").trim();
  if (!raw) return "";
  return new Date(raw).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function multilineParagraphs(text: string): Paragraph[] {
  const lines = (text ?? "").split(/\r?\n/);
  if (lines.length === 0 || (lines.length === 1 && !lines[0]?.trim())) {
    return [plainParagraph("—")];
  }
  return lines.map((line) => plainParagraph(line.trim() === "" ? " " : line));
}

function buildLicenseScopeTable(
  rows: { component: string; value: string }[],
): Table {
  const header = new TableRow({
    tableHeader: true,
    children: ["Component", "Value"].map(
      (label) =>
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [bodyRun(label, true)],
            }),
          ],
        }),
    ),
  });

  const bodyRows = rows
    .filter((r) => r.component.trim() || r.value.trim())
    .map(
      (r) =>
        new TableRow({
          children: [r.component, r.value].map(
            (cell) =>
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [plainParagraph(cell || "—")],
              }),
          ),
        }),
    );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...bodyRows],
  });
}

function buildLetterheadParagraphs(
  data: ManufacturingScopeDeclarationData,
  settings: PrintSettings,
): Paragraph[] {
  if (!settings.show_letterhead) return [];

  const company = buildManufacturingScopeCompany(data);
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
        children: [bodyRun(company.address, false)],
      }),
    );
  } else {
    out.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [],
      }),
    );
  }

  return out;
}

async function buildManufacturingScopeDocx(
  data: ManufacturingScopeDeclarationData,
  settings: PrintSettings,
): Promise<Document> {
  const isRef = isStandardRef(data);
  const bisBranch = bisBranchLine(data);
  const inspectionDate = formatInspectionDate(data.inspectionDate);
  const dateLabel = inspectionDate || "_______________________";
  const placeLabel = data.city.trim() || "_______________________";

  const scopeBlocks: (Paragraph | Table)[] = [
    plainParagraph("LICENSE SCOPE", true),
    ...(data.licenseScopeFormat === "table" && data.licenseScopeRows?.length
      ? [buildLicenseScopeTable(data.licenseScopeRows)]
      : multilineParagraphs(data.licenseScope.trim() || "—")),
  ];

  const children: (Paragraph | Table)[] = [
    ...buildLetterheadParagraphs(data, settings),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
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
    bodyParagraph([
      bodyRun("To\nThe Director & Head\nBureau of Indian Standards\n"),
      bodyRun(bisBranch, true),
      bodyRun("\t\t\t\tDate: "),
      bodyRun(dateLabel, true),
    ]),
    bodyParagraph([
      bodyRun("Sub: "),
      bodyRun("Declaration regarding manufacturing scope", true),
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
      bodyRun(" hereby declare that our manufacturing scope for BIS certification"),
      ...(isRef ? [bodyRun(" under "), bodyRun(isRef, true)] : []),
      bodyRun(" is as follows:"),
    ]),
    ...scopeBlocks,
    plainParagraph(
      "We further declare that the above information is true and correct to the best of our knowledge and belief. We undertake to inform BIS of any change in the manufacturing scope covered under the licence.",
    ),
    bodyParagraph([bodyRun(`Place: ${placeLabel}`)]),
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
            children: [bodyRun(`(${data.contactPerson})`, false)],
          }),
        ]
      : []),
  ];

  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
}

/** Modern Office Open XML Word document (.docx). */
export async function downloadManufacturingScopeDeclarationWord(
  data: ManufacturingScopeDeclarationData,
  settings: PrintSettings,
): Promise<void> {
  const doc = await buildManufacturingScopeDocx(data, settings);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

/** Modern Office Open XML Excel workbook (.xlsx). */
export function downloadManufacturingScopeDeclarationExcel(
  data: ManufacturingScopeDeclarationData,
): void {
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

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 56 }];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Manufacturing Scope");

  const buffer = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  }) as ArrayBuffer;

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}
