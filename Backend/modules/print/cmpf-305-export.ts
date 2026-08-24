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
import { rowHasContent, type Cmpf305MachineryStored } from "@backend/modules/bis/cmpf-305";
import type { Cmpf305LetterData } from "@backend/modules/print/cmpf-305";
import { formatCmpf305ApplicantAddress } from "@backend/modules/print/cmpf-305";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: Cmpf305LetterData): string {
  return safeFilePart(`CMPF305_${data.companyName || "Machinery"}`);
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

function rightAlignedParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 120 },
    children: [bodyRun(text)],
  });
}

function visibleRows(rows: Cmpf305MachineryStored[]): Cmpf305MachineryStored[] {
  return rows.filter(rowHasContent);
}

function machineryTableSection(rows: Cmpf305MachineryStored[]): (Paragraph | Table)[] {
  const visible = visibleRows(rows);
  if (visible.length === 0) {
    return [plainParagraph("No plant & machinery details entered yet.")];
  }

  const headerCells = [
    "Sr No.",
    "Machinery Name",
    "Make",
    "Production Capacity / Day",
    "Number",
    "Remarks",
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
        row.machinery_name.trim() || "—",
        row.make.trim() || "—",
        row.production_capacity_per_day.trim() || "—",
        row.number.trim() || "—",
        row.remarks.trim() || "—",
      ].map((text, colIndex) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: colIndex === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
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

async function buildCmpf305Docx(data: Cmpf305LetterData): Promise<Document> {
  const addressLine = formatCmpf305ApplicantAddress(data.address);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [bodyRun("Form - I", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Declaration Regarding Manufacturing Machinery", true)],
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
    ...machineryTableSection(data.rows),
    plainParagraph(
      "Note: Attach Extra Sheet, If Required",
    ),
    plainParagraph(
      "I hereby declare that the machinery of which details are given overleaf is owned by me and are actually installed in the premises.*",
    ),
    plainParagraph(
      "I also declare that in case of grant of licence, I will send prior intimation to BIS whenever any machinery is takenout of the premises of the firm due to any reason.",
    ),
    plainParagraph(
      `Sig. of Firm's Representative\nName: ${data.firmRepName || data.contactPerson || "—"}\nDesignation: ${data.firmRepDesignation || "—"}\nDate: ${formatMetaDate(data.dateOfInspection)}`,
    ),
    rightAlignedParagraph(
      "I have checked and found that Machinery of which details are given overleaf was available during my Inspection",
    ),
    rightAlignedParagraph(
      `Sig. of BIS Certification Officer\nName: ${data.inspectionOfficerName || "----"}\nDesignation: ${data.inspectionOfficerDesignation || "----"}\nDate: ${formatMetaDate(data.dateOfInspection)}`,
    ),
    plainParagraph(
      "* If Any Part of the Manufacturing Activity is Out Sourced, Details of Machinery used for Out Sourced Activity shall be Indicated in a Separate form Along with Complete Address of the Out Sourced Premises",
    ),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadCmpf305Word(
  data: Cmpf305LetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildCmpf305Docx(data);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadCmpf305Excel(data: Cmpf305LetterData): Promise<void> {
  const visible = visibleRows(data.rows);
  const rows: (string | number)[][] = [
    ["Declaration Regarding Manufacturing Machinery (Form - I / CMPF 305)"],
    [],
    ["Applicant Name", data.companyName],
    ["Applicant Address", formatCmpf305ApplicantAddress(data.address)],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["Date of Application", formatMetaDate(data.dateOfApplication)],
    ["IS Code", data.isNumber || "—"],
    ["Date of Inspection", formatMetaDate(data.dateOfInspection)],
    [],
    ["Sr No.", "Machinery Name", "Make", "Production Capacity / Day", "Number", "Remarks"],
  ];

  if (visible.length === 0) {
    rows.push(["No plant & machinery details entered yet."]);
  } else {
    visible.forEach((row, i) => {
      rows.push([
        i + 1,
        row.machinery_name,
        row.make,
        row.production_capacity_per_day,
        row.number,
        row.remarks,
      ]);
    });
  }

  const buffer = await buildWorkbookBuffer([
    {
      name: "CMPF 305",
      rows,
      cols: [
        { wch: 8 },
        { wch: 28 },
        { wch: 16 },
        { wch: 24 },
        { wch: 10 },
        { wch: 20 },
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

export async function downloadCmpf305ImportTemplate(): Promise<void> {
  const rows: (string | number)[][] = [
    ["Machinery Name", "Make", "Production Capacity / Day", "Number", "Remarks"],
    ["Example Mixer", "ABC Make", "100 MT", "2 Nos", "Working condition"],
    ["Weighing Scale", "FIE", "—", "1 Nos", ""],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Plant Machinery",
      rows,
      cols: [
        { wch: 32 },
        { wch: 14 },
        { wch: 24 },
        { wch: 10 },
        { wch: 20 },
      ],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "CMPF305_Import_Template.xlsx",
  );
}
