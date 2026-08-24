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
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import { formatCmpf310RupeeDisplay } from "@backend/modules/bis/cmpf-310";
import type { Cmpf310LetterData } from "@backend/modules/print/cmpf-310";
import { formatCmpf305ApplicantAddress } from "@backend/modules/print/cmpf-305";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: Cmpf310LetterData): string {
  return safeFilePart(`CMPF310_${data.companyName || "Marking_Fee"}`);
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

async function buildCmpf310Docx(data: Cmpf310LetterData): Promise<Document> {
  const doc = data.document;
  const sigName = doc.signatory_name || data.contactPerson || "—";
  const sigDesig = doc.signatory_designation || "—";

  const rateTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ["Unit", "Firm Scale", "Unit Rate in Rs", "Marking Fee in Rs"].map(
          (label) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [bodyRun(label, true)],
                }),
              ],
            }),
        ),
      }),
      new TableRow({
        children: [
          doc.unit || "—",
          doc.firm_scale || "—",
          formatCmpf310RupeeDisplay(doc.unit_rate_rs),
          formatCmpf310RupeeDisplay(doc.marking_fee_rs),
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
    ],
  });

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [bodyRun("CMPF - 310", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Acceptance of Rate of Marking Fee", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [bodyRun("Page 01 of 01", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [bodyRun(`Date: ${formatMetaDate(data.dateOfApplication)}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 120 },
      children: [bodyRun(`Application No.: ${formatApplicationNo(data.applicationNumber)}`)],
    }),
    plainParagraph(
      `Reference Letter No.: ${doc.reference_letter_no || "—"}  Dated: ${formatMetaDate(doc.reference_letter_date)}`,
    ),
    plainParagraph("1. Rate of Marking Fee"),
    rateTable,
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

export async function downloadCmpf310Word(
  data: Cmpf310LetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildCmpf310Docx(data);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadCmpf310Excel(data: Cmpf310LetterData): Promise<void> {
  const doc = data.document;
  const addressLine = formatCmpf305ApplicantAddress(data.address);
  const rows: (string | number)[][] = [
    ["Acceptance of Rate of Marking Fee (CMPF - 310)"],
    [],
    ["Applicant Name", data.companyName],
    ["Applicant Address", addressLine],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["IS Code", data.isNumber || "—"],
    ["Reference Letter No.", doc.reference_letter_no || "—"],
    ["Reference Letter Date", formatMetaDate(doc.reference_letter_date)],
    [],
    ["1. Rate of Marking Fee"],
    ["Unit", "Firm Scale", "Unit Rate in Rs", "Marking Fee in Rs"],
    [
      doc.unit || "—",
      doc.firm_scale || "—",
      formatCmpf310RupeeDisplay(doc.unit_rate_rs),
      formatCmpf310RupeeDisplay(doc.marking_fee_rs),
    ],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "CMPF 310",
      rows,
      cols: [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 20 }],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}
