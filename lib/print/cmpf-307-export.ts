import {
  AlignmentType,
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
import { brandRowHasContent, type Cmpf307BrandStored } from "@/lib/cmpf-307";
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

  const visible = rows.filter(brandRowHasContent);
  const dataRows =
    visible.length > 0
      ? visible.map((row, i) =>
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
        )
      : [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 5,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [bodyRun("No brand names entered yet.")],
                  }),
                ],
              }),
            ],
          }),
        ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells }), ...dataRows],
  });
}

async function buildCmpf307Docx(data: Cmpf307LetterData): Promise<Document> {
  const addressParts = [data.address, data.city, data.bisBranchState].filter((p) => p.trim());
  const addressLine = addressParts.length > 0 ? `${addressParts.join(", ")}, INDIA` : "—";

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
    plainParagraph(`Applicant Name: ${data.companyName}`),
    plainParagraph(`Applicant Address: ${addressLine}`),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(`Date of Application: ${formatMetaDate(data.dateOfApplication)}`),
    plainParagraph(`IS Code: ${data.isNumber || "—"}`),
    plainParagraph(`Date of Inspection: ${formatMetaDate(data.dateOfInspection)}`),
    plainParagraph(
      `To\nThe Director & Head\nBureau of Indian Standard\n${data.bisBranchName || "—"}, ${data.bisBranchState || "—"}, INDIA`,
    ),
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
      `Place: ${data.city || "—"}\nDate: ${formatMetaDate(data.dateOfInspection)}\nName: ${data.firmRepName || data.contactPerson || "—"}\nDesignation: ${data.firmRepDesignation || "—"}`,
    ),
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
  const visible = data.document.brands.filter(brandRowHasContent);
  const rows: (string | number)[][] = [
    ["Declaration of Brand Names (CMPF - 307)"],
    [],
    ["Applicant Name", data.companyName],
    ["Applicant Address", data.address],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["Date of Application", formatMetaDate(data.dateOfApplication)],
    ["IS Code", data.isNumber || "—"],
    ["Date of Inspection", formatMetaDate(data.dateOfInspection)],
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
    rows.push(["No brand names entered yet."]);
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
