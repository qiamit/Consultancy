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
import { brandRowsForPrintTable, type Cmpf307BrandStored } from "@/lib/cmpf-307";
import type { Cmpf307LetterData } from "@/lib/print/cmpf-307";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: Cmpf307LetterData): string {
  return safeFilePart(`CMPF307_${data.companyName || "Brand_Names"}`);
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

function bodyRun(text: string, bold = false): TextRun {
  return new TextRun({ text, font: DOCX_FONT, size: DOCX_BODY_SIZE, bold });
}

function plainParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [bodyRun(text)],
  });
}

function brandTableSection(rows: Cmpf307BrandStored[]): Table {
  const headerCells = [
    "Sr. No.",
    "Brand Names / Trade Mark(s)",
    "Owned By Self OR Others",
    "Registered / Unregistered",
    "Date of Registration / Introduction",
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

  const visible = brandRowsForPrintTable(rows);
  const dataRows = visible.map((row, i) =>
    new TableRow({
      children: [
        String(i + 1),
        row.brand_name.trim() || "—",
        row.owned_by.trim() || "—",
        row.registered_status.trim() || "—",
        row.registration_date.trim() || "—",
      ].map(
        (text) =>
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [bodyRun(text)],
              }),
            ],
          }),
      ),
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells }), ...dataRows],
  });
}

async function buildCmpf307Docx(data: Cmpf307LetterData): Promise<Document> {
  const bisBranch = [data.bisBranchName, data.bisBranchState, data.bisBranchCountry]
    .filter((p) => p.trim())
    .join(", ") || "—";
  const sigName = data.firmRepName || data.contactPerson || "—";
  const sigDesig = data.firmRepDesignation || "—";

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [bodyRun("CMPF - 307", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Declaration of Brand Names Proposed to be Covered Under Certification", true)],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        bodyRun("To\nThe Director & Head\nBureau of Indian Standard\n"),
        bodyRun(bisBranch),
        bodyRun("\t\t\t\tDate: "),
        bodyRun(formatMetaDate(data.dateOfApplication), true),
        bodyRun("\n\t\t\t\tApplication No.: "),
        bodyRun(formatApplicationNo(data.applicationNumber), true),
      ],
    }),
    plainParagraph("4. Brand/Trade Names Being Used:-"),
    brandTableSection(data.document.brands),
    plainParagraph(
      "Note-1:- In case brand name is registered in your name, enclose copies of Registration Certificate/ Document.",
    ),
    plainParagraph(
      "Note-2:- In case brand name is not registered in your name, enclose copies of Agreement authorizing use of this/these brand name(s).",
    ),
    plainParagraph(
      `5. Brand/Trade Names which will not carry BIS Certification Mark. Give reasons.\n${data.document.brands_without_mark_reasons || "—"}`,
    ),
    plainParagraph(
      "6. I/We understand that in the event of a dispute with any other party over the use of the above Brand Names/ Trade Marks, the responsibility is entirely ours and BIS would not be involved in such disputes.",
    ),
    plainParagraph(
      "7. I/We also understand that in the event of any change, I/We will submit a revised declaration in the prescribed proforma before introducing the change in brand use including deletion or addition.",
    ),
    plainParagraph(
      "8. I/We also understand to maintain production and dispatch records of the product covered under the licence under each brand separately.",
    ),
    plainParagraph(
      "9. I/We also understand that, as far as possible, the entire production under the above brands and which conforms to the specification shall be marked with the Standard Mark.",
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

export async function downloadCmpf307Word(
  data: Cmpf307LetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildCmpf307Docx(data);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadCmpf307Excel(data: Cmpf307LetterData): Promise<void> {
  const visible = brandRowsForPrintTable(data.document.brands);
  const rows: (string | number)[][] = [
    ["Declaration of Brand Names (CMPF - 307)"],
    [],
    ["Date", formatMetaDate(data.dateOfApplication)],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    [],
    ["4. Brand/Trade Names Being Used"],
    [
      "Sr. No.",
      "Brand Names / Trade Mark(s)",
      "Owned By",
      "Registered / Unregistered",
      "Date of Registration / Introduction",
    ],
  ];

  if (visible.length === 0) {
    // Header only — no placeholder data rows
  } else {
    visible.forEach((row, i) => {
      rows.push([
        i + 1,
        row.brand_name,
        row.owned_by,
        row.registered_status,
        row.registration_date,
      ]);
    });
  }

  rows.push([]);
  rows.push([
    "5. Brands without BIS Mark (reasons)",
    data.document.brands_without_mark_reasons || "—",
  ]);

  const buffer = await buildWorkbookBuffer([
    {
      name: "CMPF 307",
      rows,
      cols: [{ wch: 8 }, { wch: 36 }, { wch: 16 }, { wch: 20 }, { wch: 22 }],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}
