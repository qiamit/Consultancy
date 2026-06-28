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
import {
  CMPF306_SEPARATE_SHEET_LABEL,
  equipmentRowHasContent,
  type Cmpf306EquipmentStored,
} from "@/lib/cmpf-306";
import type { Cmpf306LetterData } from "@/lib/print/cmpf-306";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: Cmpf306LetterData): string {
  return safeFilePart(`CMPF306_${data.companyName || "Testing_Equipments"}`);
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

function equipmentTableSection(rows: Cmpf306EquipmentStored[]): Table {
  const headerCells = [
    "Sr No.",
    "Test Equipments / Chemicals",
    "Make",
    "Least Count",
    "Range",
    "Calibration Status",
    "Clause No.",
    "Quantity",
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

  const visible = rows.filter(equipmentRowHasContent);
  const dataRows =
    visible.length > 0
      ? visible.map((row, i) =>
          new TableRow({
            children: [
              String(i + 1),
              row.equipment_name.trim() || "—",
              row.make.trim() || "—",
              row.least_count.trim() || "—",
              row.range.trim() || "—",
              row.calibration_details.trim() || "—",
              row.clause_number.trim() || "—",
              row.quantity.trim() || "—",
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
        )
      : [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 8,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [bodyRun("No testing equipment entered yet.")],
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

async function buildCmpf306Docx(data: Cmpf306LetterData): Promise<Document> {
  const addressParts = [data.address, data.city, data.bisBranchState].filter((p) => p.trim());
  const addressLine = addressParts.length > 0 ? `${addressParts.join(", ")}, INDIA` : "—";

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [bodyRun("Form - II", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Declaration Regarding Testing Equipments", true)],
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
  ];

  if (data.document.separate_sheet_enclosed) {
    children.push(plainParagraph(CMPF306_SEPARATE_SHEET_LABEL));
  }

  children.push(equipmentTableSection(data.document.equipment));
  children.push(
    plainParagraph("Note: Attach Extra Sheet, If Required"),
    plainParagraph(
      "I hereby declare that the Equipments of which details are given overleaf is owned by me and are actually installed in the premises.*",
    ),
    plainParagraph(
      `Sig. of Firm's Representative\nName: ${data.firmRepName || data.contactPerson || "—"}\nDesignation: ${data.firmRepDesignation || "—"}`,
    ),
    plainParagraph(
      `Sig. of BIS Certification Officer\nName: ${data.inspectionOfficerName || "----"}\nDesignation: ${data.inspectionOfficerDesignation || "----"}`,
    ),
  );

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadCmpf306Word(
  data: Cmpf306LetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildCmpf306Docx(data);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadCmpf306Excel(data: Cmpf306LetterData): Promise<void> {
  const visible = data.document.equipment.filter(equipmentRowHasContent);
  const rows: (string | number)[][] = [
    ["Declaration Regarding Testing Equipments (Form - II / CMPF 306)"],
    [],
    ["Applicant Name", data.companyName],
    ["Applicant Address", data.address],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["Date of Application", formatMetaDate(data.dateOfApplication)],
    ["IS Code", data.isNumber || "—"],
    ["Date of Inspection", formatMetaDate(data.dateOfInspection)],
    [],
    [
      "Sr No.",
      "Test Equipments / Chemicals",
      "Make",
      "Least Count",
      "Range",
      "Calibration Status",
      "Clause No.",
      "Quantity",
    ],
  ];

  if (data.document.separate_sheet_enclosed) {
    rows.push(["", CMPF306_SEPARATE_SHEET_LABEL]);
  }

  if (visible.length === 0) {
    rows.push(["No testing equipment entered yet."]);
  } else {
    visible.forEach((row, i) => {
      rows.push([
        i + 1,
        row.equipment_name,
        row.make,
        row.least_count,
        row.range,
        row.calibration_details,
        row.clause_number,
        row.quantity,
      ]);
    });
  }

  const buffer = await buildWorkbookBuffer([
    {
      name: "CMPF 306",
      rows,
      cols: [
        { wch: 8 },
        { wch: 32 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
      ],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}

export async function downloadCmpf306ImportTemplate(): Promise<void> {
  const rows: (string | number)[][] = [
    [
      "Test Equipment Name",
      "Make",
      "Least Count",
      "Range",
      "Calibration",
      "Clause No.",
      "Quantity",
    ],
    [
      "Universal Testing Machine with Bending Attachment",
      "ABC Make",
      "0.01 kN",
      "0–100 kN",
      "Yes",
      "9.3",
      "1 Nos",
    ],
    [
      "Vernier Caliper",
      "Mitutoyo",
      "0.01 mm",
      "0–150 mm",
      "Yes",
      "9.3",
      "1 Nos",
    ],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Test Equipment",
      rows,
      cols: [
        { wch: 36 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
      ],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "CMPF306_Import_Template.xlsx",
  );
}
