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
import { rowHasContent, type CertifiedReferenceMaterialStored } from "@/lib/certified-reference-materials";
import type { CertifiedReferenceMaterialsLetterData } from "@/lib/print/certified-reference-materials";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: CertifiedReferenceMaterialsLetterData): string {
  return safeFilePart(`CertifiedReferenceMaterials_${data.companyName || "CRM"}`);
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

function visibleRows(rows: CertifiedReferenceMaterialStored[]): CertifiedReferenceMaterialStored[] {
  return rows.filter(rowHasContent);
}

function materialTableSection(rows: CertifiedReferenceMaterialStored[]): (Paragraph | Table)[] {
  const visible = visibleRows(rows);
  if (visible.length === 0) {
    return [plainParagraph("No certified reference material details entered yet.")];
  }

  const headerCells = [
    "Sr. No.",
    "Certified Reference Material",
    "Name of Supplier / Manufacturer",
    "From Accredited Reference Material Producer (Yes / No)",
    "CRM Certificate / Lot No.",
    "Validity / Expiry Period",
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
        row.crm_name.trim() || "—",
        row.supplier_name.trim() || "—",
        row.accredited_rmp.trim() || "—",
        row.certificate_lot_no.trim() || "—",
        row.validity_period.trim() || "—",
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

async function buildCertifiedReferenceMaterialsDocx(
  data: CertifiedReferenceMaterialsLetterData,
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
      children: [bodyRun("List of Certified Reference Material", true)],
    }),
    rightAlignedParagraph(`Date: ${formatMetaDate(data.dateOfApplication)}`),
    rightAlignedParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(
      `To\nThe Director & Head\nBureau of Indian Standards\n${bisBranch}`,
    ),
    plainParagraph(
      `Sub: List of Certified Reference Materials (CRMs) used in testing / calibration activities in connection with BIS licence application${isStdRef ? ` for Indian Standard ${isStdRef}` : ""}.`,
    ),
    plainParagraph(
      `We, M/s. ${data.companyName},${data.address ? ` having our factory / laboratory at ${data.address},` : ""} hereby furnish the list of Certified Reference Materials (CRMs) used in our in-house testing activities${isStdRef ? ` in connection with BIS certification under ${isStdRef}` : " in connection with BIS certification"}. The particulars regarding CRM name, supplier / manufacturer, accredited RMP, certificate / lot number, and validity / expiry period are as under:`,
    ),
    ...materialTableSection(data.rows),
    plainParagraph(
      "We declare that the information furnished above is true and correct to the best of our knowledge and belief. We undertake to maintain records of CRM procurement, certificates of analysis, traceability and validity, and to inform BIS of any change in CRM source, supplier or specifications.",
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

export async function downloadCertifiedReferenceMaterialsWord(
  data: CertifiedReferenceMaterialsLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildCertifiedReferenceMaterialsDocx(data);
  const buffer = await Packer.toBlob(doc);
  triggerBlobDownload(buffer, `${exportFilenameBase(data)}.docx`);
}

export async function downloadCertifiedReferenceMaterialsExcel(
  data: CertifiedReferenceMaterialsLetterData,
): Promise<void> {
  const visible = visibleRows(data.rows);
  const bisBranch = formatBisBranchLine(
    data.bisBranchName,
    data.bisBranchState,
    data.bisBranchCountry,
  );
  const isStdRef = formatIsStandardRef(data.isNumber, data.isTitle ?? "");
  const rows: (string | number)[][] = [
    ["List of Certified Reference Material"],
    [],
    ["Date", formatMetaDate(data.dateOfApplication)],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    [],
    ["To", `The Director & Head, Bureau of Indian Standards, ${bisBranch}`],
    [
      "Sub",
      `List of Certified Reference Materials (CRMs) used in testing / calibration activities in connection with BIS licence application${isStdRef ? ` for Indian Standard ${isStdRef}` : ""}.`,
    ],
    [
      "Declaration",
      `We, M/s. ${data.companyName || "—"}, hereby furnish the list of CRMs used in our in-house testing activities. Particulars are as under:`,
    ],
    [],
    [
      "Sr. No.",
      "Certified Reference Material",
      "Name of Supplier / Manufacturer",
      "From Accredited Reference Material Producer (Yes / No)",
      "CRM Certificate / Lot No.",
      "Validity / Expiry Period",
    ],
    ...visible.map((row, i) => [
      i + 1,
      row.crm_name,
      row.supplier_name,
      row.accredited_rmp,
      row.certificate_lot_no,
      row.validity_period,
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
      name: "Certified Reference Materials",
      rows,
      cols: [
        { wch: 8 },
        { wch: 28 },
        { wch: 24 },
        { wch: 34 },
        { wch: 24 },
        { wch: 22 },
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

export async function downloadCertifiedReferenceMaterialsImportTemplate(): Promise<void> {
  const rows: (string | number)[][] = [
    [
      "Certified Reference Material",
      "Name of Supplier / Manufacturer",
      "From Accredited Reference Material Producer (Yes / No)",
      "CRM Certificate / Lot No.",
      "Validity / Expiry Period",
    ],
    [
      "Low Alloy Steel CRM",
      "ABC Reference Materials Pvt Ltd",
      "Yes",
      "CRM-2024-001 / Lot 12",
      "31-12-2026",
    ],
    [
      "Cement CRM",
      "XYZ Standards Ltd",
      "No",
      "Cert-7788",
      "30-06-2025",
    ],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "CRM List",
      rows,
      cols: [
        { wch: 28 },
        { wch: 24 },
        { wch: 34 },
        { wch: 24 },
        { wch: 22 },
      ],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "CertifiedReferenceMaterials_Import_Template.xlsx",
  );
}
