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
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import { rowHasContent, type RawMaterialStored } from "@/lib/raw-material-details";
import type { RawMaterialDetailsLetterData } from "@/lib/print/raw-material-details";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: RawMaterialDetailsLetterData): string {
  return safeFilePart(`RawMaterialDetails_${data.companyName || "Materials"}`);
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

function formatBisBranchLine(branchName: string, state: string, country: string): string {
  const parts = [
    branchName.trim() || "________________",
    state.trim() || "________________",
    country.trim() || "India",
  ];
  return parts.join(", ");
}

function formatIsStandardRef(isNumber: string, isTitle: string): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `${num} — ${title}`;
  if (num) return num;
  if (title) return title;
  return "";
}

function bodyRun(text: string, bold = false): TextRun {
  return new TextRun({ text, font: DOCX_FONT, size: DOCX_BODY_SIZE, bold });
}

function plainParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [bodyRun(text)],
  });
}

function rightAlignedParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 120 },
    children: [bodyRun(text)],
  });
}

function visibleRows(rows: RawMaterialStored[]): RawMaterialStored[] {
  return rows.filter(rowHasContent);
}

function materialTableSection(rows: RawMaterialStored[]): (Paragraph | Table)[] {
  const visible = visibleRows(rows);
  if (visible.length === 0) {
    return [plainParagraph("No raw material details entered yet.")];
  }

  const headerCells = [
    "Sr. No.",
    "Raw Material",
    "Name of Supplier",
    "With OR Without BIS Certification Mark",
    "Test Certificate of The Supplier",
    "How Received Batches / Lots Nature of Packaging",
  ].map(
    (label) =>
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [bodyRun(label, true)],
          }),
        ],
      }),
  );

  const dataRows = visible.map((row, i) =>
    new TableRow({
      children: [
        String(i + 1),
        row.raw_material.trim() || "—",
        row.supplier_name.trim() || "—",
        row.bis_certification_mark.trim() || "—",
        row.test_certificate.trim() || "—",
        row.batches_packaging.trim() || "—",
      ].map((text, colIndex) =>
        new TableCell({
          children: [
            new Paragraph({
              alignment:
                colIndex === 0 || colIndex === 3
                  ? AlignmentType.CENTER
                  : AlignmentType.LEFT,
              children: [bodyRun(text)],
            }),
          ],
        }),
      ),
    }),
  );

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: headerCells }), ...dataRows],
    }),
  ];
}

async function buildRawMaterialDetailsDocx(
  data: RawMaterialDetailsLetterData,
): Promise<Document> {
  const bisBranch = formatBisBranchLine(
    data.bisBranchName,
    data.bisBranchState,
    data.bisBranchCountry,
  );
  const isStdRef = formatIsStandardRef(data.isNumber, data.isTitle ?? "");

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Raw Material Details", true)],
    }),
    rightAlignedParagraph(`Date: ${formatMetaDate(data.dateOfApplication)}`),
    rightAlignedParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(
      `To\nThe Director & Head\nBureau of Indian Standards\n${bisBranch}`,
    ),
    plainParagraph(
      `Sub: Details of Raw Materials used in the manufacture of product(s) covered under BIS licence application${isStdRef ? ` for Indian Standard ${isStdRef}` : ""}.`,
    ),
    plainParagraph(
      `We, M/s. ${data.companyName},${data.address ? ` having our factory at ${data.address},` : ""} hereby furnish the following details of raw materials used in our manufacturing process${isStdRef ? ` in connection with BIS certification under ${isStdRef}` : " in connection with BIS certification"}. The particulars regarding the name of supplier, with or without BIS Certification Mark on raw material, test certificate of the supplier, and how received batches/lots with nature of packaging are as under:`,
    ),
    ...materialTableSection(data.rows),
    plainParagraph(
      "We declare that the information furnished above is true and correct to the best of our knowledge and belief. We undertake to maintain records of raw material receipts, supplier test certificates and batch/lot details, and to inform BIS of any change in raw material source, supplier or specifications.",
    ),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 0 },
      children: [bodyRun(`For ${data.companyName || "—"}`, true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 320, after: 0 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
      },
      children: [bodyRun(`Name: ${data.firmRepName || data.contactPerson || "—"}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Designation: ${data.firmRepDesignation || "—"}`)],
    }),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadRawMaterialDetailsWord(
  data: RawMaterialDetailsLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildRawMaterialDetailsDocx(data);
  const buffer = await Packer.toBlob(doc);
  triggerBlobDownload(buffer, `${exportFilenameBase(data)}.docx`);
}

export async function downloadRawMaterialDetailsExcel(
  data: RawMaterialDetailsLetterData,
): Promise<void> {
  const visible = visibleRows(data.rows);
  const bisBranch = formatBisBranchLine(
    data.bisBranchName,
    data.bisBranchState,
    data.bisBranchCountry,
  );
  const isStdRef = formatIsStandardRef(data.isNumber, data.isTitle ?? "");
  const rows: (string | number)[][] = [
    ["Raw Material Details"],
    [],
    ["Date", formatMetaDate(data.dateOfApplication)],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    [],
    [
      "To",
      `The Director & Head, Bureau of Indian Standards, ${bisBranch}`,
    ],
    [
      "Sub",
      `Details of Raw Materials used in the manufacture of product(s) covered under BIS licence application${isStdRef ? ` for Indian Standard ${isStdRef}` : ""}.`,
    ],
    [
      "Declaration",
      `We, M/s. ${data.companyName || "—"}, hereby furnish details of raw materials used in our manufacturing process. Particulars are as under:`,
    ],
    [],
    [
      "Sr. No.",
      "Raw Material",
      "Name of Supplier",
      "With OR Without BIS Certification Mark",
      "Test Certificate of The Supplier",
      "How Received Batches / Lots Nature of Packaging",
    ],
    ...visible.map((row, i) => [
      i + 1,
      row.raw_material,
      row.supplier_name,
      row.bis_certification_mark,
      row.test_certificate,
      row.batches_packaging,
    ]),
    [],
    [
      "Closing Declaration",
      "We declare that the information furnished above is true and correct to the best of our knowledge and belief.",
    ],
    [],
    ["", "For " + (data.companyName || "—")],
    ["Name", data.firmRepName || data.contactPerson || "—"],
    ["Designation", data.firmRepDesignation || "—"],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Raw Material Details",
      rows,
      cols: [
        { wch: 8 },
        { wch: 24 },
        { wch: 22 },
        { wch: 28 },
        { wch: 26 },
        { wch: 36 },
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

export async function downloadRawMaterialDetailsImportTemplate(): Promise<void> {
  const rows: (string | number)[][] = [
    [
      "Raw Material",
      "Name of Supplier",
      "With OR Without BIS Certification Mark",
      "Test Certificate of The Supplier",
      "How Received Batches / Lots Nature of Packaging",
    ],
    ["Cement OPC 53", "ABC Suppliers Pvt Ltd", "With", "TC-2024-001", "Bags / 50 kg"],
    ["Steel TMT Bars", "XYZ Metals", "Without", "Lab report attached", "Bundles"],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Raw Materials",
      rows,
      cols: [
        { wch: 24 },
        { wch: 22 },
        { wch: 28 },
        { wch: 26 },
        { wch: 36 },
      ],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "RawMaterialDetails_Import_Template.xlsx",
  );
}
